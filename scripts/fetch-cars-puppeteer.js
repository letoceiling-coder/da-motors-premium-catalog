import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DONOR_URL = 'https://da-motors-msk.ru/catalog';

// Вспомогательные функции маппинга (те же, что в предыдущем скрипте)
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

function parsePrice(priceText) {
  if (!priceText) return 0;
  const cleaned = priceText.replace(/\s/g, '').replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

function parseYear(yearText) {
  if (!yearText) return new Date().getFullYear();
  const year = parseInt(yearText, 10);
  if (year > 1900 && year <= new Date().getFullYear() + 1) {
    return year;
  }
  return new Date().getFullYear();
}

async function fetchCarsWithPuppeteer() {
  let browser;
  try {
    console.log('Запуск браузера...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      userDataDir: undefined // Используем временную директорию
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Загрузка страницы каталога...');
    await page.goto(DONOR_URL, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    // Ждем загрузки контента
    console.log('Ожидание загрузки контента...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Ждем появления элементов с автомобилями
    try {
      await page.waitForSelector('.t-item, .t-card, [data-car], article', { timeout: 10000 });
      console.log('Элементы с автомобилями найдены');
    } catch (e) {
      console.log('Элементы не найдены, продолжаем...');
    }
    
    // Дополнительное ожидание для загрузки динамического контента
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Пытаемся найти кнопку "Load more" и кликаем на неё несколько раз
    try {
      for (let i = 0; i < 5; i++) {
        const buttons = await page.$$('button, a, .load-more, [data-load-more]');
        let loadMoreButton = null;
        
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && (text.includes('Load more') || text.includes('Загрузить') || text.includes('Показать'))) {
            loadMoreButton = btn;
            break;
          }
        }
        
        if (loadMoreButton) {
          console.log(`Нажатие на "Load more" (${i + 1})...`);
          await loadMoreButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          break;
        }
      }
    } catch (e) {
      console.log('Кнопка "Load more" не найдена или уже загружено всё');
    }
    
    // Извлекаем данные через Puppeteer для получения реальных изображений
    console.log('Извлечение данных через Puppeteer...');
    
    // Сначала попробуем найти все элементы, которые могут содержать информацию об автомобилях
    const pageInfo = await page.evaluate(() => {
      const info = {
        allElements: document.querySelectorAll('*').length,
        divs: document.querySelectorAll('div').length,
        items: [],
        text: document.body.innerText.substring(0, 5000)
      };
      
      // Ищем элементы с текстом, содержащим марки автомобилей
      const brandKeywords = ['Mercedes', 'BMW', 'Audi', 'Porsche', 'MINI', 'Lexus', 'Range Rover', 'Land Rover'];
      brandKeywords.forEach(brand => {
        const xpath = `//*[contains(text(), '${brand}')]`;
        const result = document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let node;
        while (node = result.iterateNext()) {
          if (node.textContent.includes('₽') || node.textContent.match(/\d{1,3}(?:\s?\d{3})*\s*[₽руб]/)) {
            info.items.push({
              tag: node.tagName,
              className: node.className,
              text: node.textContent.substring(0, 200)
            });
          }
        }
      });
      
      return info;
    });
    
    console.log(`Всего элементов на странице: ${pageInfo.allElements}`);
    console.log(`Div элементов: ${pageInfo.divs}`);
    console.log(`Найдено элементов с марками и ценами: ${pageInfo.items.length}`);
    if (pageInfo.items.length > 0) {
      console.log('Пример элемента:', pageInfo.items[0]);
    }
    
    const cars = await page.evaluate(() => {
      const result = [];
      // Используем правильный селектор для карточек автомобилей из Tilda
      const elements = document.querySelectorAll('.js-product.t-store__card.t-item');
      
      if (elements.length > 0) {
        console.log(`Найдено элементов с автомобилями: ${elements.length}`);
        
        elements.forEach((element, index) => {
            try {
              // Извлекаем название автомобиля
              const nameElement = element.querySelector('.js-store-prod-name, .js-product-name');
              const name = nameElement ? nameElement.textContent.trim() : '';
              
              if (!name) return;
              
              // Парсим марку и модель из названия
              // Сначала проверяем полные названия марок
              let brand = '';
              let model = 'Unknown';
              
              const fullBrands = ['Mercedes-Benz', 'Range Rover', 'Land Rover', 'Rolls-Royce'];
              for (const fullBrand of fullBrands) {
                if (name.toLowerCase().includes(fullBrand.toLowerCase())) {
                  brand = fullBrand;
                  model = name.replace(new RegExp(fullBrand, 'gi'), '').trim().split(/\s+/)[0] || 'Unknown';
                  break;
                }
              }
              
              // Если не нашли полное название, ищем короткие
              if (!brand) {
                const brandMatch = name.match(/(Mercedes|BMW|Audi|Porsche|MINI|Lexus|Bentley|Ferrari|Lamborghini|Maserati|Jaguar|Volvo|Tesla|Toyota|Honda|Nissan|Mazda|Subaru|Infiniti|Acura)/i);
                if (!brandMatch) return;
                
                brand = brandMatch[1];
                // Если марка Mercedes, заменяем на Mercedes-Benz
                if (brand === 'Mercedes') {
                  brand = 'Mercedes-Benz';
                }
                model = name.replace(new RegExp(brandMatch[1], 'gi'), '').trim().split(/\s+/).filter(part => part && part !== '-').join(' ') || 'Unknown';
              }
              
              // Очищаем модель от лишних символов
              model = model.replace(/^[- ]+/, '').replace(/[- ]+$/, '').trim() || 'Unknown';
              
              // Извлекаем цену из data-атрибута
              const priceElement = element.querySelector('.js-product-price');
              let price = 0;
              
              if (priceElement) {
                const priceDef = priceElement.getAttribute('data-product-price-def');
                if (priceDef) {
                  price = parseInt(priceDef, 10);
                } else {
                  const priceText = priceElement.textContent.trim().replace(/\s/g, '');
                  price = parseInt(priceText, 10);
                }
              }
              
              // Если цена не найдена, пробуем найти в тексте
              if (!price || price <= 0) {
                const text = element.textContent || '';
                const priceMatch = text.match(/(\d{1,3}(?:\s?\d{3})*)\s*[₽руб]/i) || 
                                  text.match(/(\d{1,3}(?:\s?\d{3}){2,})\s*/);
                if (priceMatch) {
                  const priceText = priceMatch[1].replace(/\s/g, '');
                  price = parseInt(priceText, 10);
                }
              }
              
              // Извлекаем описание для получения года и характеристик
              const descElement = element.querySelector('.js-store-prod-descr');
              const description = descElement ? descElement.textContent.trim() : '';
              
              // Поиск года в описании или названии
              const yearMatch = (description + ' ' + name).match(/(20\d{2})/);
              const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
              
              // Извлекаем изображения
              const images = [];
              
              // 1. Из data-product-img атрибута
              const productImg = element.getAttribute('data-product-img');
              if (productImg) {
                let src = productImg;
                if (!src.startsWith('http')) {
                  src = src.startsWith('/') ? 'https://da-motors-msk.ru' + src : 'https://da-motors-msk.ru/' + src;
                }
                // Убираем параметры resize
                src = src.replace(/\/resize[^\/]*\//g, '/').replace(/\/resizeb\/x\d+\//g, '/');
                // Фильтруем нежелательные изображения
                if (!src.includes('Mask_group') && !src.includes('contact') && !src.includes('Group_') && 
                    !src.includes('/resize/') && !src.includes('thb.') && !src.includes('thumb')) {
                  if (!images.includes(src)) {
                    images.push(src);
                  }
                }
              }
              
              // 2. Из элементов с background-image (t-store__card__bgimg)
              const bgImgElements = element.querySelectorAll('.t-store__card__bgimg');
              bgImgElements.forEach((bgEl) => {
                // Из data-original
                const dataOriginal = bgEl.getAttribute('data-original');
                if (dataOriginal) {
                  let src = dataOriginal;
                  if (!src.startsWith('http')) {
                    src = src.startsWith('/') ? 'https://da-motors-msk.ru' + src : 'https://da-motors-msk.ru/' + src;
                  }
                  // Убираем параметры resize
                  src = src.replace(/\/resize[^\/]*\//g, '/').replace(/\/resizeb\/x\d+\//g, '/');
                  // Фильтруем нежелательные изображения
                  if (!src.includes('Mask_group') && !src.includes('contact') && !src.includes('Group_') && 
                      !src.includes('/resize/') && !src.includes('thb.') && !src.includes('thumb')) {
                    if (!images.includes(src)) {
                      images.push(src);
                    }
                  }
                }
                
                // Из style background-image
                const style = bgEl.getAttribute('style') || '';
                const bgMatch = style.match(/url\(['"]?([^'"]+)['"]?\)/);
                if (bgMatch) {
                  let src = bgMatch[1];
                  // Убираем кавычки и пробелы
                  src = src.trim().replace(/^['"]|['"]$/g, '');
                  if (!src.startsWith('http')) {
                    src = src.startsWith('/') ? 'https://da-motors-msk.ru' + src : 'https://da-motors-msk.ru/' + src;
                  }
                  // Убираем параметры resize
                  src = src.replace(/\/resize[^\/]*\//g, '/').replace(/\/resizeb\/x\d+\//g, '/');
                  // Фильтруем нежелательные изображения
                  if (!src.includes('Mask_group') && !src.includes('contact') && !src.includes('Group_') && 
                      !src.includes('/resize/') && !src.includes('thb.') && !src.includes('thumb')) {
                    if (!images.includes(src)) {
                      images.push(src);
                    }
                  }
                }
              });
              
              // 3. Из обычных img элементов (fallback)
              const imgElements = element.querySelectorAll('img');
              imgElements.forEach((img) => {
                let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || 
                         img.getAttribute('data-original');
                
                if (src) {
                  if (!src.startsWith('http')) {
                    src = src.startsWith('/') ? 'https://da-motors-msk.ru' + src : 'https://da-motors-msk.ru/' + src;
                  }
                  src = src.replace(/\/resize[^\/]*\//g, '/').replace(/\/resizeb\/x\d+\//g, '/');
                  
                  const excludedPatterns = ['Mask_group', 'contact', 'Group_', '/resize/', 'thb.', 'thumb'];
                  const isExcluded = excludedPatterns.some(pattern => src.toLowerCase().includes(pattern.toLowerCase()));
                  
                  if (!isExcluded && (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp'))) {
                    if (!images.includes(src)) {
                      images.push(src);
                    }
                  }
                }
              });
              
              // Парсим характеристики из описания
              const engineMatch = description.match(/(\d+\.?\d*)\s*л/);
              const powerMatch = description.match(/(\d+)\s*л\.с\./);
              const fuelMatch = description.match(/(Бензин|Дизель|Гибрид|Электрический)/i);
              
              // Поиск статуса
              const statusEl = element.querySelector('.status, [data-status], .badge');
              const statusText = statusEl ? statusEl.textContent : description;
              let status = 'in_stock';
              const statusLower = (statusText || '').toLowerCase();
              if (statusLower.includes('заказ') || statusLower.includes('order')) status = 'on_order';
              else if (statusLower.includes('пути') || statusLower.includes('transit')) status = 'in_transit';
              
              result.push({
                brand,
                model,
                price,
                year,
                status,
                images: images.slice(0, 8), // Максимум 8 изображений
                description,
                engineVolume: engineMatch ? parseFloat(engineMatch[1]) : 2,
                power: powerMatch ? parseInt(powerMatch[1], 10) : 200,
                fuelType: fuelMatch ? (fuelMatch[1].toLowerCase().includes('дизель') ? 'diesel' : 
                                       fuelMatch[1].toLowerCase().includes('гибрид') ? 'hybrid' : 
                                       fuelMatch[1].toLowerCase().includes('электрический') ? 'electric' : 'petrol') : 'petrol',
                index
              });
            } catch (error) {
              console.error('Ошибка при парсинге элемента:', error);
            }
          });
        }
      
      return result;
    });
    
    console.log(`Найдено автомобилей через Puppeteer: ${cars.length}`);
    
    // Преобразуем данные из Puppeteer в формат Car
    let formattedCars = [];
    let fallbackCars = [];
    if (cars.length > 0) {
      formattedCars = cars.map((carData, index) => {
        return {
          id: `donor-${Date.now()}-${carData.index || index}`,
          brand: carData.brand,
          model: carData.model,
          trim: `${carData.model} Base`,
          year: carData.year,
          price: carData.price,
          mileage: 0,
          status: carData.status,
          vin: generateVIN(carData.brand, carData.model, carData.year),
          color: 'Unknown',
          fuelType: 'petrol',
          engineVolume: 2.0,
          power: 200,
          transmission: 'automatic',
          drivetrain: 'awd',
          bodyType: 'sedan',
          photos: carData.images && carData.images.length > 0 ? carData.images : getDefaultPhotos(),
          specs: {
            engine: {
              'Тип': 'Бензиновый',
              'Объём': '2.0 л',
              'Мощность': '200 л.с.',
            },
            transmission: {
              'Тип': 'Автоматическая',
              'Привод': 'Полный',
            },
            suspension: {},
            safety: [],
            comfort: [],
            multimedia: [],
            additional: [],
          },
        };
      });
      
      // Удаляем дубликаты
      const uniqueCars = [];
      const seen = new Set();
      for (const car of formattedCars) {
        const key = `${car.brand}-${car.model}-${car.price}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueCars.push(car);
        }
      }
      formattedCars = uniqueCars;
      console.log(`После удаления дубликатов: ${formattedCars.length} автомобилей`);
    }
    
    // Если не нашли через Puppeteer, пробуем через анализ текста
    let $ = null;
    if (formattedCars.length === 0) {
      console.log('Puppeteer не нашел данные через селекторы, пробуем через анализ текста...');
      
      // Извлекаем все изображения со страницы через Puppeteer
      // Ищем изображения в элементах, которые могут содержать автомобили
      const allImages = await page.evaluate(() => {
        const images = [];
        const imageMap = new Map(); // Для удаления дубликатов
        
        // Ищем изображения в элементах с автомобилями
        const carSelectors = ['.t-item', '.t-card', '.catalog-item', '.product-card', '.car-card', 'article', '[data-car]'];
        
        carSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element) => {
            const imgs = element.querySelectorAll('img');
            imgs.forEach((img) => {
              let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || 
                       img.getAttribute('data-original') || img.getAttribute('data-bg') ||
                       img.getAttribute('data-image') || img.getAttribute('data-img');
              
              if (src) {
                // Преобразуем относительные URL
                if (!src.startsWith('http')) {
                  if (src.startsWith('//')) {
                    src = 'https:' + src;
                  } else if (src.startsWith('/')) {
                    src = 'https://da-motors-msk.ru' + src;
                  } else {
                    src = 'https://da-motors-msk.ru/' + src;
                  }
                }
                
                // Фильтруем только реальные фотографии автомобилей
                const excludedPatterns = [
                  'placeholder', 'logo', 'icon', 'sprite', 'contact', 'Group_', 'Mask_group',
                  'data:image', '/resize/', 'thb.', 'thumb', 'thumbnail', 'small', 'mini',
                  'bg-', 'background', 'pattern', 'decoration', 'border', 'frame'
                ];
                
                const isExcluded = excludedPatterns.some(pattern => src.toLowerCase().includes(pattern.toLowerCase()));
                
                const isCarPhoto = 
                  !isExcluded &&
                  (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp') || 
                   (src.includes('tildacdn.com') && !src.includes('contact') && !src.includes('Group') && !src.includes('Mask')));
                
                // Проверяем размер изображения (обычно фотографии автомобилей больше)
                if (isCarPhoto && img.naturalWidth > 200 && img.naturalHeight > 200) {
                  if (!imageMap.has(src)) {
                    imageMap.set(src, true);
                    images.push(src);
                  }
                }
              }
            });
          });
        });
        
        // Если не нашли в специальных элементах, ищем все изображения
        if (images.length === 0) {
          document.querySelectorAll('img').forEach((img) => {
            let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
            if (src && !src.includes('placeholder') && !src.includes('logo') && !src.includes('icon') && 
                !src.includes('sprite') && !src.includes('contact') && !src.includes('Group_') &&
                (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp'))) {
              if (!src.startsWith('http')) {
                src = src.startsWith('/') ? 'https://da-motors-msk.ru' + src : 'https://da-motors-msk.ru/' + src;
              }
              if (!imageMap.has(src) && img.naturalWidth > 200) {
                imageMap.set(src, true);
                images.push(src);
              }
            }
          });
        }
        
        return images;
      });
      
      console.log(`Найдено изображений на странице: ${allImages.length}`);
      
      // Пробуем найти через анализ текста через Puppeteer
      console.log('Попытка поиска через анализ текста через Puppeteer...');
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log(`Длина текста страницы: ${bodyText.length} символов`);
      
      // Ищем все упоминания марок с ценами - более гибкий поиск
      const carMatches = await page.evaluate(() => {
        const matches = [];
        const brandPattern = /(Mercedes|BMW|Audi|Porsche|MINI|Lexus|Range Rover|Land Rover|Bentley|Rolls-Royce|Ferrari|Lamborghini|Maserati|Jaguar|Volvo|Tesla|Toyota|Honda|Nissan|Mazda|Subaru|Infiniti|Acura|Volkswagen|VW|Hyundai|Kia|Genesis)/gi;
        const text = document.body.innerText;
        let match;
        
        // Ищем все числа, которые могут быть ценами
        const pricePattern = /(\d{1,3}(?:\s?\d{3}){2,})\s*[₽руб]?/gi;
        const prices = [];
        let priceMatch;
        while ((priceMatch = pricePattern.exec(text)) !== null) {
          const price = parseInt(priceMatch[1].replace(/\s/g, ''), 10);
          if (price > 100000 && price < 100000000) {
            prices.push({
              price: price,
              index: priceMatch.index,
              text: text.substring(Math.max(0, priceMatch.index - 200), priceMatch.index + 200)
            });
          }
        }
        
        // Ищем марки рядом с ценами
        while ((match = brandPattern.exec(text)) !== null) {
          const brandIndex = match.index;
          // Ищем ближайшую цену к этой марке
          const nearbyPrice = prices.find(p => Math.abs(p.index - brandIndex) < 500);
          if (nearbyPrice) {
            const context = text.substring(Math.min(brandIndex, nearbyPrice.index), Math.max(brandIndex, nearbyPrice.index) + 200);
            const yearMatch = context.match(/(20\d{2})/);
            const modelMatch = context.match(new RegExp(`${match[1]}\\s+([A-Z0-9\\s-]+)`, 'i'));
            matches.push({
              brand: match[1],
              model: modelMatch ? modelMatch[1].trim().split(/\s+/)[0] : 'Unknown',
              price: nearbyPrice.price,
              year: yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear(),
              context: context.substring(0, 100)
            });
          }
        }
        return matches;
      });
      
      console.log(`Найдено совпадений марок с ценами: ${carMatches.length}`);
      
      if (carMatches.length > 0) {
        // Создаем автомобили из найденных совпадений
        carMatches.forEach((match, index) => {
          const vin = generateVIN(match.brand, match.model, match.year);
          formattedCars.push({
            id: `donor-${Date.now()}-${index}`,
            brand: match.brand,
            model: match.model,
            trim: `${match.model} Base`,
            year: match.year,
            price: match.price,
            mileage: 0,
            status: 'in_stock',
            vin: vin,
            color: 'Unknown',
            fuelType: 'petrol',
            engineVolume: 2.0,
            power: 200,
            transmission: 'automatic',
            drivetrain: 'awd',
            bodyType: 'sedan',
            photos: allImages.length > 0 ? allImages.slice(index % allImages.length, (index % allImages.length) + 3) : getDefaultPhotos(),
            specs: {
              engine: { 'Тип': 'Бензиновый', 'Объём': '2.0 л', 'Мощность': '200 л.с.' },
              transmission: { 'Тип': 'Автоматическая', 'Привод': 'Полный' },
              suspension: {},
              safety: [],
              comfort: [],
              multimedia: [],
              additional: [],
            },
          });
        });
        
        // Удаляем дубликаты
        const uniqueCars = [];
        const seen = new Set();
        for (const car of formattedCars) {
          const key = `${car.brand}-${car.model}-${car.price}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueCars.push(car);
          }
        }
        formattedCars = uniqueCars;
        console.log(`После удаления дубликатов: ${formattedCars.length} автомобилей`);
      }
      
      // Если все еще не нашли, пробуем через Cheerio
      if (formattedCars.length === 0) {
        console.log('Попытка поиска через Cheerio...');
        const html = await page.content();
        $ = cheerio.load(html);
        
        const selectors = [
          '.t-card',
          '.t-item',
          '[data-car]',
          '[data-product]',
          '.catalog-item',
          '.product-card',
          '.car-card',
          'article',
        ];
        
        for (const selector of selectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            console.log(`Найдено элементов с селектором "${selector}": ${elements.length}`);
            
            elements.each((index, element) => {
              try {
                const $el = $(element);
                const text = $el.text();
                
                // Поиск марки
                const brandMatch = text.match(/(Mercedes|BMW|Audi|Porsche|MINI|Lexus|Range Rover|Land Rover|Bentley|Rolls-Royce|Ferrari|Lamborghini|Maserati|Jaguar|Volvo|Tesla|Toyota|Honda|Nissan|Mazda|Subaru|Infiniti|Acura)/i);
                if (!brandMatch) return;
                
                const brand = brandMatch[1];
                
                // Поиск модели (обычно после марки)
                const modelMatch = text.match(new RegExp(`${brand}\\s+([A-Z0-9\\s-]+)`, 'i'));
                const model = modelMatch ? modelMatch[1].trim().split(/\s+/)[0] : 'Unknown';
                
                // Поиск цены
                const priceMatch = text.match(/(\d{1,3}(?:\s?\d{3})*)\s*[₽руб]/i) || 
                                  text.match(/цена[:\s]*(\d{1,3}(?:\s?\d{3})*)/i) ||
                                  text.match(/(\d{1,3}(?:\s?\d{3})*)\s*000\s*[₽руб]/i);
                if (!priceMatch) return;
                
                const price = parsePrice(priceMatch[1]);
                if (price <= 0 || price > 100000000) return;
                
                // Поиск года
                const year = parseYear(text.match(/(20\d{2})/)?.[1]);
                
                // Поиск статуса
                const statusText = $el.find('.status, [data-status], .badge').text() || text;
                const status = mapStatus(statusText);
                
                // Поиск изображений - используем извлеченные через Puppeteer изображения
                const images = [];
                // Ищем изображения в элементе через Cheerio
                $el.find('img').each((i, img) => {
                  let src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src') || 
                           $(img).attr('data-original') || $(img).attr('data-bg');
                  if (src) {
                    if (!src.startsWith('http')) {
                      src = src.startsWith('/') ? `https://da-motors-msk.ru${src}` : `https://da-motors-msk.ru/${src}`;
                    }
                    // Проверяем, есть ли это изображение в списке реальных изображений
                    const realImage = allImages.find(img => img.includes(src.split('/').pop()) || src.includes(img.split('/').pop()));
                    if (realImage) {
                      images.push(realImage);
                    } else if (!src.includes('placeholder') && !src.includes('logo') && !src.includes('icon') && 
                        !src.includes('sprite') && (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp'))) {
                      images.push(src);
                    }
                  }
                });
                
                // Если не нашли изображения в элементе, берем первые доступные из общего списка
                if (images.length === 0 && allImages.length > 0) {
                  images.push(...allImages.slice(0, 3));
                }
                
                // Создание объекта автомобиля
                const car = {
                  id: `donor-${Date.now()}-${index}`,
                  brand: brand,
                  model: model,
                  trim: `${model} Base`,
                  year: year,
                  price: price,
                  mileage: 0,
                  status: status,
                  vin: generateVIN(brand, model, year),
                  color: 'Unknown',
                  fuelType: 'petrol',
                  engineVolume: 2.0,
                  power: 200,
                  transmission: 'automatic',
                  drivetrain: 'awd',
                  bodyType: 'sedan',
                  photos: images.length > 0 ? images : getDefaultPhotos(),
                  specs: {
                    engine: {
                      'Тип': 'Бензиновый',
                      'Объём': '2.0 л',
                      'Мощность': '200 л.с.',
                    },
                    transmission: {
                      'Тип': 'Автоматическая',
                      'Привод': 'Полный',
                    },
                    suspension: {},
                    safety: [],
                    comfort: [],
                    multimedia: [],
                    additional: [],
                  },
                };
                
                fallbackCars.push(car);
              } catch (error) {
                console.error(`Ошибка при парсинге элемента ${index}:`, error.message);
              }
            });
            
            if (fallbackCars.length > 0) {
              console.log(`Найдено автомобилей: ${fallbackCars.length}`);
              break; // Выходим из цикла for
            }
          }
        }
      }
      
      // Fallback на Cheerio если Puppeteer не помог
      if (formattedCars.length === 0) {
        console.log('Попытка поиска через анализ текста через Cheerio...');
        const bodyText = $('body').text();
        const brandMatches = bodyText.matchAll(/(Mercedes|BMW|Audi|Porsche|MINI|Lexus|Range Rover|Land Rover|Bentley|Rolls-Royce|Ferrari|Lamborghini|Maserati|Jaguar|Volvo|Tesla)/gi);
        
        for (const match of brandMatches) {
          const brand = match[1];
          const startIndex = match.index;
          const context = bodyText.substring(startIndex, startIndex + 500);
          
          const priceMatch = context.match(/(\d{1,3}(?:\s?\d{3})*)\s*[₽руб]/i);
          if (priceMatch) {
            const price = parsePrice(priceMatch[1]);
            if (price > 100000 && price < 100000000) { // Минимальная цена для премиум авто
              const year = parseYear(context.match(/(20\d{2})/)?.[1]);
              const model = context.match(new RegExp(`${brand}\\s+([A-Z0-9\\s-]+)`, 'i'))?.[1]?.trim().split(/\s+/)[0] || 'Unknown';
              
              fallbackCars.push({
                id: `donor-${Date.now()}-${fallbackCars.length}`,
                brand: brand,
                model: model,
                trim: `${model} Base`,
                year: year,
                price: price,
                mileage: 0,
                status: 'in_stock',
                vin: generateVIN(brand, model, year),
                color: 'Unknown',
                fuelType: 'petrol',
                engineVolume: 2.0,
                power: 200,
                transmission: 'automatic',
                drivetrain: 'awd',
                bodyType: 'sedan',
                photos: getDefaultPhotos(),
                specs: {
                  engine: { 'Тип': 'Бензиновый', 'Объём': '2.0 л', 'Мощность': '200 л.с.' },
                  transmission: { 'Тип': 'Автоматическая', 'Привод': 'Полный' },
                  suspension: {},
                  safety: [],
                  comfort: [],
                  multimedia: [],
                  additional: [],
                },
              });
            }
          }
        }
        
        // Удаляем дубликаты из fallback данных
        if (fallbackCars.length > 0) {
          const uniqueCars = [];
          const seen = new Set();
          for (const car of fallbackCars) {
            const key = `${car.brand}-${car.model}-${car.price}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueCars.push(car);
            }
          }
          formattedCars = uniqueCars;
        }
      }
    }
    
    // Используем formattedCars, если они есть, иначе fallbackCars
    const finalCars = formattedCars.length > 0 ? formattedCars : (typeof fallbackCars !== 'undefined' ? fallbackCars : []);
    
    console.log(`Всего найдено уникальных автомобилей: ${finalCars.length}`);
    if (finalCars.length > 0 && finalCars[0].photos) {
      console.log(`Пример фотографий первого автомобиля: ${finalCars[0].photos.length} шт.`);
      if (finalCars[0].photos.length > 0) {
        console.log(`Первое фото: ${finalCars[0].photos[0]}`);
      }
    }
    
    return finalCars;
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Функция для добавления автомобилей в файл
async function addCarsToCatalog() {
  const donorCars = await fetchCarsWithPuppeteer();
  
  if (donorCars.length === 0) {
    console.log('Нет данных для добавления.');
    return;
  }
  
  // Читаем существующий файл
  const carsFilePath = path.join(__dirname, '../src/data/cars.ts');
  let carsFileContent = fs.readFileSync(carsFilePath, 'utf-8');
  
  // Находим закрывающую скобку массива cars
  // Ищем последнее вхождение перед export const brands
  const brandsMatch = carsFileContent.match(/export const brands/);
  if (!brandsMatch) {
    console.error('Не удалось найти маркер начала экспорта brands');
    return;
  }
  
  const beforeBrands = carsFileContent.substring(0, brandsMatch.index);
  
  // Ищем последний элемент массива перед export const brands
  // Ищем паттерн: }, или } перед ];
  // Пробуем разные варианты
  const patterns = [
    /(\s+)(\},\s*)\n(\s*)\];/,  // }, с новой строкой перед ];
    /(\s+)(\}\s*)\n(\s*)\];/,   // } без запятой с новой строкой перед ];
    /(\s+)(\},\s*)\];/,          // }, перед ];
    /(\s+)(\}\s*)\];/,           // } без запятой перед ];
  ];
  
  let match = null;
  let matchedPattern = null;
  
  for (const pattern of patterns) {
    match = beforeBrands.match(pattern);
    if (match) {
      matchedPattern = pattern;
      break;
    }
  }
  
  if (match) {
    const indent = '  ';
    const newCarsCode = donorCars.map((car) => {
      return formatCarAsCode(car, indent);
    }).join(',\n');
    
    // Вставляем новые автомобили перед закрывающей скобкой массива
    const updatedContent = beforeBrands.replace(
      matchedPattern,
      (match, ...groups) => {
        // Если есть группа с запятой, используем её, иначе добавляем запятую
        const hasComma = match.includes(',');
        const indent = groups[0] || '  ';
        const closingBracket = groups[groups.length - 1] || '];';
        
        return `${indent}${hasComma ? '},' : '}'},\n${indent}${newCarsCode}\n${closingBracket}`;
      }
    ) + carsFileContent.substring(brandsMatch.index);
    
    fs.writeFileSync(carsFilePath, updatedContent, 'utf-8');
    console.log(`✅ Добавлено ${donorCars.length} автомобилей в каталог.`);
  } else {
    console.error('Не удалось найти конец массива cars в файле.');
    console.log('Последние 200 символов перед export:', beforeBrands.slice(-200));
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
