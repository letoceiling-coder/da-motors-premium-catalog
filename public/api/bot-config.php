<?php

declare(strict_types=1);

require_once __DIR__ . "/_common.php";

$defaultConfig = [
    "botToken" => "",
    "welcomeMessage" => "Добро пожаловать! Нажмите кнопку ниже, чтобы открыть MiniApp.",
    "startButtonText" => "Открыть приложение",
    "miniAppUrl" => "/",
    "botDescription" => "",
    "botShortDescription" => "",
    "webhookUrl" => "",
];

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    // Try database first, fallback to JSON for migration
    $dbConfig = db_get_bot_config();
    $jsonConfig = read_json_file("bot-config.json", []);
    $config = array_merge($defaultConfig, $dbConfig, $jsonConfig);
    $merged = array_merge($defaultConfig, $config);
    $hasToken = trim((string)($merged["botToken"] ?? "")) !== "";
    // Do not expose raw bot token in GET response.
    $merged["botToken"] = "";
    json_response(["ok" => true, "config" => $merged, "hasToken" => $hasToken]);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(["ok" => false, "error" => "Method not allowed"], 405);
}

$input = json_decode(file_get_contents("php://input"), true);
if (!is_array($input)) {
    json_response(["ok" => false, "error" => "Invalid payload"], 400);
}

// Get existing config from database or JSON
$dbConfig = db_get_bot_config();
$jsonConfig = read_json_file("bot-config.json", []);
$stored = array_merge($defaultConfig, $dbConfig, $jsonConfig);
$config = array_merge($stored, $input);

$incomingToken = trim((string)($input["botToken"] ?? ""));
if ($incomingToken !== "") {
    $config["botToken"] = $incomingToken;
}

$token = trim((string)($config["botToken"] ?? ""));
if ($token !== "") {
    $config["webhookUrl"] = (isset($_SERVER["HTTPS"]) ? "https://" : "http://") . $_SERVER["HTTP_HOST"] . "/telegram/webhook";
}

// Save to database (primary storage)
if (!db_save_bot_config($config)) {
    json_response(["ok" => false, "error" => "Failed to save config to database"], 500);
}

// Also save to JSON for backward compatibility during migration
write_json_file("bot-config.json", $config);

$setWebhookResult = null;
$setDescriptionResult = null;
$setShortDescriptionResult = null;
if ($token !== "") {
    $setWebhookResult = telegram_api_request($token, "setWebhook", [
        "url" => $config["webhookUrl"],
        "allowed_updates" => ["message"],
    ]);

    $setDescriptionResult = telegram_api_request($token, "setMyDescription", [
        "description" => (string)($config["botDescription"] ?? ""),
    ]);

    $setShortDescriptionResult = telegram_api_request($token, "setMyShortDescription", [
        "short_description" => (string)($config["botShortDescription"] ?? ""),
    ]);
}

json_response([
    "ok" => true,
    "config" => array_merge($config, ["botToken" => ""]),
    "hasToken" => ($token !== ""),
    "webhook" => $setWebhookResult,
    "description" => $setDescriptionResult,
    "short_description" => $setShortDescriptionResult,
]);

