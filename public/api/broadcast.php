<?php

declare(strict_types=1);

require_once __DIR__ . "/_common.php";

// Get config from database (primary) with JSON fallback
$dbConfig = db_get_bot_config();
$jsonConfig = read_json_file("bot-config.json", []);
$config = array_merge($dbConfig, $jsonConfig);

$token = trim((string)($config["botToken"] ?? ""));
if ($token === "") {
    json_response(["ok" => false, "error" => "Bot token is not configured"], 400);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(["ok" => false, "error" => "Method not allowed"], 405);
}

// Handle both JSON and multipart/form-data
$input = [];
$uploadedFile = null;
$uploadedFilePath = null;

$contentType = $_SERVER["CONTENT_TYPE"] ?? "";
if (strpos($contentType, "multipart/form-data") !== false) {
    // Handle multipart/form-data (file upload)
    $input = $_POST;
    if (isset($_FILES["mediaFile"]) && $_FILES["mediaFile"]["error"] === UPLOAD_ERR_OK) {
        $uploadedFile = $_FILES["mediaFile"];
        // Create temporary file path
        $tempDir = sys_get_temp_dir();
        $uploadedFilePath = $tempDir . DIRECTORY_SEPARATOR . uniqid("broadcast_") . "_" . basename($uploadedFile["name"]);
        if (!move_uploaded_file($uploadedFile["tmp_name"], $uploadedFilePath)) {
            json_response(["ok" => false, "error" => "Failed to save uploaded file"], 500);
        }
    }
} else {
    // Handle JSON
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        json_response(["ok" => false, "error" => "Invalid payload"], 400);
    }
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

// Get recipients from database (primary) with JSON fallback
$users = db_get_bot_users();
if (empty($users)) {
    // Fallback to JSON during migration
    $jsonUsers = read_json_file("bot-users.json", []);
    if (is_array($jsonUsers)) {
        $users = array_filter($jsonUsers, static function ($user) {
            return !isset($user["deleted_at"]);
        });
    }
}

$recipients = [];

if ($sendToAll) {
    foreach ($users as $user) {
        $chatId = (string)($user["chat_id"] ?? "");
        if ($chatId !== "") {
            $recipients[] = $chatId;
        }
    }
} else {
    foreach ($selectedUsers as $selectedId) {
        foreach ($users as $user) {
            if ((string)($user["chat_id"] ?? "") === (string)$selectedId) {
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
    } elseif ($mediaSource === "file") {
        if ($uploadedFilePath === null || !file_exists($uploadedFilePath)) {
            json_response(["ok" => false, "error" => "Media file is required"], 400);
        }
        // File will be sent via telegram_api_request_file
    } else {
        json_response(["ok" => false, "error" => "Invalid media source"], 400);
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
$useFileUpload = ($type === "photo" || $type === "video") && $mediaSource === "file" && $uploadedFilePath !== null;

foreach ($recipients as $chatId) {
    $payload = array_merge($basePayload, ["chat_id" => $chatId]);
    
    if ($useFileUpload) {
        // Remove media URL from payload (we'll send file instead)
        unset($payload[$type]);
        $result = telegram_api_request_file($token, $method, $payload, $type, $uploadedFilePath);
    } else {
        $result = telegram_api_request($token, $method, $payload);
    }
    
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

// Clean up uploaded file
if ($uploadedFilePath !== null && file_exists($uploadedFilePath)) {
    @unlink($uploadedFilePath);
}

json_response([
    "ok" => true,
    "sent" => $successCount,
    "failed" => $failCount,
    "total" => count($recipients),
    "errors" => array_slice($errors, 0, 10), // Limit errors in response
]);
