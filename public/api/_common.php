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
    $apiEndpoints = [
        ["storepartuid" => "967787820261", "recid" => "853371680"],
        ["storepartuid" => "756428026962", "recid" => "867855191"],
        ["storepartuid" => "726936299082", "recid" => "870671208"],
    ];

    $allCars = [];
    foreach ($apiEndpoints as $endpoint) {
        $url = "https://store.tildaapi.com/api/getproductslist/?"
            . "storepartuid=" . urlencode($endpoint["storepartuid"])
            . "&recid=" . urlencode($endpoint["recid"])
            . "&getparts=true&getoptions=true&slice=1&size=100";

        $ctx = stream_context_create([
            "http" => [
                "method" => "GET",
                "header" => "User-Agent: Mozilla/5.0\r\nAccept: */*\r\n",
                "timeout" => 30,
            ],
        ]);
        $html = @file_get_contents($url, false, $ctx);
        if ($html === false) {
            continue;
        }

        $products = extract_tilda_products($html);
        foreach ($products as $product) {
            $car = map_product_to_car($product);
            if ($car !== null) {
                $allCars[] = $car;
            }
        }
    }

    $unique = [];
    foreach ($allCars as $car) {
        $key = car_key($car);
        $unique[$key] = $car;
    }
    $nextCars = array_values($unique);

    $prevCars = read_json_file("cars.json", []);
    if (!is_array($prevCars)) {
        $prevCars = [];
    }

    $prevMap = [];
    foreach ($prevCars as $car) {
        if (is_array($car)) {
            $prevMap[car_key($car)] = $car;
        }
    }
    $nextMap = [];
    foreach ($nextCars as $car) {
        $nextMap[car_key($car)] = $car;
    }

    $added = [];
    $removed = [];
    $updated = [];

    foreach ($nextMap as $k => $car) {
        if (!isset($prevMap[$k])) {
            $added[] = ($car["brand"] ?? "") . " " . ($car["model"] ?? "");
            continue;
        }
        $old = $prevMap[$k];
        if (($old["price"] ?? 0) !== ($car["price"] ?? 0)
            || ($old["status"] ?? "") !== ($car["status"] ?? "")
            || ($old["mileage"] ?? 0) !== ($car["mileage"] ?? 0)) {
            $updated[] = [
                "brand" => $car["brand"] ?? "",
                "model" => $car["model"] ?? "",
                "oldPrice" => $old["price"] ?? 0,
                "newPrice" => $car["price"] ?? 0,
            ];
        }
    }

    foreach ($prevMap as $k => $car) {
        if (!isset($nextMap[$k])) {
            $removed[] = ($car["brand"] ?? "") . " " . ($car["model"] ?? "");
        }
    }

    write_json_file("cars.json", $nextCars);

    $report = [
        "ok" => true,
        "updatedAt" => date(DATE_ATOM),
        "summary" => [
            "total" => count($nextCars),
            "added" => count($added),
            "updated" => count($updated),
            "removed" => count($removed),
        ],
        "details" => [
            "added" => array_slice($added, 0, 10),
            "updated" => array_slice($updated, 0, 10),
            "removed" => array_slice($removed, 0, 10),
        ],
    ];
    write_json_file("catalog-sync-report.json", $report);

    return $report;
}

function extract_tilda_products(string $html): array
{
    $start = strpos($html, '{"partuid":');
    if ($start === false) return [];

    $braceCount = 0;
    $inString = false;
    $escaped = false;
    $end = -1;
    $len = strlen($html);

    for ($i = $start; $i < $len; $i++) {
        $ch = $html[$i];
        if ($escaped) {
            $escaped = false;
            continue;
        }
        if ($ch === "\\") {
            $escaped = true;
            continue;
        }
        if ($ch === '"') {
            $inString = !$inString;
            continue;
        }
        if (!$inString) {
            if ($ch === "{") $braceCount++;
            if ($ch === "}") {
                $braceCount--;
                if ($braceCount === 0) {
                    $end = $i + 1;
                    break;
                }
            }
        }
    }

    if ($end <= $start) return [];
    $jsonRaw = substr($html, $start, $end - $start);
    $decoded = json_decode($jsonRaw, true);
    if (!is_array($decoded)) return [];
    return isset($decoded["products"]) && is_array($decoded["products"]) ? $decoded["products"] : [];
}

function parse_price($value): int
{
    $clean = preg_replace('/[^\d]/', '', (string)$value);
    $price = intval($clean ?: "0");
    if ($price > 100000000) {
        $price = intval(round($price / 10000));
    }
    return $price;
}

function map_fuel(string $value): string
{
    $v = mb_strtolower($value);
    if (str_contains($v, "дизел") || str_contains($v, "diesel")) return "diesel";
    if (str_contains($v, "гибрид") || str_contains($v, "hybrid")) return "hybrid";
    if (str_contains($v, "электр") || str_contains($v, "electric")) return "electric";
    return "petrol";
}

function normalize_image_url(string $url): string
{
    $src = trim($url);
    if ($src === "") return "";
    if (!str_starts_with($src, "http")) {
        $src = str_starts_with($src, "/") ? "https://da-motors-msk.ru" . $src : "https://da-motors-msk.ru/" . $src;
    }
    $src = preg_replace('#/resize[^/]*/#', '/', $src);
    $src = preg_replace('#/resizeb/x\d+/#', '/', $src);
    return $src ?? "";
}

function map_product_to_car(array $product): ?array
{
    $name = trim((string)($product["title"] ?? $product["name"] ?? ""));
    if ($name === "") return null;

    $brands = ["Mercedes-Benz", "BMW", "Audi", "Porsche", "MINI", "Volvo", "Bentley", "Range Rover"];
    $brand = "";
    foreach ($brands as $b) {
        if (mb_stripos($name, $b) !== false) {
            $brand = $b;
            break;
        }
    }
    if ($brand === "") {
        $parts = preg_split('/\s+/', $name);
        $brand = $parts[0] ?? "Unknown";
    }

    $model = trim(preg_replace('/' . preg_quote($brand, '/') . '/iu', '', $name) ?? "");
    if ($model === "") $model = $name;

    $descr = (string)($product["descr"] ?? $product["description"] ?? "");
    $plainDescr = preg_replace('/<[^>]+>/', ' ', $descr) ?? "";

    preg_match('/(20\d{2})/', $name . " " . $plainDescr, $yearMatch);
    $year = isset($yearMatch[1]) ? intval($yearMatch[1]) : intval(date("Y"));

    preg_match('/(\d+(?:\.\d+)?)\s*л/ui', $plainDescr, $engineMatch);
    preg_match('/(\d+)\s*л\.с/ui', $plainDescr, $powerMatch);
    preg_match('/(Бензин|Дизель|Гибрид|Электрический|Petrol|Diesel|Hybrid|Electric)/ui', $plainDescr, $fuelMatch);

    $price = parse_price($product["price"] ?? ($product["data-product-price-def"] ?? 0));
    $seed = (string)($product["id"] ?? $product["uid"] ?? ($brand . "-" . $model . "-" . $year));
    $vin = trim((string)($product["vin"] ?? $product["data-product-vin"] ?? ("VIN" . substr(md5($seed), 0, 14))));

    $photos = [];
    if (isset($product["gallery"])) {
        if (is_string($product["gallery"])) {
            $decodedGallery = json_decode($product["gallery"], true);
            if (is_array($decodedGallery)) {
                foreach ($decodedGallery as $item) {
                    $src = is_string($item) ? $item : (is_array($item) ? ($item["img"] ?? "") : "");
                    $norm = normalize_image_url((string)$src);
                    if ($norm !== "") $photos[] = $norm;
                }
            } else {
                $norm = normalize_image_url($product["gallery"]);
                if ($norm !== "") $photos[] = $norm;
            }
        } elseif (is_array($product["gallery"])) {
            foreach ($product["gallery"] as $item) {
                $src = is_string($item) ? $item : (is_array($item) ? ($item["img"] ?? "") : "");
                $norm = normalize_image_url((string)$src);
                if ($norm !== "") $photos[] = $norm;
            }
        }
    }
    $fallback = normalize_image_url((string)($product["data-product-img"] ?? ""));
    if ($fallback !== "") $photos[] = $fallback;
    $photos = array_values(array_unique(array_filter($photos)));

    $fuelRaw = isset($fuelMatch[1]) ? (string)$fuelMatch[1] : "";
    $fuelType = map_fuel($fuelRaw);

    return [
        "id" => "donor-api-" . $seed,
        "brand" => $brand,
        "model" => $model,
        "trim" => $model . " Base",
        "year" => $year,
        "price" => $price,
        "mileage" => 0,
        "status" => "in_stock",
        "vin" => $vin,
        "color" => "Unknown",
        "fuelType" => $fuelType,
        "engineVolume" => isset($engineMatch[1]) ? floatval($engineMatch[1]) : 2,
        "power" => isset($powerMatch[1]) ? intval($powerMatch[1]) : 200,
        "transmission" => "automatic",
        "drivetrain" => "awd",
        "bodyType" => "sedan",
        "photos" => $photos,
        "specs" => [
            "engine" => [
                "Тип" => $fuelRaw !== "" ? $fuelRaw : "Бензин",
                "Объём" => isset($engineMatch[1]) ? ($engineMatch[1] . " л") : "2.0 л",
                "Мощность" => isset($powerMatch[1]) ? ($powerMatch[1] . " л.с.") : "200 л.с.",
            ],
            "transmission" => ["Тип" => "Автоматическая", "Привод" => "Полный"],
            "suspension" => new stdClass(),
            "safety" => [],
            "comfort" => [],
            "multimedia" => [],
            "additional" => [],
        ],
    ];
}

function car_key(array $car): string
{
    $vin = (string)($car["vin"] ?? "");
    $brand = (string)($car["brand"] ?? "");
    $model = (string)($car["model"] ?? "");
    $year = (string)($car["year"] ?? "");
    return $vin . "|" . $brand . "|" . $model . "|" . $year;
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

