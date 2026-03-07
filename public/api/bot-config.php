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
    $config = read_json_file("bot-config.json", $defaultConfig);
    json_response(["ok" => true, "config" => array_merge($defaultConfig, $config)]);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(["ok" => false, "error" => "Method not allowed"], 405);
}

$input = json_decode(file_get_contents("php://input"), true);
if (!is_array($input)) {
    json_response(["ok" => false, "error" => "Invalid payload"], 400);
}

$config = array_merge($defaultConfig, $input);

$token = trim((string)($config["botToken"] ?? ""));
if ($token !== "") {
    $config["webhookUrl"] = (isset($_SERVER["HTTPS"]) ? "https://" : "http://") . $_SERVER["HTTP_HOST"] . "/telegram/webhook";
}

if (!write_json_file("bot-config.json", $config)) {
    json_response(["ok" => false, "error" => "Failed to save config"], 500);
}

$setWebhookResult = null;
if ($token !== "") {
    $setWebhookResult = telegram_api_request($token, "setWebhook", [
        "url" => $config["webhookUrl"],
        "allowed_updates" => ["message"],
    ]);
}

json_response([
    "ok" => true,
    "config" => $config,
    "webhook" => $setWebhookResult,
]);

