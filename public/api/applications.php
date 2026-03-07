<?php

declare(strict_types=1);

require_once __DIR__ . "/_common.php";

// Use database (primary) with JSON fallback for migration
$applications = db_get_applications();
if (empty($applications)) {
    // Fallback to JSON during migration
    $jsonApps = read_json_file("applications.json", []);
    if (is_array($jsonApps) && !empty($jsonApps)) {
        $applications = $jsonApps;
    }
}

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    // Applications from DB are already sorted and filtered
    // For JSON fallback, sort manually
    if (!empty($applications) && isset($applications[0]['created_at'])) {
        usort($applications, static function ($a, $b) {
            $timeA = strtotime($a["created_at"] ?? "1970-01-01");
            $timeB = strtotime($b["created_at"] ?? "1970-01-01");
            return $timeB <=> $timeA;
        });
    }
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

        // Save to database (primary storage)
        if (!db_save_application($application)) {
            json_response(["ok" => false, "error" => "Failed to save application to database"], 500);
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

        // Update in database
        $db = get_storage_db();
        if (!$db) {
            json_response(["ok" => false, "error" => "Database unavailable"], 500);
        }
        
        try {
            $stmt = $db->prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE app_id = ? AND deleted_at IS NULL");
            $stmt->execute([$status, $id]);
            
            if ($stmt->rowCount() === 0) {
                json_response(["ok" => false, "error" => "Application not found"], 404);
            }
            
            $stmt = $db->prepare("SELECT * FROM applications WHERE app_id = ?");
            $stmt->execute([$id]);
            $app = $stmt->fetch();
            
            json_response(["ok" => true, "application" => $app]);
        } catch (PDOException $e) {
            json_response(["ok" => false, "error" => "Database error: " . $e->getMessage()], 500);
        }
    }

    if ($action === "delete") {
        $id = (string)($input["id"] ?? "");
        
        if ($id === "") {
            json_response(["ok" => false, "error" => "id is required"], 400);
        }

        // Mark as deleted in database (preserve history)
        $db = get_storage_db();
        if (!$db) {
            json_response(["ok" => false, "error" => "Database unavailable"], 500);
        }
        
        try {
            $stmt = $db->prepare("UPDATE applications SET deleted_at = datetime('now'), status = 'deleted', updated_at = datetime('now') WHERE app_id = ? AND deleted_at IS NULL");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() === 0) {
                json_response(["ok" => false, "error" => "Application not found"], 404);
            }
            
            json_response(["ok" => true, "message" => "Application marked as deleted"]);
        } catch (PDOException $e) {
            json_response(["ok" => false, "error" => "Database error: " . $e->getMessage()], 500);
        }
    }

    json_response(["ok" => false, "error" => "Unknown action"], 400);
}

json_response(["ok" => false, "error" => "Method not allowed"], 405);

function notify_bot_admins_new_application(array $application): void
{
    // Get config from database
    $dbConfig = db_get_bot_config();
    $jsonConfig = read_json_file("bot-config.json", []);
    $config = array_merge($dbConfig, $jsonConfig);
    
    $token = trim((string)($config["botToken"] ?? ""));
    if ($token === "") {
        return; // Bot not configured
    }

    // Get admins from database
    $admins = db_get_bot_admins();
    
    $adminChatIds = [];
    foreach ($admins as $chatId) {
        if ($chatId !== "") {
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
