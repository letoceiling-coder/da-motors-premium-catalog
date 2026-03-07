<?php

declare(strict_types=1);

require_once __DIR__ . "/_common.php";

$applications = read_json_file("applications.json", []);

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    // Sort by created_at descending (newest first)
    usort($applications, static function ($a, $b) {
        $timeA = strtotime($a["created_at"] ?? "1970-01-01");
        $timeB = strtotime($b["created_at"] ?? "1970-01-01");
        return $timeB <=> $timeA;
    });
    json_response(["ok" => true, "applications" => $applications]);
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        json_response(["ok" => false, "error" => "Invalid payload"], 400);
    }

    $action = (string)($input["action"] ?? "");
    
    if ($action === "create") {
        // Create new application from MiniApp
        $application = [
            "id" => uniqid("app-", true),
            "type" => (string)($input["type"] ?? "contact"),
            "name" => trim((string)($input["name"] ?? "")),
            "phone" => trim((string)($input["phone"] ?? "")),
            "email" => trim((string)($input["email"] ?? "")),
            "message" => trim((string)($input["message"] ?? "")),
            "car_id" => (string)($input["car_id"] ?? ""),
            "car_brand" => (string)($input["car_brand"] ?? ""),
            "car_model" => (string)($input["car_model"] ?? ""),
            "status" => "new",
            "created_at" => date(DATE_ATOM),
            "updated_at" => date(DATE_ATOM),
        ];

        $applications[] = $application;
        if (!write_json_file("applications.json", $applications)) {
            json_response(["ok" => false, "error" => "Failed to save application"], 500);
        }

        // Notify bot admins about new application
        notify_bot_admins_new_application($application);

        json_response(["ok" => true, "application" => $application]);
    }

    if ($action === "update_status") {
        $id = (string)($input["id"] ?? "");
        $status = (string)($input["status"] ?? "");
        
        if ($id === "" || $status === "") {
            json_response(["ok" => false, "error" => "id and status are required"], 400);
        }

        $found = false;
        foreach ($applications as &$app) {
            if ((string)($app["id"] ?? "") === $id) {
                $app["status"] = $status;
                $app["updated_at"] = date(DATE_ATOM);
                $found = true;
                break;
            }
        }
        unset($app);

        if (!$found) {
            json_response(["ok" => false, "error" => "Application not found"], 404);
        }

        if (!write_json_file("applications.json", $applications)) {
            json_response(["ok" => false, "error" => "Failed to update application"], 500);
        }

        json_response(["ok" => true, "application" => $app ?? null]);
    }

    if ($action === "delete") {
        $id = (string)($input["id"] ?? "");
        
        if ($id === "") {
            json_response(["ok" => false, "error" => "id is required"], 400);
        }

        // Mark as deleted instead of removing (preserve history)
        $found = false;
        foreach ($applications as &$app) {
            if ((string)($app["id"] ?? "") === $id) {
                $app["deleted_at"] = date(DATE_ATOM);
                $app["status"] = "deleted";
                $app["updated_at"] = date(DATE_ATOM);
                $found = true;
                break;
            }
        }
        unset($app);

        if (!$found) {
            json_response(["ok" => false, "error" => "Application not found"], 404);
        }

        if (!write_json_file("applications.json", $applications)) {
            json_response(["ok" => false, "error" => "Failed to delete application"], 500);
        }

        json_response(["ok" => true, "message" => "Application marked as deleted"]);
    }

    json_response(["ok" => false, "error" => "Unknown action"], 400);
}

json_response(["ok" => false, "error" => "Method not allowed"], 405);

function notify_bot_admins_new_application(array $application): void
{
    $config = read_json_file("bot-config.json", []);
    $token = trim((string)($config["botToken"] ?? ""));
    if ($token === "") {
        return; // Bot not configured
    }

    $users = read_json_file("bot-users.json", []);
    $admins = read_json_file("bot-admins.json", []);
    
    if (!is_array($admins)) {
        $admins = [];
    }

    $adminChatIds = [];
    foreach ($users as $user) {
        $chatId = (string)($user["chat_id"] ?? "");
        $isAdmin = (bool)($user["is_admin"] ?? false) || in_array($chatId, $admins, true);
        if ($isAdmin && $chatId !== "") {
            $adminChatIds[] = $chatId;
        }
    }

    if (count($adminChatIds) === 0) {
        return; // No admins to notify
    }

    $typeLabel = match ($application["type"] ?? "contact") {
        "trade_in" => "Trade-In",
        "test_drive" => "Тест-драйв",
        "consultation" => "Консультация",
        default => "Обратная связь",
    };

    $carInfo = "";
    if (!empty($application["car_brand"]) || !empty($application["car_model"])) {
        $carInfo = "\nАвтомобиль: " . trim($application["car_brand"] . " " . $application["car_model"]);
    }

    $message = "🔔 Новая заявка: {$typeLabel}\n"
        . "Имя: " . ($application["name"] ?? "Не указано") . "\n"
        . "Телефон: " . ($application["phone"] ?? "Не указан") . "\n"
        . "Email: " . ($application["email"] ?? "Не указан") . $carInfo
        . "\n\nСообщение: " . (mb_substr($application["message"] ?? "", 0, 200));

    foreach ($adminChatIds as $chatId) {
        telegram_api_request($token, "sendMessage", [
            "chat_id" => $chatId,
            "text" => $message,
        ]);
    }
}
