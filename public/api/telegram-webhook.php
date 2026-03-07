<?php

declare(strict_types=1);

require_once __DIR__ . "/_common.php";

// Log webhook requests for debugging
function log_webhook(string $message, array $data = []): void
{
    $logFile = storage_path("webhook.log");
    $timestamp = date("Y-m-d H:i:s");
    $logEntry = "[{$timestamp}] {$message}" . (empty($data) ? "" : " " . json_encode($data, JSON_UNESCAPED_UNICODE)) . "\n";
    @file_put_contents($logFile, $logEntry, FILE_APPEND);
}

$config = read_json_file("bot-config.json", []);
$token = trim((string)($config["botToken"] ?? ""));
if ($token === "") {
    log_webhook("ERROR: Bot token is not configured");
    json_response(["ok" => false, "error" => "Bot token is not configured"], 400);
}

$rawInput = file_get_contents("php://input");
$payload = json_decode($rawInput, true);

log_webhook("Webhook received", ["payload_keys" => is_array($payload) ? array_keys($payload) : "invalid"]);

if (!is_array($payload)) {
    log_webhook("WARNING: Invalid payload", ["raw" => substr($rawInput, 0, 200)]);
    json_response(["ok" => true, "status" => "ignored"]);
}

$message = $payload["message"] ?? null;
if (!is_array($message)) {
    log_webhook("No message in payload", ["update_id" => $payload["update_id"] ?? null]);
    json_response(["ok" => true, "status" => "ignored"]);
}

$chatId = (string)($message["chat"]["id"] ?? "");
$text = trim((string)($message["text"] ?? ""));
$from = $message["from"] ?? [];

if ($chatId === "") {
    json_response(["ok" => true, "status" => "ignored"]);
}

// register/update bot user
// CRITICAL: Never delete users automatically - preserve all history
$users = read_json_file("bot-users.json", []);

// Ensure users is always an array (prevent data loss)
if (!is_array($users)) {
    $users = [];
}

$matchedIndex = -1;
foreach ($users as $i => $user) {
    if ((string)($user["chat_id"] ?? "") === $chatId) {
        $matchedIndex = $i;
        break;
    }
}

if ($matchedIndex === -1) {
    $users[] = [
        "chat_id" => $chatId,
        "user_id" => (string)($from["id"] ?? ""),
        "username" => (string)($from["username"] ?? ""),
        "first_name" => (string)($from["first_name"] ?? ""),
        "last_name" => (string)($from["last_name"] ?? ""),
        "is_admin" => false,
        "created_at" => date(DATE_ATOM),
        "updated_at" => date(DATE_ATOM),
        "last_seen_at" => date(DATE_ATOM),
    ];
    $matchedIndex = count($users) - 1;
} else {
    $users[$matchedIndex]["username"] = (string)($from["username"] ?? "");
    $users[$matchedIndex]["first_name"] = (string)($from["first_name"] ?? "");
    $users[$matchedIndex]["last_name"] = (string)($from["last_name"] ?? "");
    $users[$matchedIndex]["updated_at"] = date(DATE_ATOM);
    $users[$matchedIndex]["last_seen_at"] = date(DATE_ATOM);
}
write_json_file("bot-users.json", $users);

$isAdmin = (bool)($users[$matchedIndex]["is_admin"] ?? false);

if ($text === "/start") {
    log_webhook("Processing /start command", ["chat_id" => $chatId]);
    
    $welcomeText = trim((string)($config["welcomeMessage"] ?? ""));
    if ($welcomeText === "") {
        $welcomeText = "Добро пожаловать!";
    }

    $buttonText = trim((string)($config["startButtonText"] ?? "Открыть приложение"));
    $miniAppUrl = trim((string)($config["miniAppUrl"] ?? "/"));
    if (strpos($miniAppUrl, "/") === 0) {
        $miniAppUrl = (isset($_SERVER["HTTPS"]) ? "https://" : "http://") . $_SERVER["HTTP_HOST"] . $miniAppUrl;
    }

    $result = telegram_api_request($token, "sendMessage", [
        "chat_id" => $chatId,
        "text" => $welcomeText,
        "reply_markup" => [
            "inline_keyboard" => [[
                [
                    "text" => $buttonText,
                    "web_app" => ["url" => $miniAppUrl],
                ],
            ]],
        ],
    ]);
    
    log_webhook("Start message sent", ["result" => $result["ok"] ?? false, "error" => $result["error"] ?? null]);
    json_response(["ok" => true, "status" => "start_sent"]);
}

if ($text === "/pars") {
    if (!$isAdmin) {
        telegram_api_request($token, "sendMessage", [
            "chat_id" => $chatId,
            "text" => "У вас нет прав для команды /pars. Вы не администратор бота.",
        ]);
        json_response(["ok" => true, "status" => "forbidden"]);
    }

    telegram_api_request($token, "sendMessage", [
        "chat_id" => $chatId,
        "text" => "Запускаю обновление каталога. Подождите...",
    ]);

    $report = run_catalog_parser();
    if (!($report["ok"] ?? false)) {
        telegram_api_request($token, "sendMessage", [
            "chat_id" => $chatId,
            "text" => "Ошибка обновления каталога: " . (string)($report["error"] ?? "unknown"),
        ]);
        json_response(["ok" => true, "status" => "parser_failed"]);
    }

    $summary = $report["summary"] ?? [];
    $messageText = "Обновление каталога завершено\n"
      . "Всего: " . (int)($summary["total"] ?? 0) . "\n"
      . "Добавлено: " . (int)($summary["added"] ?? 0) . "\n"
      . "Обновлено: " . (int)($summary["updated"] ?? 0) . "\n"
      . "Удалено: " . (int)($summary["removed"] ?? 0);

    telegram_api_request($token, "sendMessage", [
        "chat_id" => $chatId,
        "text" => $messageText,
    ]);

    json_response(["ok" => true, "status" => "parser_done"]);
}

// Handle unknown commands
if (strpos($text, "/") === 0) {
    log_webhook("Unknown command", ["command" => $text, "chat_id" => $chatId]);
    $result = telegram_api_request($token, "sendMessage", [
        "chat_id" => $chatId,
        "text" => "Неизвестная команда. Используйте /start для открытия приложения.",
    ]);
    log_webhook("Unknown command response sent", ["result" => $result["ok"] ?? false]);
    json_response(["ok" => true, "status" => "unknown_command"]);
}

// Handle regular messages (not commands)
if ($text !== "") {
    log_webhook("Regular message received", ["text" => substr($text, 0, 50), "chat_id" => $chatId]);
    $helpText = "Привет! 👋\n\n"
        . "Я бот DA Motors. Используйте команду /start, чтобы открыть приложение и посмотреть каталог автомобилей.\n\n"
        . "Доступные команды:\n"
        . "/start - Открыть приложение\n"
        . "/pars - Обновить каталог (только для администраторов)";
    
    $result = telegram_api_request($token, "sendMessage", [
        "chat_id" => $chatId,
        "text" => $helpText,
    ]);
    log_webhook("Help message sent", ["result" => $result["ok"] ?? false, "error" => $result["error"] ?? null]);
    json_response(["ok" => true, "status" => "message_answered"]);
}

json_response(["ok" => true, "status" => "ignored"]);

