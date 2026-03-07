<?php

declare(strict_types=1);

/**
 * Migration script: Move data from public/data to protected storage
 * Run this once to migrate existing data
 */

require_once __DIR__ . "/_storage.php";
require_once __DIR__ . "/_common.php";

header("Content-Type: application/json; charset=utf-8");

$oldDataDir = dirname(__DIR__) . "/data";
$migrated = [];
$errors = [];

// Migrate bot config
if (file_exists($oldDataDir . "/bot-config.json")) {
    try {
        $oldConfig = json_decode(file_get_contents($oldDataDir . "/bot-config.json"), true);
        if (is_array($oldConfig)) {
            db_save_bot_config($oldConfig);
            $migrated[] = "bot-config.json -> database";
        }
    } catch (Exception $e) {
        $errors[] = "bot-config.json: " . $e->getMessage();
    }
}

// Migrate bot users
if (file_exists($oldDataDir . "/bot-users.json")) {
    try {
        $oldUsers = json_decode(file_get_contents($oldDataDir . "/bot-users.json"), true);
        if (is_array($oldUsers)) {
            foreach ($oldUsers as $user) {
                if (isset($user['deleted_at'])) continue; // Skip deleted
                db_save_bot_user($user);
            }
            $migrated[] = "bot-users.json -> database (" . count($oldUsers) . " users)";
        }
    } catch (Exception $e) {
        $errors[] = "bot-users.json: " . $e->getMessage();
    }
}

// Migrate bot admins
if (file_exists($oldDataDir . "/bot-admins.json")) {
    try {
        $oldAdmins = json_decode(file_get_contents($oldDataDir . "/bot-admins.json"), true);
        if (is_array($oldAdmins)) {
            foreach ($oldAdmins as $chatId) {
                db_set_bot_admin((string)$chatId, true);
            }
            $migrated[] = "bot-admins.json -> database (" . count($oldAdmins) . " admins)";
        }
    } catch (Exception $e) {
        $errors[] = "bot-admins.json: " . $e->getMessage();
    }
}

// Migrate applications
if (file_exists($oldDataDir . "/applications.json")) {
    try {
        $oldApps = json_decode(file_get_contents($oldDataDir . "/applications.json"), true);
        if (is_array($oldApps)) {
            foreach ($oldApps as $app) {
                if (isset($app['deleted_at'])) continue; // Skip deleted
                db_save_application($app);
            }
            $migrated[] = "applications.json -> database (" . count($oldApps) . " applications)";
        }
    } catch (Exception $e) {
        $errors[] = "applications.json: " . $e->getMessage();
    }
}

// Migrate large JSON files (cars.json, logs) to protected storage
$largeFiles = ["cars.json", "catalog-sync-report.json"];
foreach ($largeFiles as $file) {
    $oldPath = $oldDataDir . "/" . $file;
    if (file_exists($oldPath)) {
        try {
            $content = file_get_contents($oldPath);
            if ($content !== false) {
                // For JSON files, decode and re-encode to ensure valid JSON
                if (strpos($file, '.json') !== false) {
                    $decoded = json_decode($content, true);
                    if ($decoded !== null) {
                        write_json_storage($file, $decoded);
                    } else {
                        write_json_storage($file, $content); // Save as-is if not valid JSON
                    }
                } else {
                    write_json_storage($file, $content);
                }
                $migrated[] = $file . " -> protected storage";
            }
        } catch (Exception $e) {
            $errors[] = $file . ": " . $e->getMessage();
        }
    }
}

// Migrate webhook.log (text file)
$logFile = $oldDataDir . "/webhook.log";
if (file_exists($logFile)) {
    try {
        $content = file_get_contents($logFile);
        if ($content !== false) {
            file_put_contents(get_json_storage_path("webhook.log"), $content, FILE_APPEND);
            $migrated[] = "webhook.log -> protected storage";
        }
    } catch (Exception $e) {
        $errors[] = "webhook.log: " . $e->getMessage();
    }
}

json_response([
    "ok" => true,
    "migrated" => $migrated,
    "errors" => $errors,
    "storage_location" => get_storage_base(),
    "database_location" => get_db_path(),
]);
