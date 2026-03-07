<?php

declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");

function storage_path(string $relative): string
{
    $base = dirname(__DIR__) . DIRECTORY_SEPARATOR . "data";
    if (!is_dir($base)) {
        @mkdir($base, 0775, true);
    }
    return $base . DIRECTORY_SEPARATOR . $relative;
}

function read_json_file(string $relative, $default = [])
{
    $path = storage_path($relative);
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

function write_json_file(string $relative, $payload): bool
{
    $path = storage_path($relative);
    $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($encoded === false) {
        return false;
    }
    return file_put_contents($path, $encoded) !== false;
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function run_catalog_parser(): array
{
    $scriptPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . "system" . DIRECTORY_SEPARATOR . "catalog-parser.mjs";
    if (!file_exists($scriptPath)) {
        return [
            "ok" => false,
            "error" => "Parser script not found",
        ];
    }

    $nodeBin = resolve_node_binary();
    if ($nodeBin === null) {
        return [
            "ok" => false,
            "error" => "Node.js binary not found for parser execution",
        ];
    }

    $cmd = escapeshellarg($nodeBin) . " " . escapeshellarg($scriptPath) . " 2>&1";
    $output = [];
    $exitCode = 0;
    exec($cmd, $output, $exitCode);
    $joined = implode("\n", $output);

    if ($exitCode !== 0) {
        return [
            "ok" => false,
            "error" => "Parser process failed",
            "details" => $joined,
        ];
    }

    $decoded = json_decode($joined, true);
    if (!is_array($decoded)) {
        return [
            "ok" => false,
            "error" => "Invalid parser output",
            "details" => $joined,
        ];
    }

    return $decoded;
}

function resolve_node_binary(): ?string
{
    $candidates = [];

    // Common binaries
    $candidates[] = "/usr/bin/node";
    $candidates[] = "/usr/local/bin/node";

    // NVM (shared hosting typical)
    $home = getenv("HOME");
    if (is_string($home) && $home !== "") {
        $nvmMatches = glob($home . "/.nvm/versions/node/*/bin/node");
        if (is_array($nvmMatches)) {
            usort($nvmMatches, static fn($a, $b) => strcmp($b, $a));
            $candidates = array_merge($nvmMatches, $candidates);
        }
    }

    foreach ($candidates as $bin) {
        if (is_string($bin) && file_exists($bin) && is_executable($bin)) {
            return $bin;
        }
    }

    return null;
}

function telegram_api_request(string $token, string $method, array $payload): array
{
    $url = "https://api.telegram.org/bot{$token}/{$method}";
    $opts = [
        "http" => [
            "method" => "POST",
            "header" => "Content-Type: application/json\r\n",
            "content" => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            "timeout" => 15,
        ],
    ];
    $result = @file_get_contents($url, false, stream_context_create($opts));
    if ($result === false) {
        return ["ok" => false, "error" => "Request failed"];
    }
    $decoded = json_decode($result, true);
    return is_array($decoded) ? $decoded : ["ok" => false, "error" => "Invalid Telegram response"];
}

