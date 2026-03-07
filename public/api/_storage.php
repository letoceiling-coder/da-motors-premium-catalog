<?php

declare(strict_types=1);

/**
 * Protected storage system - data stored OUTSIDE public_html
 * This prevents data loss during deployment
 */

// Storage directory is in user's home, outside public_html
function get_storage_base(): string
{
    // Try multiple possible locations
    $home = $_SERVER['HOME'] ?? (function_exists('posix_getpwuid') ? posix_getpwuid(posix_geteuid())['dir'] : '/home/dsc23ytp');
    
    $possiblePaths = [
        $home . '/app_storage',
        dirname(dirname(dirname(__DIR__))) . '/app_storage',
        __DIR__ . '/../../../../app_storage',
        '/home/dsc23ytp/app_storage', // Explicit path for Beget
    ];
    
    foreach ($possiblePaths as $path) {
        $dir = dirname($path);
        if (is_dir($dir) || @mkdir($dir, 0770, true)) {
            if (is_dir($path) || @mkdir($path, 0770, true)) {
                return $path;
            }
        }
    }
    
    // Fallback: create in current user's home
    $storage = $home . '/app_storage';
    @mkdir($storage, 0770, true);
    return $storage;
}

function get_db_path(): string
{
    $base = get_storage_base();
    $dbPath = $base . '/app.db';
    return $dbPath;
}

function get_storage_db(): ?PDO
{
    static $db = null;
    
    if ($db !== null) {
        return $db;
    }
    
    $dbPath = get_db_path();
    $dbDir = dirname($dbPath);
    
    if (!is_dir($dbDir)) {
        @mkdir($dbDir, 0770, true);
    }
    
    try {
        $db = new PDO('sqlite:' . $dbPath);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        
        // Initialize tables
        init_storage_tables($db);
        
        return $db;
    } catch (PDOException $e) {
        error_log("Database error: " . $e->getMessage());
        return null;
    }
}

function init_storage_tables(PDO $db): void
{
    // Bot configuration
    $db->exec("
        CREATE TABLE IF NOT EXISTS bot_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key_name TEXT UNIQUE NOT NULL,
            value TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Bot users
    $db->exec("
        CREATE TABLE IF NOT EXISTS bot_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT UNIQUE NOT NULL,
            user_id TEXT,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            is_admin INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        )
    ");
    
    // Bot admins (separate table for many-to-many)
    $db->exec("
        CREATE TABLE IF NOT EXISTS bot_admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT UNIQUE NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Applications
    $db->exec("
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL,
            name TEXT,
            phone TEXT,
            email TEXT,
            message TEXT,
            car_id TEXT,
            car_brand TEXT,
            car_model TEXT,
            status TEXT DEFAULT 'new',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        )
    ");
    
    // Create indexes
    $db->exec("CREATE INDEX IF NOT EXISTS idx_bot_users_chat_id ON bot_users(chat_id)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_bot_users_deleted ON bot_users(deleted_at)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_applications_app_id ON applications(app_id)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_applications_deleted ON applications(deleted_at)");
}

// JSON file storage (for large files like cars.json)
function get_json_storage_path(string $relative): string
{
    $base = get_storage_base();
    $fullPath = $base . '/' . ltrim($relative, '/');
    $dir = dirname($fullPath);
    
    if (!is_dir($dir)) {
        @mkdir($dir, 0770, true);
    }
    
    return $fullPath;
}

function read_json_storage(string $relative, $default = [])
{
    $path = get_json_storage_path($relative);
    if (!file_exists($path)) {
        return $default;
    }
    $raw = file_get_contents($path);
    if ($raw === false || $raw === "") {
        return $default;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $default;
}

function write_json_storage(string $relative, $payload): bool
{
    $path = get_json_storage_path($relative);
    $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($encoded === false) {
        return false;
    }
    return file_put_contents($path, $encoded) !== false;
}

// Database helpers
function db_get_bot_config(): array
{
    $db = get_storage_db();
    if (!$db) {
        return [];
    }
    
    try {
        $stmt = $db->query("SELECT key_name, value FROM bot_config");
        $rows = $stmt->fetchAll();
        $config = [];
        foreach ($rows as $row) {
            $config[$row['key_name']] = json_decode($row['value'], true) ?? $row['value'];
        }
        return $config;
    } catch (PDOException $e) {
        error_log("Error reading bot config: " . $e->getMessage());
        return [];
    }
}

function db_save_bot_config(array $config): bool
{
    $db = get_storage_db();
    if (!$db) {
        return false;
    }
    
    try {
        $db->beginTransaction();
        foreach ($config as $key => $value) {
            $encoded = is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE);
            $stmt = $db->prepare("INSERT OR REPLACE INTO bot_config (key_name, value, updated_at) VALUES (?, ?, datetime('now'))");
            $stmt->execute([$key, $encoded]);
        }
        $db->commit();
        return true;
    } catch (PDOException $e) {
        $db->rollBack();
        error_log("Error saving bot config: " . $e->getMessage());
        return false;
    }
}

function db_get_bot_users(): array
{
    $db = get_storage_db();
    if (!$db) {
        return [];
    }
    
    try {
        $stmt = $db->query("SELECT * FROM bot_users WHERE deleted_at IS NULL ORDER BY last_seen_at DESC");
        $users = $stmt->fetchAll();
        
        // Add is_admin flag based on bot_admins table
        $admins = db_get_bot_admins();
        foreach ($users as &$user) {
            $user['is_admin'] = in_array($user['chat_id'], $admins, true);
        }
        unset($user);
        
        return $users;
    } catch (PDOException $e) {
        error_log("Error reading bot users: " . $e->getMessage());
        return [];
    }
}

function db_save_bot_user(array $user): bool
{
    $db = get_storage_db();
    if (!$db) {
        return false;
    }
    
    try {
        // Save user (is_admin field is kept for backward compatibility, but admins are in separate table)
        $stmt = $db->prepare("
            INSERT INTO bot_users (chat_id, user_id, username, first_name, last_name, is_admin, created_at, updated_at, last_seen_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
            ON CONFLICT(chat_id) DO UPDATE SET
                user_id = excluded.user_id,
                username = excluded.username,
                first_name = excluded.first_name,
                last_name = excluded.last_name,
                updated_at = datetime('now'),
                last_seen_at = datetime('now')
        ");
        
        $isAdmin = ($user['is_admin'] ?? false) || in_array($user['chat_id'] ?? '', db_get_bot_admins(), true);
        
        $stmt->execute([
            $user['chat_id'] ?? '',
            $user['user_id'] ?? '',
            $user['username'] ?? '',
            $user['first_name'] ?? '',
            $user['last_name'] ?? '',
            $isAdmin ? 1 : 0,
        ]);
        
        return true;
    } catch (PDOException $e) {
        error_log("Error saving bot user: " . $e->getMessage());
        return false;
    }
}

function db_get_applications(): array
{
    $db = get_storage_db();
    if (!$db) {
        return [];
    }
    
    try {
        $stmt = $db->query("SELECT * FROM applications WHERE deleted_at IS NULL ORDER BY created_at DESC");
        return $stmt->fetchAll();
    } catch (PDOException $e) {
        error_log("Error reading applications: " . $e->getMessage());
        return [];
    }
}

function db_save_application(array $app): bool
{
    $db = get_storage_db();
    if (!$db) {
        return false;
    }
    
    try {
        $stmt = $db->prepare("
            INSERT INTO applications (app_id, type, name, phone, email, message, car_id, car_brand, car_model, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ");
        
        $stmt->execute([
            $app['id'] ?? uniqid('app-', true),
            $app['type'] ?? 'contact',
            $app['name'] ?? '',
            $app['phone'] ?? '',
            $app['email'] ?? '',
            $app['message'] ?? '',
            $app['car_id'] ?? '',
            $app['car_brand'] ?? '',
            $app['car_model'] ?? '',
            $app['status'] ?? 'new',
        ]);
        
        return true;
    } catch (PDOException $e) {
        error_log("Error saving application: " . $e->getMessage());
        return false;
    }
}

function db_get_bot_admins(): array
{
    $db = get_storage_db();
    if (!$db) {
        return [];
    }
    
    try {
        $stmt = $db->query("SELECT chat_id FROM bot_admins");
        $rows = $stmt->fetchAll();
        return array_column($rows, 'chat_id');
    } catch (PDOException $e) {
        error_log("Error reading bot admins: " . $e->getMessage());
        return [];
    }
}

function db_set_bot_admin(string $chatId, bool $isAdmin): bool
{
    $db = get_storage_db();
    if (!$db) {
        return false;
    }
    
    try {
        if ($isAdmin) {
            $stmt = $db->prepare("INSERT OR IGNORE INTO bot_admins (chat_id) VALUES (?)");
            $stmt->execute([$chatId]);
        } else {
            $stmt = $db->prepare("DELETE FROM bot_admins WHERE chat_id = ?");
            $stmt->execute([$chatId]);
        }
        return true;
    } catch (PDOException $e) {
        error_log("Error setting bot admin: " . $e->getMessage());
        return false;
    }
}
