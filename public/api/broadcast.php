<?php

declare(strict_types=1);

require_once __DIR__ . "/_common.php";

$config = read_json_file("bot-config.json", []);
$token = trim((string)($config["botToken"] ?? ""));
if ($token === "") {
    json_response(["ok" => false, "error" => "Bot token is not configured"], 400);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(["ok" => false, "error" => "Method not allowed"], 405);
}

$input = json_decode(file_get_contents("php://input"), true);
if (!is_array($input)) {
    json_response(["ok" => false, "error" => "Invalid payload"], 400);
}

$type = (string)($input["type"] ?? "text");
$text = trim((string)($input["text"] ?? ""));
$mediaSource = (string)($input["mediaSource"] ?? "url");
$mediaUrl = trim((string)($input["mediaUrl"] ?? ""));
$parseMode = (string)($input["parseMode"] ?? "HTML");
$disableNotification = (bool)($input["disableNotification"] ?? false);
$protectContent = (bool)($input["protectContent"] ?? false);
$disableWebPagePreview = (bool)($input["disableWebPagePreview"] ?? false);
$sendToAll = (bool)($input["sendToAll"] ?? false);
$selectedUsers = is_array($input["selectedUsers"] ?? null) ? $input["selectedUsers"] : [];

// Get recipients
$users = read_json_file("bot-users.json", []);
$recipients = [];

if ($sendToAll) {
    foreach ($users as $user) {
        $chatId = (string)($user["chat_id"] ?? "");
        if ($chatId !== "" && !isset($user["deleted_at"])) {
            $recipients[] = $chatId;
        }
    }
} else {
    foreach ($selectedUsers as $selectedId) {
        foreach ($users as $user) {
            if ((string)($user["chat_id"] ?? "") === (string)$selectedId && !isset($user["deleted_at"])) {
                $recipients[] = (string)($user["chat_id"] ?? "");
                break;
            }
        }
    }
}

if (count($recipients) === 0) {
    json_response(["ok" => false, "error" => "No recipients selected"], 400);
}

// Prepare message payload
$basePayload = [
    "parse_mode" => $parseMode === "None" ? null : $parseMode,
    "disable_notification" => $disableNotification,
    "protect_content" => $protectContent,
];

if ($type === "text") {
    if (strlen($text) < 1 || strlen($text) > 4096) {
        json_response(["ok" => false, "error" => "Text must be 1-4096 characters"], 400);
    }
    if ($disableWebPagePreview) {
        $basePayload["disable_web_page_preview"] = true;
    }
    $basePayload["text"] = $text;
} elseif ($type === "photo" || $type === "video") {
    if ($mediaSource === "url") {
        if ($mediaUrl === "") {
            json_response(["ok" => false, "error" => "Media URL is required"], 400);
        }
        $basePayload[$type] = $mediaUrl;
    } else {
        json_response(["ok" => false, "error" => "File upload not supported yet, use URL"], 400);
    }
    if ($text !== "") {
        if (strlen($text) > 1024) {
            json_response(["ok" => false, "error" => "Caption must be max 1024 characters"], 400);
        }
        $basePayload["caption"] = $text;
    }
} else {
    json_response(["ok" => false, "error" => "Invalid message type"], 400);
}

// Remove null parse_mode
if ($basePayload["parse_mode"] === null) {
    unset($basePayload["parse_mode"]);
}

// Send messages
$method = $type === "text" ? "sendMessage" : ($type === "photo" ? "sendPhoto" : "sendVideo");
$successCount = 0;
$failCount = 0;
$errors = [];

foreach ($recipients as $chatId) {
    $payload = array_merge($basePayload, ["chat_id" => $chatId]);
    $result = telegram_api_request($token, $method, $payload);
    
    if (($result["ok"] ?? false) === true) {
        $successCount++;
    } else {
        $failCount++;
        $errors[] = [
            "chat_id" => $chatId,
            "error" => $result["error"] ?? "Unknown error",
        ];
    }
    
    // Small delay to avoid rate limiting
    usleep(100000); // 0.1 second
}

json_response([
    "ok" => true,
    "sent" => $successCount,
    "failed" => $failCount,
    "total" => count($recipients),
    "errors" => array_slice($errors, 0, 10), // Limit errors in response
]);
