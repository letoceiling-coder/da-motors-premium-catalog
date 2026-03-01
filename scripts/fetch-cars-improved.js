import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DONOR_URL = 'https://da-motors-msk.ru/catalog';

// Функция для поиска данных в разных форматах
function extractCarData($, element) {
  const $el = $(element);
  const data = {};
  
  // Попытка найти данные в data-атрибутах
  data.brand = $el.attr('data-brand') || $el.find('[data-brand]').attr('data-brand') || '';
  data.model = $el.attr('data-model') || $el.find('[data-model]').attr('data-model') || '';
  data.price = $el.attr('data-price') || $el.find('[data-price]').attr('data-price') || '';
  data.year = $el.attr('data-year') || $el.find('[data-year]').attr('data-year') || '';
  data.status = $el.attr('data-status') || $el.find('[data-status]').attr('data-status') || '';
  
  // Поиск в тексте
  if (!data.brand) {
    const brandText = $el.find('.brand, .car-brand, h2, h3').first().text();
    // Попытка извлечь марку из текста
    const brandMatch = brandText.match(/(Mercedes|BMW|Audi|Porsche|MINI|Lexus|Range Rover|Land Rover|Bentley|Rolls-Royce|Ferrari|Lamborghini|Maserati|Jaguar|Volvo|Tesla)/i);
    if (brandMatch) data.brand = brandMatch[1];
  }
  
  // Поиск цены в разных форматах
  if (!data.price) {
    const priceText = $el.text();
    const priceMatch = priceText.match(/(\d{1,3}(?:\s?\d{3})*)\s*[₽руб]/i) || 
                      priceText.match(/цена[:\s]*(\d{1,3}(?:\s?\d{3})*)/i);
    if (priceMatch) data.price = priceMatch[1].replace(/\s/g, '');
  }
  
  // Поиск года
  if (!data.year) {
    const yearMatch = $el.text().match(/(20\d{2})/);
    if (yearMatch) data.year = yearMatch[1];
  }
  
  // Поиск изображений
  data.images = [];
  $el.find('img').each((i, img) => {
    let src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
    if (src) {
      if (!src.startsWith('http')) {
        src = src.startsWith('/') ? `https://da-motors-msk.ru${src}` : `https://da-motors-msk.ru/${src}`;
      }
      if (!src.includes('placeholder') && !src.includes('logo')) {
        data.images.push(src);
      }
    }
  });
  
  return data;
}

// Функция для парсинга всех возможных селекторов
async function fetchCarsFromDonor() {
  try {
    console.log('Загрузка данных с сайта донора...');
    const response = await fetch(DONOR_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const cars = [];
    const processedIds = new Set();
    
    // Попытка найти JSON данные в скриптах
    $('script').each((i, script) => {
      const scriptContent = $(script).html() || '';
      // Поиск JSON данных об автомобилях
      const jsonMatch = scriptContent.match(/cars\s*[:=]\s*(\[[\s\S]*?\])/i) ||
                       scriptContent.match(/data\s*[:=]\s*(\[[\s\S]*?\])/i) ||
                       scriptContent.match(/products\s*[:=]\s*(\[[\s\S]*?\])/i);
      
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          if (Array.isArray(jsonData)) {
            jsonData.forEach((item, index) => {
              if (item && (item.brand || item.model || item.name)) {
                const car = convertJsonToCar(item, index);
                if (car && !processedIds.has(car.id)) {
                  cars.push(car);
                  processedIds.add(car.id);
                }
              }
            });
          }
        } catch (e) {
          console.log('Не удалось распарсить JSON из скрипта');
        }
      }
    });
    
    // Если JSON не найден, пытаемся парсить HTML
    if (cars.length === 0) {
      console.log('JSON данные не найдены, парсинг HTML...');
      
      // Различные возможные селекторы для карточек автомобилей
      const selectors = [
        '.car-card',
        '.catalog-item',
        '.product-card',
        '[data-car]',
        '.card',
        '.item',
        'article',
        '.car',
        '.vehicle',
        'div[class*="car"]',
        'div[class*="item"]',
        'div[class*="card"]',
      ];
      
      for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`Найдено элементов с селектором "${selector}": ${elements.length}`);
          
          elements.each((index, element) => {
            try {
              const carData = extractCarData($, element);
              
              if (carData.brand && carData.price) {
                const car = convertDataToCar(carData, index);
                if (car && !processedIds.has(car.id)) {
                  cars.push(car);
                  processedIds.add(car.id);
                }
              }
            } catch (error) {
              console.error(`Ошибка при парсинге элемента:`, error.message);
            }
          });
          
          if (cars.length > 0) break;
        }
      }
    }
    
    console.log(`Найдено автомобилей: ${cars.length}`);
    
    // Выводим пример данных для отладки
    if (cars.length > 0) {
      console.log('Пример первого автомобиля:', JSON.stringify(cars[0], null, 2));
    } else {
      console.log('HTML структура страницы (первые 2000 символов):');
      console.log($('body').html()?.substring(0, 2000));
    }
    
    return cars;
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    return [];
  }
}

// Конвертация JSON данных в формат Car
function convertJsonToCar(item, index) {
  const brand = item.brand || item.manufacturer || item.make || 'Unknown';
  const model = item.model || item.name?.split(' ')[1] || 'Unknown';
  const price = parseInt(item.price || item.cost || 0, 10);
  const year = parseInt(item.year || item.year_production || new Date().getFullYear(), 10);
  
  if (!brand || brand === 'Unknown' || !model || model === 'Unknown' || price <= 0) {
    return null;
  }
  
  return createCarObject({
    brand,
    model,
    trim: item.trim || item.variant || '',
    price,
    year,
    mileage: parseInt(item.mileage || item.km || 0, 10),
    status: mapStatus(item.status || item.availability || 'in_stock'),
    color: item.color || 'Unknown',
    images: item.images || item.photos || item.image ? [].concat(item.images || item.photos || item.image).filter(Boolean) : [],
    fuelType: mapFuelType(item.fuel || item.fuelType || 'petrol'),
    transmission: mapTransmission(item.transmission || item.gearbox || 'automatic'),
    drivetrain: mapDrivetrain(item.drivetrain || item.drive || 'awd'),
    bodyType: mapBodyType(item.bodyType || item.body || 'sedan'),
    engineVolume: parseFloat(item.engineVolume || item.engine || 2.0),
    power: parseInt(item.power || item.horsepower || 200, 10),
  }, index);
}

// Конвертация данных из HTML в формат Car
function convertDataToCar(data, index) {
  const brand = data.brand || 'Unknown';
  const model = data.model || 'Unknown';
  const price = parseInt(data.price || '0', 10);
  const year = parseInt(data.year || new Date().getFullYear(), 10);
  
  if (brand === 'Unknown' || model === 'Unknown' || price <= 0) {
    return null;
  }
  
  return createCarObject({
    brand,
    model,
    trim: '',
    price,
    year,
    mileage: 0,
    status: mapStatus(data.status || 'in_stock'),
    color: 'Unknown',
    images: data.images || [],
    fuelType: 'petrol',
    transmission: 'automatic',
    drivetrain: 'awd',
    bodyType: 'sedan',
    engineVolume: 2.0,
    power: 200,
  }, index);
}

// Создание объекта Car
function createCarObject(data, index) {
  const vin = generateVIN(data.brand, data.model, data.year);
  
  return {
    id: `donor-${Date.now()}-${index}`,
    brand: data.brand,
    model: data.model,
    trim: data.trim || `${data.model} Base`,
    year: data.year,
    price: data.price,
    mileage: data.mileage,
    status: data.status,
    vin: vin,
    color: data.color,
    fuelType: data.fuelType,
    engineVolume: data.engineVolume,
    power: data.power,
    transmission: data.transmission,
    drivetrain: data.drivetrain,
    bodyType: data.bodyType,
    photos: data.images.length > 0 ? data.images : getDefaultPhotos(),
    specs: {
      engine: {
        'Тип': getFuelTypeLabel(data.fuelType),
        'Объём': data.engineVolume > 0 ? `${data.engineVolume} л` : 'N/A',
        'Мощность': `${data.power} л.с.`,
      },
      transmission: {
        'Тип': getTransmissionLabel(data.transmission),
        'Привод': getDrivetrainLabel(data.drivetrain),
      },
      suspension: {},
      safety: [],
      comfort: [],
      multimedia: [],
      additional: [],
    },
  };
}

// Вспомогательные функции
function generateVIN(brand, model, year) {
  const prefix = brand.substring(0, 3).toUpperCase().padEnd(3, 'X');
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}${year}${random}`;
}

function getDefaultPhotos() {
  return [
    'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80',
    'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
    'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&q=80',
  ];
}

function mapStatus(status) {
  const statusLower = (status || '').toLowerCase();
  if (statusLower.includes('наличи') || statusLower.includes('stock')) return 'in_stock';
  if (statusLower.includes('заказ') || statusLower.includes('order')) return 'on_order';
  if (statusLower.includes('пути') || statusLower.includes('transit')) return 'in_transit';
  return 'in_stock';
}

function mapFuelType(fuel) {
  const fuelLower = (fuel || '').toLowerCase();
  if (fuelLower.includes('дизел') || fuelLower.includes('diesel')) return 'diesel';
  if (fuelLower.includes('гибрид') || fuelLower.includes('hybrid')) return 'hybrid';
  if (fuelLower.includes('электр') || fuelLower.includes('electric')) return 'electric';
  return 'petrol';
}

function mapTransmission(transmission) {
  const transLower = (transmission || '').toLowerCase();
  if (transLower.includes('механ') || transLower.includes('manual')) return 'manual';
  if (transLower.includes('робот') || transLower.includes('robot')) return 'robot';
  return 'automatic';
}

function mapDrivetrain(drivetrain) {
  const driveLower = (drivetrain || '').toLowerCase();
  if (driveLower.includes('задн') || driveLower.includes('rwd') || driveLower.includes('rear')) return 'rwd';
  if (driveLower.includes('передн') || driveLower.includes('fwd') || driveLower.includes('front')) return 'fwd';
  return 'awd';
}

function mapBodyType(bodyType) {
  const bodyLower = (bodyType || '').toLowerCase();
  if (bodyLower.includes('седан') || bodyLower.includes('sedan')) return 'sedan';
  if (bodyLower.includes('внедорож') || bodyLower.includes('suv')) return 'suv';
  if (bodyLower.includes('купе') || bodyLower.includes('coupe')) return 'coupe';
  if (bodyLower.includes('хэтч') || bodyLower.includes('hatchback')) return 'hatchback';
  if (bodyLower.includes('кабриолет') || bodyLower.includes('convertible')) return 'convertible';
  if (bodyLower.includes('универсал') || bodyLower.includes('wagon')) return 'wagon';
  return 'sedan';
}

function getFuelTypeLabel(fuelType) {
  const labels = {
    petrol: 'Бензиновый',
    diesel: 'Дизельный',
    hybrid: 'Гибридный',
    electric: 'Электрический',
  };
  return labels[fuelType] || 'Бензиновый';
}

function getTransmissionLabel(transmission) {
  const labels = {
    automatic: 'Автоматическая',
    manual: 'Механическая',
    robot: 'Роботизированная',
  };
  return labels[transmission] || 'Автоматическая';
}

function getDrivetrainLabel(drivetrain) {
  const labels = {
    awd: 'Полный',
    rwd: 'Задний',
    fwd: 'Передний',
  };
  return labels[drivetrain] || 'Полный';
}

// Функция для добавления автомобилей в файл
async function addCarsToCatalog() {
  const donorCars = await fetchCarsFromDonor();
  
  if (donorCars.length === 0) {
    console.log('Нет данных для добавления. Возможно, нужно обновить селекторы или сайт использует динамическую загрузку данных.');
    console.log('Попробуйте использовать Puppeteer для парсинга динамического контента.');
    return;
  }
  
  // Читаем существующий файл
  const carsFilePath = path.join(__dirname, '../src/data/cars.ts');
  let carsFileContent = fs.readFileSync(carsFilePath, 'utf-8');
  
  // Находим закрывающую скобку массива
  const arrayEndMatch = carsFileContent.match(/(\s+)(\},\s*)\];/);
  
  if (arrayEndMatch) {
    const indent = '  '; // 2 пробела для отступа
    const newCarsCode = donorCars.map((car) => {
      return formatCarAsCode(car, indent);
    }).join(',\n');
    
    // Вставляем новые автомобили перед закрывающей скобкой массива
    const updatedContent = carsFileContent.replace(
      /(\s+)(\},\s*)\];/,
      `$1$2,\n${indent}${newCarsCode}\n];`
    );
    
    fs.writeFileSync(carsFilePath, updatedContent, 'utf-8');
    console.log(`✅ Добавлено ${donorCars.length} автомобилей в каталог.`);
  } else {
    console.error('Не удалось найти конец массива cars в файле для вставки данных.');
  }
}

// Форматирование объекта Car в код TypeScript
function formatCarAsCode(car, indent) {
  const photosCode = car.photos.map(p => `'${p.replace(/'/g, "\\'")}'`).join(', ');
  const engineSpecs = Object.entries(car.specs.engine)
    .map(([k, v]) => `'${k}': '${String(v).replace(/'/g, "\\'")}'`)
    .join(', ');
  const transmissionSpecs = Object.entries(car.specs.transmission)
    .map(([k, v]) => `'${k}': '${String(v).replace(/'/g, "\\'")}'`)
    .join(', ');
  
  return `{
    id: '${car.id.replace(/'/g, "\\'")}',
    brand: '${car.brand.replace(/'/g, "\\'")}',
    model: '${car.model.replace(/'/g, "\\'")}',
    trim: '${car.trim.replace(/'/g, "\\'")}',
    year: ${car.year},
    price: ${car.price},
    mileage: ${car.mileage},
    status: '${car.status}',
    vin: '${car.vin}',
    color: '${car.color.replace(/'/g, "\\'")}',
    fuelType: '${car.fuelType}',
    engineVolume: ${car.engineVolume},
    power: ${car.power},
    transmission: '${car.transmission}',
    drivetrain: '${car.drivetrain}',
    bodyType: '${car.bodyType}',
    photos: [${photosCode}],
    specs: {
      engine: { ${engineSpecs} },
      transmission: { ${transmissionSpecs} },
      suspension: {},
      safety: [],
      comfort: [],
      multimedia: [],
      additional: [],
    },
  }`;
}

// Запуск скрипта
addCarsToCatalog().catch(console.error);
