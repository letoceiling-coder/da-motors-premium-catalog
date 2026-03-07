<?php

declare(strict_types=1);

require_once __DIR__ . "/_common.php";

$config = read_json_file("bot-config.json", []);
$token = trim((string)($config["botToken"] ?? ""));
if ($token === "") {
    json_response(["ok" => false, "error" => "Bot token is not configured"], 400);
}

$payload = json_decode(file_get_contents("php://input"), true);
if (!is_array($payload)) {
    json_response(["ok" => true, "status" => "ignored"]);
}

$message = $payload["message"] ?? null;
if (!is_array($message)) {
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
    $welcomeText = trim((string)($config["welcomeMessage"] ?? ""));
    if ($welcomeText === "") {
        $welcomeText = "Добро пожаловать!";
    }

    $buttonText = trim((string)($config["startButtonText"] ?? "Открыть приложение"));
    $miniAppUrl = trim((string)($config["miniAppUrl"] ?? "/"));
    if (strpos($miniAppUrl, "/") === 0) {
        $miniAppUrl = (isset($_SERVER["HTTPS"]) ? "https://" : "http://") . $_SERVER["HTTP_HOST"] . $miniAppUrl;
    }

    telegram_api_request($token, "sendMessage", [
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

json_response(["ok" => true, "status" => "ignored"]);

