<?php

declare(strict_types=1);

require_once __DIR__ . "/_common.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(["ok" => false, "error" => "Method not allowed"], 405);
}

$report = run_catalog_parser();
if (!($report["ok"] ?? false)) {
    json_response($report, 500);
}

json_response($report, 200);

