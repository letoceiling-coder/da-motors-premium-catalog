import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DONOR_URL = 'https://da-motors-msk.ru/catalog';

// Маппинг статусов с сайта донора на наш формат
const statusMap = {
  'В НАЛИЧИИ': 'in_stock',
  'ПОД ЗАКАЗ': 'on_order',
  'В ПУТИ': 'in_transit',
  'ВСЕ МАШИНЫ': null,
};

// Маппинг типов топлива
const fuelTypeMap = {
  'бензин': 'petrol',
  'дизель': 'diesel',
  'гибрид': 'hybrid',
  'электро': 'electric',
};

// Маппинг коробок передач
const transmissionMap = {
  'автомат': 'automatic',
  'механика': 'manual',
  'робот': 'robot',
};

// Маппинг приводов
const drivetrainMap = {
  'передний': 'fwd',
  'задний': 'rwd',
  'полный': 'awd',
  '4wd': 'awd',
  'awd': 'awd',
};

// Маппинг типов кузова
const bodyTypeMap = {
  'седан': 'sedan',
  'внедорожник': 'suv',
  'купе': 'coupe',
  'хэтчбек': 'hatchback',
  'кабриолет': 'convertible',
  'универсал': 'wagon',
};

// Функция для нормализации данных
function normalizeValue(value, map, defaultValue) {
  if (!value) return defaultValue;
  const normalized = value.toLowerCase().trim();
  for (const [key, val] of Object.entries(map)) {
    if (normalized.includes(key.toLowerCase())) {
      return val;
    }
  }
  return defaultValue;
}

// Функция для парсинга цены
function parsePrice(priceText) {
  if (!priceText) return 0;
  const cleaned = priceText.replace(/\s/g, '').replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

// Функция для парсинга года
function parseYear(yearText) {
  if (!yearText) return new Date().getFullYear();
  const year = parseInt(yearText, 10);
  if (year > 1900 && year <= new Date().getFullYear() + 1) {
    return year;
  }
  return new Date().getFullYear();
}

// Функция для парсинга пробега
function parseMileage(mileageText) {
  if (!mileageText) return 0;
  const cleaned = mileageText.replace(/\s/g, '').replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

// Функция для генерации VIN
function generateVIN(brand, model, year) {
  const prefix = brand.substring(0, 3).toUpperCase().padEnd(3, 'X');
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}${year}${random}`;
}

// Функция для получения фотографий
function getPhotos(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    // Используем placeholder изображения
    return [
      'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80',
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
      'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&q=80',
    ];
  }
  return imageUrls;
}

async function fetchCarsFromDonor() {
  try {
    console.log('Загрузка данных с сайта донора...');
    const response = await fetch(DONOR_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const cars = [];
    
    // Попытка найти карточки автомобилей
    // Это примерные селекторы, их нужно будет адаптировать под реальную структуру сайта
    $('.car-card, .catalog-item, [data-car], .product-card').each((index, element) => {
      try {
        const $el = $(element);
        
        // Извлечение данных (селекторы нужно адаптировать под реальную структуру)
        const brand = $el.find('.brand, [data-brand], .car-brand').text().trim() || 'Unknown';
        const model = $el.find('.model, [data-model], .car-model').text().trim() || 'Unknown';
        const trim = $el.find('.trim, [data-trim], .car-trim').text().trim() || '';
        const priceText = $el.find('.price, [data-price], .car-price').text().trim();
        const yearText = $el.find('.year, [data-year], .car-year').text().trim();
        const mileageText = $el.find('.mileage, [data-mileage], .car-mileage').text().trim();
        const statusText = $el.find('.status, [data-status], .car-status').text().trim();
        const color = $el.find('.color, [data-color], .car-color').text().trim() || 'Unknown';
        
        // Извлечение изображений
        const images = [];
        $el.find('img').each((i, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src');
          if (src && !src.includes('placeholder')) {
            images.push(src.startsWith('http') ? src : `https://da-motors-msk.ru${src}`);
          }
        });
        
        // Парсинг характеристик
        const specsText = $el.find('.specs, .characteristics, [data-specs]').text();
        const fuelType = normalizeValue(specsText, fuelTypeMap, 'petrol');
        const transmission = normalizeValue(specsText, transmissionMap, 'automatic');
        const drivetrain = normalizeValue(specsText, drivetrainMap, 'awd');
        const bodyType = normalizeValue(specsText, bodyTypeMap, 'sedan');
        
        // Парсинг двигателя
        const engineMatch = specsText.match(/(\d+\.?\d*)\s*л/);
        const engineVolume = engineMatch ? parseFloat(engineMatch[1]) : 2.0;
        
        const powerMatch = specsText.match(/(\d+)\s*л\.с\./);
        const power = powerMatch ? parseInt(powerMatch[1], 10) : 200;
        
        const price = parsePrice(priceText);
        const year = parseYear(yearText);
        const mileage = parseMileage(mileageText);
        const status = statusMap[statusText.toUpperCase()] || 'in_stock';
        
        if (brand !== 'Unknown' && model !== 'Unknown' && price > 0) {
          const car = {
            id: `donor-${Date.now()}-${index}`,
            brand: brand,
            model: model,
            trim: trim || `${model} Base`,
            year: year,
            price: price,
            mileage: mileage,
            status: status,
            vin: generateVIN(brand, model, year),
            color: color,
            fuelType: fuelType,
            engineVolume: engineVolume,
            power: power,
            transmission: transmission,
            drivetrain: drivetrain,
            bodyType: bodyType,
            photos: getPhotos(images),
            specs: {
              engine: {
                'Тип': fuelType === 'electric' ? 'Электрический' : fuelType === 'hybrid' ? 'Гибридный' : fuelType === 'diesel' ? 'Дизельный' : 'Бензиновый',
                'Объём': engineVolume > 0 ? `${engineVolume} л` : 'N/A',
                'Мощность': `${power} л.с.`,
              },
              transmission: {
                'Тип': transmission === 'automatic' ? 'Автоматическая' : transmission === 'manual' ? 'Механическая' : 'Роботизированная',
                'Привод': drivetrain === 'awd' ? 'Полный' : drivetrain === 'rwd' ? 'Задний' : 'Передний',
              },
              suspension: {},
              safety: [],
              comfort: [],
              multimedia: [],
              additional: [],
            },
          };
          
          cars.push(car);
        }
      } catch (error) {
        console.error(`Ошибка при парсинге элемента ${index}:`, error.message);
      }
    });
    
    console.log(`Найдено автомобилей: ${cars.length}`);
    
    if (cars.length === 0) {
      console.warn('Не удалось найти автомобили. Возможно, нужно обновить селекторы.');
      console.log('Попробуйте проверить структуру HTML на сайте донора.');
    }
    
    return cars;
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    return [];
  }
}

// Функция для добавления автомобилей в существующий файл
async function addCarsToCatalog() {
  const donorCars = await fetchCarsFromDonor();
  
  if (donorCars.length === 0) {
    console.log('Нет данных для добавления.');
    return;
  }
  
  // Читаем существующий файл
  const carsFilePath = path.join(__dirname, '../src/data/cars.ts');
  let carsFileContent = fs.readFileSync(carsFilePath, 'utf-8');
  
  // Находим массив cars и добавляем новые автомобили
  const carsArrayMatch = carsFileContent.match(/export const cars: Car\[\] = \[([\s\S]*?)\];/);
  
  if (carsArrayMatch) {
    const existingCars = carsArrayMatch[1];
    const newCarsJson = donorCars.map(car => {
      return JSON.stringify(car, null, 2)
        .replace(/"([^"]+)":/g, '$1:')
        .replace(/"/g, "'");
    }).join(',\n  ');
    
    const updatedCars = existingCars.trim() + (existingCars.trim() ? ',\n  ' : '') + newCarsJson;
    carsFileContent = carsFileContent.replace(
      /export const cars: Car\[\] = \[([\s\S]*?)\];/,
      `export const cars: Car[] = [\n  ${updatedCars}\n];`
    );
    
    // Сохраняем обновленный файл
    fs.writeFileSync(carsFilePath, carsFileContent, 'utf-8');
    console.log(`Добавлено ${donorCars.length} автомобилей в каталог.`);
  } else {
    console.error('Не удалось найти массив cars в файле.');
  }
}

// Запуск скрипта
addCarsToCatalog().catch(console.error);
