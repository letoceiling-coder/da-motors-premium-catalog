import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");
const carsPath = path.resolve(dataDir, "cars.json");
const reportPath = path.resolve(dataDir, "catalog-sync-report.json");

const API_ENDPOINTS = [
  {
    url: "https://store.tildaapi.com/api/getproductslist/",
    params: { storepartuid: "967787820261", recid: "853371680", getparts: "true", getoptions: "true", slice: "1", size: "100" },
  },
  {
    url: "https://store.tildaapi.com/api/getproductslist/",
    params: { storepartuid: "756428026962", recid: "867855191", getparts: "true", getoptions: "true", slice: "1", size: "100" },
  },
  {
    url: "https://store.tildaapi.com/api/getproductslist/",
    params: { storepartuid: "726936299082", recid: "870671208", getparts: "true", getoptions: "true", slice: "1", size: "100" },
  },
];

function parsePrice(priceText) {
  if (!priceText) return 0;
  const cleaned = String(priceText).replace(/\s/g, "").replace(/[^\d]/g, "");
  let value = parseInt(cleaned, 10) || 0;
  if (value > 100000000) value = Math.round(value / 10000);
  return value;
}

function mapFuel(fuelRaw = "") {
  const f = fuelRaw.toLowerCase();
  if (f.includes("дизел") || f.includes("diesel")) return "diesel";
  if (f.includes("гибрид") || f.includes("hybrid")) return "hybrid";
  if (f.includes("электр") || f.includes("electric")) return "electric";
  return "petrol";
}

function stableHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").toUpperCase();
}

function generateVIN(brand, model, year, seed) {
  const prefix = (brand || "CAR").slice(0, 3).toUpperCase().padEnd(3, "X");
  return `${prefix}${year}${stableHash(`${brand}|${model}|${seed}`).slice(0, 8)}`;
}

function extractImages(product) {
  const images = [];

  const maybePush = (srcRaw) => {
    if (!srcRaw) return;
    let src = String(srcRaw);
    if (!src.startsWith("http")) {
      src = src.startsWith("/") ? "https://da-motors-msk.ru" + src : "https://da-motors-msk.ru/" + src;
    }
    src = src.replace(/\/resize[^/]*\//g, "/").replace(/\/resizeb\/x\d+\//g, "/");
    if (!images.includes(src)) images.push(src);
  };

  if (product.gallery) {
    if (Array.isArray(product.gallery)) {
      product.gallery.forEach((i) => maybePush(typeof i === "string" ? i : i?.img));
    } else if (typeof product.gallery === "string") {
      try {
        const parsed = JSON.parse(product.gallery);
        if (Array.isArray(parsed)) parsed.forEach((i) => maybePush(typeof i === "string" ? i : i?.img));
        else maybePush(product.gallery);
      } catch {
        maybePush(product.gallery);
      }
    }
  }

  if (Array.isArray(product.editions)) {
    product.editions.forEach((e) => maybePush(e?.img));
  }

  maybePush(product["data-product-img"]);
  return images.filter(Boolean);
}

function parseCar(product) {
  const name = product.title || product.name || "";
  if (!name) return null;

  const knownBrands = ["Mercedes-Benz", "BMW", "Audi", "Porsche", "MINI", "Volvo", "Bentley", "Range Rover"];
  let brand = knownBrands.find((b) => name.toLowerCase().includes(b.toLowerCase())) || "";
  if (!brand) {
    const firstWord = name.split(" ")[0] || "";
    brand = firstWord;
  }

  let model = name.replace(new RegExp(brand, "ig"), "").trim();
  if (!model) model = name;

  const descr = (product.descr || product.description || "").replace(/<[^>]+>/g, " ");
  const yearMatch = `${name} ${descr}`.match(/(20\d{2})/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  const engineMatch = descr.match(/(\d+(?:\.\d+)?)\s*л/i);
  const powerMatch = descr.match(/(\d+)\s*л\.с/i);
  const fuelMatch = descr.match(/(Бензин|Дизель|Гибрид|Электрический|Petrol|Diesel|Hybrid|Electric)/i);

  const idSeed = product.id || product.uid || `${brand}-${model}-${year}`;
  const vin = product.vin || product["data-product-vin"] || generateVIN(brand, model, year, String(idSeed));
  const price = parsePrice(product.price || product["data-product-price-def"] || 0);
  const photos = extractImages(product);

  return {
    id: `donor-api-${idSeed}`,
    brand,
    model,
    trim: `${model} Base`,
    year,
    price,
    mileage: 0,
    status: "in_stock",
    vin,
    color: "Unknown",
    fuelType: mapFuel(fuelMatch?.[1] || ""),
    engineVolume: engineMatch ? parseFloat(engineMatch[1]) : 2,
    power: powerMatch ? parseInt(powerMatch[1], 10) : 200,
    transmission: "automatic",
    drivetrain: "awd",
    bodyType: "sedan",
    photos,
    specs: {
      engine: {
        "Тип": fuelMatch?.[1] || "Бензин",
        "Объём": engineMatch ? `${engineMatch[1]} л` : "2.0 л",
        "Мощность": powerMatch ? `${powerMatch[1]} л.с.` : "200 л.с.",
      },
      transmission: { "Тип": "Автоматическая", "Привод": "Полный" },
      suspension: {},
      safety: [],
      comfort: [],
      multimedia: [],
      additional: [],
    },
  };
}

function extractProductsFromHtml(html) {
  const startIdx = html.indexOf('{"partuid":');
  if (startIdx === -1) return [];

  let braces = 0;
  let inString = false;
  let escape = false;
  let endIdx = -1;

  for (let i = startIdx; i < html.length; i++) {
    const ch = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === "{") braces++;
      if (ch === "}") {
        braces--;
        if (braces === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
  }

  if (endIdx <= startIdx) return [];
  try {
    const data = JSON.parse(html.slice(startIdx, endIdx));
    return Array.isArray(data.products) ? data.products : [];
  } catch {
    return [];
  }
}

function carKey(car) {
  return `${car.vin || ""}|${car.brand}|${car.model}|${car.year}`;
}

async function fetchCars() {
  const all = [];

  for (const endpoint of API_ENDPOINTS) {
    const url = new URL(endpoint.url);
    Object.entries(endpoint.params).forEach(([k, v]) => url.searchParams.set(k, v));
    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" },
    });
    if (!response.ok) continue;
    const html = await response.text();
    const products = extractProductsFromHtml(html);
    products.forEach((product) => {
      const car = parseCar(product);
      if (car) all.push(car);
    });
  }

  const map = new Map();
  for (const car of all) map.set(carKey(car), car);
  return Array.from(map.values());
}

function diffCars(prevCars, nextCars) {
  const prev = new Map(prevCars.map((c) => [carKey(c), c]));
  const next = new Map(nextCars.map((c) => [carKey(c), c]));

  const added = [];
  const removed = [];
  const updated = [];

  for (const [k, c] of next.entries()) {
    const old = prev.get(k);
    if (!old) {
      added.push(c);
      continue;
    }
    if (old.price !== c.price || old.status !== c.status || old.mileage !== c.mileage) {
      updated.push({
        key: k,
        brand: c.brand,
        model: c.model,
        oldPrice: old.price,
        newPrice: c.price,
      });
    }
  }

  for (const [k, c] of prev.entries()) {
    if (!next.has(k)) removed.push(c);
  }

  return { added, updated, removed };
}

function loadExistingCars() {
  if (!fs.existsSync(carsPath)) return [];
  try {
    const raw = fs.readFileSync(carsPath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.cars)) return parsed.cars;
    return [];
  } catch {
    return [];
  }
}

async function main() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const prevCars = loadExistingCars();
  const nextCars = await fetchCars();
  const diff = diffCars(prevCars, nextCars);

  fs.writeFileSync(carsPath, JSON.stringify(nextCars, null, 2), "utf8");

  const report = {
    ok: true,
    updatedAt: new Date().toISOString(),
    summary: {
      total: nextCars.length,
      added: diff.added.length,
      updated: diff.updated.length,
      removed: diff.removed.length,
    },
    details: {
      added: diff.added.slice(0, 10).map((c) => `${c.brand} ${c.model}`),
      updated: diff.updated.slice(0, 10),
      removed: diff.removed.slice(0, 10).map((c) => `${c.brand} ${c.model}`),
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  process.stdout.write(JSON.stringify(report));
}

main().catch((error) => {
  process.stdout.write(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});

