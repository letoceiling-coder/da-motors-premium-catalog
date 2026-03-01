import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API endpoints для получения данных о машинах
const API_ENDPOINTS = [
  {
    url: 'https://store.tildaapi.com/api/getproductslist/',
    params: {
      storepartuid: '967787820261',
      recid: '853371680',
      getparts: 'true',
      getoptions: 'true',
      slice: '1',
      size: '100' // Увеличиваем размер для получения всех машин
    }
  },
  {
    url: 'https://store.tildaapi.com/api/getproductslist/',
    params: {
      storepartuid: '756428026962',
      recid: '867855191',
      getparts: 'true',
      getoptions: 'true',
      slice: '1',
      size: '100'
    }
  },
  {
    url: 'https://store.tildaapi.com/api/getproductslist/',
    params: {
      storepartuid: '726936299082',
      recid: '870671208',
      getparts: 'true',
      getoptions: 'true',
      slice: '1',
      size: '100'
    }
  }
];

// Вспомогательные функции маппинга
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

function generateVIN(brand, model, year) {
  const prefix = brand.substring(0, 3).toUpperCase().padEnd(3, 'X');
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}${year}${random}`;
}

function parsePrice(priceText) {
  if (!priceText) return 0;
  const cleaned = priceText.replace(/\s/g, '').replace(/[^\d]/g, '');
  let price = parseInt(cleaned, 10) || 0;
  // Если цена слишком большая (больше 100 миллионов), вероятно она в неправильном формате
  // Делим на 10000, так как API может возвращать цены в копейках или в другом формате
  if (price > 100000000) {
    price = Math.round(price / 10000);
  }
  return price;
}

function parseYear(yearText) {
  if (!yearText) return new Date().getFullYear();
  const year = parseInt(yearText, 10);
  if (year > 1900 && year <= new Date().getFullYear() + 1) {
    return year;
  }
  return new Date().getFullYear();
}

function extractImages(product) {
  const images = [];
  
  // Из gallery (может быть строкой JSON или массивом)
  if (product.gallery) {
    let galleryData = null;
    
    if (typeof product.gallery === 'string') {
      try {
        galleryData = JSON.parse(product.gallery);
      } catch (e) {
        // Если не JSON, возможно это просто URL
        galleryData = [product.gallery];
      }
    } else if (Array.isArray(product.gallery)) {
      galleryData = product.gallery;
    }
    
    if (galleryData) {
      galleryData.forEach(img => {
        let src = null;
        
        if (typeof img === 'string') {
          src = img;
        } else if (img && typeof img === 'object' && img.img) {
          src = img.img;
        }
        
        if (src) {
          if (!src.startsWith('http')) {
            src = src.startsWith('/') ? 'https://da-motors-msk.ru' + src : 'https://da-motors-msk.ru/' + src;
          }
          src = src.replace(/\/resize[^\/]*\//g, '/').replace(/\/resizeb\/x\d+\//g, '/');
          if (!src.includes('Mask_group') && !src.includes('contact') && !src.includes('Group_') && 
              !src.includes('/resize/') && !src.includes('thb.') && !src.includes('thumb') && !images.includes(src)) {
            images.push(src);
          }
        }
      });
    }
  }
  
  // Из editions (альтернативный источник изображений)
  if (product.editions && Array.isArray(product.editions) && product.editions.length > 0) {
    product.editions.forEach(edition => {
      if (edition.img) {
        let src = edition.img;
        if (!src.startsWith('http')) {
          src = src.startsWith('/') ? 'https://da-motors-msk.ru' + src : 'https://da-motors-msk.ru/' + src;
        }
        src = src.replace(/\/resize[^\/]*\//g, '/').replace(/\/resizeb\/x\d+\//g, '/');
        if (!src.includes('Mask_group') && !src.includes('contact') && !src.includes('Group_') && 
            !src.includes('/resize/') && !src.includes('thb.') && !src.includes('thumb') && !images.includes(src)) {
          images.push(src);
        }
      }
    });
  }
  
  // Из data-product-img (fallback)
  if (product['data-product-img'] && images.length === 0) {
    let src = product['data-product-img'];
    if (!src.startsWith('http')) {
      src = src.startsWith('/') ? 'https://da-motors-msk.ru' + src : 'https://da-motors-msk.ru/' + src;
    }
    src = src.replace(/\/resize[^\/]*\//g, '/').replace(/\/resizeb\/x\d+\//g, '/');
    if (!src.includes('Mask_group') && !src.includes('contact') && !src.includes('Group_') && 
        !src.includes('/resize/') && !src.includes('thb.') && !src.includes('thumb')) {
      images.push(src);
    }
  }
  
  return images;
}

function parseCarFromProduct(product) {
  try {
    // Извлекаем название
    const name = product.title || product.name || '';
    if (!name) return null;
    
    // Парсим марку и модель
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
    
    if (!brand) {
      const brandMatch = name.match(/(Mercedes|BMW|Audi|Porsche|MINI|Lexus|Bentley|Ferrari|Lamborghini|Maserati|Jaguar|Volvo|Tesla|Toyota|Honda|Nissan|Mazda|Subaru|Infiniti|Acura)/i);
      if (!brandMatch) return null;
      
      brand = brandMatch[1];
      if (brand === 'Mercedes') {
        brand = 'Mercedes-Benz';
      }
      model = name.replace(new RegExp(brandMatch[1], 'gi'), '').trim().split(/\s+/).filter(part => part && part !== '-').join(' ') || 'Unknown';
    }
    
    model = model.replace(/^[- ]+/, '').replace(/[- ]+$/, '').trim() || 'Unknown';
    
    // Извлекаем цену
    let price = 0;
    if (product.price) {
      price = parsePrice(product.price.toString());
    } else if (product['data-product-price-def']) {
      let rawPrice = parseInt(product['data-product-price-def'], 10) || 0;
      // Если цена слишком большая, делим на 10000
      if (rawPrice > 100000000) {
        rawPrice = Math.round(rawPrice / 10000);
      }
      price = rawPrice;
    }
    
    // Извлекаем описание
    const description = product.descr || product.description || '';
    
    // Парсим описание из поля descr (может содержать HTML)
    let descText = description;
    if (descText && descText.includes('<')) {
      // Удаляем HTML теги для парсинга
      descText = descText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    
    // Парсим год
    const yearMatch = (descText + ' ' + name).match(/(20\d{2})/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
    
    // Парсим характеристики из descr
    const engineMatch = descText.match(/(\d+\.?\d*)\s*л/);
    const powerMatch = descText.match(/(\d+)\s*л\.с\./);
    const fuelMatch = descText.match(/(Бензин|Дизель|Гибрид|Электрический)/i);
    
    // Парсим цвет из описания или названия
    const colorMatch = descText.match(/(белый|черный|серый|синий|красный|зеленый|коричневый|желтый|серебристый|золотой)/i) ||
                      name.match(/(белый|черный|серый|синий|красный|зеленый|коричневый|желтый|серебристый|золотой)/i);
    const color = colorMatch ? colorMatch[1].charAt(0).toUpperCase() + colorMatch[1].slice(1) : 'Unknown';
    
    // Парсим пробег
    const mileageMatch = descText.match(/(\d+[\s,.]?\d*)\s*км/i) || descText.match(/пробег[:\s]+(\d+)/i);
    const mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/\s/g, ''), 10) : 0;
    
    // Парсим тип коробки передач
    let transmission = 'automatic';
    if (descText.match(/механическая|механика|manual/i)) transmission = 'manual';
    else if (descText.match(/робот|robot/i)) transmission = 'robot';
    else if (descText.match(/автоматическая|автомат|automatic/i)) transmission = 'automatic';
    
    // Парсим привод
    let drivetrain = 'awd';
    if (descText.match(/передний|fwd|front/i)) drivetrain = 'fwd';
    else if (descText.match(/задний|rwd|rear/i)) drivetrain = 'rwd';
    else if (descText.match(/полный|awd|4wd|quattro|xdrive|4matic/i)) drivetrain = 'awd';
    
    // Парсим тип кузова
    let bodyType = 'sedan';
    if (name.match(/suv|внедорожник|x[1-7]|gle|glc|gls|q[3-8]|cayenne|macan/i)) bodyType = 'suv';
    else if (name.match(/coupe|купе/i)) bodyType = 'coupe';
    else if (name.match(/hatchback|хэтчбек/i)) bodyType = 'hatchback';
    else if (name.match(/convertible|кабриолет/i)) bodyType = 'convertible';
    else if (name.match(/wagon|универсал|estate|touring/i)) bodyType = 'wagon';
    
    // Извлекаем изображения
    const images = extractImages(product);
    
    // Определяем статус
    let status = 'in_stock';
    const statusText = product.status || description || '';
    const statusLower = statusText.toLowerCase();
    if (statusLower.includes('заказ') || statusLower.includes('order')) status = 'on_order';
    else if (statusLower.includes('пути') || statusLower.includes('transit')) status = 'in_transit';
    
    // Парсим VIN из данных продукта, если есть
    const vin = product.vin || product['data-product-vin'] || generateVIN(brand, model, year);
    
    return {
      id: `donor-api-${product.id || product.uid || Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      brand,
      model,
      trim: model + ' Base',
      year,
      price,
      mileage,
      status,
      vin,
      color,
      fuelType: fuelMatch ? (fuelMatch[1].toLowerCase().includes('дизель') ? 'diesel' : 
                             fuelMatch[1].toLowerCase().includes('гибрид') ? 'hybrid' : 
                             fuelMatch[1].toLowerCase().includes('электрический') ? 'electric' : 'petrol') : 'petrol',
      engineVolume: engineMatch ? parseFloat(engineMatch[1]) : 2.0,
      power: powerMatch ? parseInt(powerMatch[1], 10) : 200,
      transmission,
      drivetrain,
      bodyType,
      photos: images.length > 0 ? images : [],
      specs: {
        engine: {
          'Тип': fuelMatch ? fuelMatch[1] : 'Бензиновый',
          'Объём': engineMatch ? `${engineMatch[1]} л` : '2.0 л',
          'Мощность': powerMatch ? `${powerMatch[1]} л.с.` : '200 л.с.',
        },
        transmission: {
          'Тип': transmission === 'manual' ? 'Механическая' : 
                 transmission === 'robot' ? 'Робот' : 'Автоматическая',
          'Привод': drivetrain === 'fwd' ? 'Передний' : 
                    drivetrain === 'rwd' ? 'Задний' : 'Полный',
        },
        suspension: {},
        safety: [],
        comfort: [],
        multimedia: [],
        additional: [],
      },
    };
  } catch (error) {
    console.error('Ошибка при парсинге продукта:', error);
    return null;
  }
}

async function fetchCarsFromApi() {
  const allCars = [];
  
  for (const endpoint of API_ENDPOINTS) {
    try {
      const url = new URL(endpoint.url);
      Object.entries(endpoint.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
      
      console.log(`Запрос к API: ${url.toString()}`);
      
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });
      
      if (!response.ok) {
        console.error(`Ошибка HTTP ${response.status} для ${url.toString()}`);
        continue;
      }
      
      const html = await response.text();
      
      // Парсим HTML ответ - Tilda API возвращает HTML с встроенным JSON
      // Ищем JSON данные в скриптах или в data-атрибутах
      let productsData = null;
      
      // Пытаемся найти JSON в скрипте
      const scriptMatch = html.match(/<script[^>]*>[\s\S]*?var\s+products\s*=\s*(\[[\s\S]*?\]);/i) ||
                         html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/i);
      
      if (scriptMatch) {
        try {
          productsData = JSON.parse(scriptMatch[1]);
        } catch (e) {
          console.error('Ошибка парсинга JSON из скрипта:', e);
        }
      }
      
      // Если не нашли в скрипте, ищем в теле ответа - Tilda возвращает JSON как часть HTML
      if (!productsData) {
        // Пытаемся найти JSON объект с массивом products
        // Tilda API возвращает JSON в формате: {"partuid":...,"products":[...],"slice":1,...}
        // Ищем начало JSON объекта
        const jsonStartMatch = html.match(/\{"partuid":/);
        if (jsonStartMatch) {
          try {
            // Находим начало и конец JSON объекта
            let jsonStart = jsonStartMatch.index;
            let braceCount = 0;
            let jsonEnd = jsonStart;
            let inString = false;
            let escapeNext = false;
            
            for (let i = jsonStart; i < html.length; i++) {
              const char = html[i];
              
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              
              if (char === '\\') {
                escapeNext = true;
                continue;
              }
              
              if (char === '"') {
                inString = !inString;
                continue;
              }
              
              if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    jsonEnd = i + 1;
                    break;
                  }
                }
              }
            }
            
            if (jsonEnd > jsonStart) {
              const jsonStr = html.substring(jsonStart, jsonEnd);
              const fullJson = JSON.parse(jsonStr);
              if (fullJson.products && Array.isArray(fullJson.products)) {
                productsData = fullJson.products;
              }
            }
          } catch (e) {
            console.error('Ошибка парсинга JSON:', e.message);
          }
        }
      }
      
      // Если нашли JSON данные, парсим их
      if (productsData && Array.isArray(productsData)) {
        console.log(`Найдено ${productsData.length} продуктов в JSON для storepartuid=${endpoint.params.storepartuid}`);
        productsData.forEach(product => {
          const car = parseCarFromProduct(product);
          if (car) {
            allCars.push(car);
          }
        });
      } else {
        // Fallback: парсим HTML напрямую
        console.log(`JSON не найден, парсим HTML для storepartuid=${endpoint.params.storepartuid}`);
        
        // Парсим HTML ответ (Tilda API возвращает HTML с карточками товаров)
        // Ищем все элементы с классом .js-product или .t-store__card
        const productCardRegex = /<div[^>]*class="[^"]*js-product[^"]*"[^>]*data-product-uid="([^"]+)"[^>]*data-product-img="([^"]+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
        
        let match;
        while ((match = productCardRegex.exec(html)) !== null) {
          const cardHtml = match[0];
          const uid = match[1];
          const img = match[2];
          
          // Извлекаем название
          const nameMatch = cardHtml.match(/js-store-prod-name[^>]*>([^<]+)</i) ||
                           cardHtml.match(/js-product-name[^>]*>([^<]+)</i) ||
                           cardHtml.match(/<div[^>]*class="[^"]*t-store__card__title[^"]*"[^>]*>([^<]+)</i);
          
          // Извлекаем цену
          const priceMatch = cardHtml.match(/data-product-price-def="([^"]+)"/i) ||
                            cardHtml.match(/js-product-price[^>]*>([^<]+)</i);
          
          // Извлекаем описание
          const descMatch = cardHtml.match(/js-store-prod-descr[^>]*>([^<]+)</i);
          
          // Извлекаем дополнительные изображения из data-original
          const additionalImages = [];
          const bgImgMatches = cardHtml.matchAll(/data-original="([^"]+)"/gi);
          for (const bgMatch of bgImgMatches) {
            let src = bgMatch[1];
            if (!src.startsWith('http')) {
              src = src.startsWith('/') ? 'https://da-motors-msk.ru' + src : 'https://da-motors-msk.ru/' + src;
            }
            src = src.replace(/\/resize[^\/]*\//g, '/').replace(/\/resizeb\/x\d+\//g, '/');
            if (!src.includes('Mask_group') && !src.includes('contact') && !src.includes('Group_') && 
                !src.includes('/resize/') && !src.includes('thb.') && !src.includes('thumb') && !additionalImages.includes(src)) {
              additionalImages.push(src);
            }
          }
          
          if (nameMatch) {
            let mainImg = img;
            if (!mainImg.startsWith('http')) {
              mainImg = mainImg.startsWith('/') ? 'https://da-motors-msk.ru' + mainImg : 'https://da-motors-msk.ru/' + mainImg;
            }
            mainImg = mainImg.replace(/\/resize[^\/]*\//g, '/').replace(/\/resizeb\/x\d+\//g, '/');
            
            const allImages = [mainImg, ...additionalImages].filter(img => 
              !img.includes('Mask_group') && !img.includes('contact') && !img.includes('Group_') && 
              !img.includes('/resize/') && !img.includes('thb.') && !img.includes('thumb')
            );
            
            const car = parseCarFromProduct({
              id: uid,
              uid: uid,
              title: nameMatch[1].trim(),
              price: priceMatch ? priceMatch[1] : '0',
              description: descMatch ? descMatch[1].trim() : '',
              'data-product-img': mainImg,
              gallery: allImages
            });
            if (car) {
              allCars.push(car);
            }
          }
        }
        
        // Если не нашли через regex, пробуем более простой способ
        if (allCars.length === 0) {
          // Ищем все элементы с data-product-uid
          const uidMatches = html.matchAll(/data-product-uid="([^"]+)"/g);
          for (const uidMatch of uidMatches) {
            const uid = uidMatch[1];
            const contextStart = Math.max(0, uidMatch.index - 1000);
            const contextEnd = Math.min(html.length, uidMatch.index + 3000);
            const context = html.substring(contextStart, contextEnd);
            
            const nameMatch = context.match(/js-store-prod-name[^>]*>([^<]+)</i) ||
                             context.match(/js-product-name[^>]*>([^<]+)</i);
            const priceMatch = context.match(/data-product-price-def="([^"]+)"/i);
            const imgMatch = context.match(/data-product-img="([^"]+)"/i);
            const descMatch = context.match(/js-store-prod-descr[^>]*>([^<]+)</i);
            
            if (nameMatch && imgMatch) {
              let mainImg = imgMatch[1];
              if (!mainImg.startsWith('http')) {
                mainImg = mainImg.startsWith('/') ? 'https://da-motors-msk.ru' + mainImg : 'https://da-motors-msk.ru/' + mainImg;
              }
              mainImg = mainImg.replace(/\/resize[^\/]*\//g, '/').replace(/\/resizeb\/x\d+\//g, '/');
              
              if (!mainImg.includes('Mask_group') && !mainImg.includes('contact') && !mainImg.includes('Group_')) {
                const car = parseCarFromProduct({
                  id: uid,
                  uid: uid,
                  title: nameMatch[1].trim(),
                  price: priceMatch ? priceMatch[1] : '0',
                  description: descMatch ? descMatch[1].trim() : '',
                  'data-product-img': mainImg,
                  gallery: [mainImg]
                });
                if (car) {
                  allCars.push(car);
                }
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error(`Ошибка при запросе к ${endpoint.url}:`, error);
    }
  }
  
  // Удаляем дубликаты
  const uniqueCars = [];
  const seen = new Set();
  for (const car of allCars) {
    const key = `${car.brand}-${car.model}-${car.price}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCars.push(car);
    }
  }
  
  console.log(`\nВсего найдено уникальных автомобилей: ${uniqueCars.length}`);
  
  return uniqueCars;
}

async function addCarsToCatalog() {
  try {
    console.log('Получение данных через API...\n');
    const newCars = await fetchCarsFromApi();
    
    if (newCars.length === 0) {
      console.log('Нет данных для добавления.');
      return;
    }
    
    // Читаем существующий файл
    const carsFilePath = path.join(__dirname, '../src/data/cars.ts');
    let content = fs.readFileSync(carsFilePath, 'utf8');
    
    // Находим место для вставки (перед export const brands)
    // Ищем закрывающую скобку массива и export const brands
    const lastCarPattern = /(\}\s*,\s*)\n\s*\];\s*\n\s*export const brands/;
    let match = content.match(lastCarPattern);
    
    // Если не нашли, пробуем без запятой перед ];
    if (!match) {
      const altPattern = /(\}\s*)\n\s*\];\s*\n\s*export const brands/;
      match = content.match(altPattern);
    }
    
    // Если все еще не нашли, пробуем с пустыми строками
    if (!match) {
      const altPattern2 = /(\}\s*,\s*)\n\s*\];\s*\n\s*\n\s*export const brands/;
      match = content.match(altPattern2);
    }
    
    // Если все еще не нашли, ищем просто ]; перед export
    if (!match) {
      const simplePattern = /(\}\s*,\s*)\n\s*\];/;
      match = content.match(simplePattern);
    }
    
    if (!match) {
      console.error('Не найдено место для вставки новых машин');
      console.log('Ищем паттерн в конце файла...');
      const lastLines = content.split('\n').slice(-10);
      console.log('Последние 10 строк:', lastLines);
      return;
    }
    
    // Форматируем новые машины
    const newCarsString = newCars.map(car => {
      const photosStr = car.photos.length > 0 
        ? `[${car.photos.map(p => `'${p}'`).join(', ')}]`
        : '[]';
      
      return `  {
    id: '${car.id}',
    brand: '${car.brand}',
    model: '${car.model}',
    trim: '${car.trim}',
    year: ${car.year},
    price: ${car.price},
    mileage: ${car.mileage},
    status: '${car.status}',
    vin: '${car.vin}',
    color: '${car.color}',
    fuelType: '${car.fuelType}',
    engineVolume: ${car.engineVolume},
    power: ${car.power},
    transmission: '${car.transmission}',
    drivetrain: '${car.drivetrain}',
    bodyType: '${car.bodyType}',
    photos: ${photosStr},
    specs: {
      engine: { 'Тип': '${car.specs.engine['Тип']}', 'Объём': '${car.specs.engine['Объём']}', 'Мощность': '${car.specs.engine['Мощность']}' },
      transmission: { 'Тип': '${car.specs.transmission['Тип']}', 'Привод': '${car.specs.transmission['Привод']}' },
      suspension: {},
      safety: [],
      comfort: [],
      multimedia: [],
      additional: [],
    },
  }`;
    }).join(',\n');
    
    // Вставляем новые машины
    let newContent;
    if (match[0].includes('];')) {
      // Если нашли с ];, заменяем перед ];
      newContent = content.replace(
        match[0],
        `${match[1]}${newCarsString},\n  ];`
      );
    } else {
      // Иначе просто добавляем перед export
      newContent = content.replace(
        match[0],
        `${match[1]}${newCarsString},\n  `
      );
    }
    
    // Записываем обратно
    fs.writeFileSync(carsFilePath, newContent, 'utf8');
    
    console.log(`\nДобавлено ${newCars.length} автомобилей в каталог!`);
    console.log('Файл обновлен: src/data/cars.ts');
    
  } catch (error) {
    console.error('Ошибка при добавлении машин:', error);
  }
}

addCarsToCatalog();
