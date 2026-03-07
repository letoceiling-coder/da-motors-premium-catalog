<?php

declare(strict_types=1);

require_once __DIR__ . "/_common.php";

// CRITICAL: Never delete users automatically - preserve all history
// Use database (primary) with JSON fallback for migration
$users = db_get_bot_users();
if (empty($users)) {
    // Fallback to JSON during migration
    $jsonUsers = read_json_file("bot-users.json", []);
    if (is_array($jsonUsers) && !empty($jsonUsers)) {
        $users = $jsonUsers;
    }
}

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    // Users from DB are already filtered (deleted_at IS NULL)
    // For JSON fallback, filter manually
    if (!empty($users) && isset($users[0]['deleted_at'])) {
        $users = array_filter($users, static function ($user) {
            return !isset($user["deleted_at"]);
        });
    }
    usort($users, static function ($a, $b) {
        return strcmp((string)($b["last_seen_at"] ?? ""), (string)($a["last_seen_at"] ?? ""));
    });
    json_response(["ok" => true, "users" => array_values($users)]);
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

// Save to database (primary storage)
$userData = [
    "chat_id" => $chatId,
    "user_id" => (string)($input["user_id"] ?? ""),
    "username" => (string)($input["username"] ?? ""),
    "first_name" => (string)($input["first_name"] ?? ""),
    "last_name" => (string)($input["last_name"] ?? ""),
    "is_admin" => $isAdmin,
];

if (!db_save_bot_user($userData)) {
    json_response(["ok" => false, "error" => "Failed to save user to database"], 500);
}

// Update admin status
db_set_bot_admin($chatId, $isAdmin);

// Get updated users list
$updatedUsers = db_get_bot_users();
json_response(["ok" => true, "users" => $updatedUsers]);

