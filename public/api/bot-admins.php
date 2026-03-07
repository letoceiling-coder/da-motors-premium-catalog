<?php

declare(strict_types=1);

require_once __DIR__ . "/_common.php";

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $admins = db_get_bot_admins();
    json_response(["ok" => true, "admins" => $admins]);
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        json_response(["ok" => false, "error" => "Invalid payload"], 400);
    }

    $chatId = (string)($input["chat_id"] ?? "");
    $isAdmin = (bool)($input["is_admin"] ?? false);

    if ($chatId === "") {
        json_response(["ok" => false, "error" => "chat_id is required"], 400);
    }

    if (!db_set_bot_admin($chatId, $isAdmin)) {
        json_response(["ok" => false, "error" => "Failed to update admin status"], 500);
    }

    $admins = db_get_bot_admins();
    json_response(["ok" => true, "admins" => $admins]);
}

json_response(["ok" => false, "error" => "Method not allowed"], 405);
