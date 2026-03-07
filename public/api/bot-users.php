<?php

declare(strict_types=1);

require_once __DIR__ . "/_common.php";

$users = read_json_file("bot-users.json", []);

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    usort($users, static function ($a, $b) {
        return strcmp((string)($b["last_seen_at"] ?? ""), (string)($a["last_seen_at"] ?? ""));
    });
    json_response(["ok" => true, "users" => $users]);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(["ok" => false, "error" => "Method not allowed"], 405);
}

$input = json_decode(file_get_contents("php://input"), true);
if (!is_array($input)) {
    json_response(["ok" => false, "error" => "Invalid payload"], 400);
}

$chatId = (string)($input["chat_id"] ?? "");
if ($chatId === "") {
    json_response(["ok" => false, "error" => "chat_id is required"], 400);
}

$isAdmin = (bool)($input["is_admin"] ?? false);

$updated = false;
foreach ($users as &$user) {
    if ((string)($user["chat_id"] ?? "") === $chatId) {
        $user["is_admin"] = $isAdmin;
        $user["updated_at"] = date(DATE_ATOM);
        $updated = true;
        break;
    }
}
unset($user);

if (!$updated) {
    $users[] = [
        "chat_id" => $chatId,
        "user_id" => (string)($input["user_id"] ?? ""),
        "username" => (string)($input["username"] ?? ""),
        "first_name" => (string)($input["first_name"] ?? ""),
        "last_name" => (string)($input["last_name"] ?? ""),
        "is_admin" => $isAdmin,
        "created_at" => date(DATE_ATOM),
        "updated_at" => date(DATE_ATOM),
        "last_seen_at" => date(DATE_ATOM),
    ];
}

if (!write_json_file("bot-users.json", $users)) {
    json_response(["ok" => false, "error" => "Failed to save users"], 500);
}

json_response(["ok" => true, "users" => $users]);

