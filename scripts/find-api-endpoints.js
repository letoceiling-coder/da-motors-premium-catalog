import puppeteer from 'puppeteer';
import fs from 'fs';

const DONOR_URL = 'https://da-motors-msk.ru/catalog';

async function findApiEndpoints() {
  let browser;
  try {
    console.log('Запуск браузера...');
    browser = await puppeteer.launch({
      headless: false, // Показываем браузер для отладки
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Перехватываем все сетевые запросы
    const requests = [];
    const responses = [];
    
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      const headers = request.headers();
      
      // Сохраняем только интересные запросы (API, JSON, данные)
      if (url.includes('api') || 
          url.includes('catalog') || 
          url.includes('product') || 
          url.includes('store') ||
          url.includes('tilda') ||
          url.includes('json') ||
          request.resourceType() === 'xhr' ||
          request.resourceType() === 'fetch') {
        requests.push({
          url,
          method,
          headers,
          resourceType: request.resourceType(),
          postData: request.postData()
        });
        console.log(`[REQUEST] ${method} ${url}`);
      }
    });
    
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      const headers = response.headers();
      const contentType = headers['content-type'] || '';
      
      // Сохраняем только интересные ответы
      if (url.includes('api') || 
          url.includes('catalog') || 
          url.includes('product') || 
          url.includes('store') ||
          url.includes('tilda') ||
          contentType.includes('json') ||
          contentType.includes('javascript')) {
        
        let body = null;
        try {
          // Пытаемся получить тело ответа
          if (contentType.includes('json')) {
            body = await response.json();
          } else if (contentType.includes('text') || contentType.includes('javascript')) {
            body = await response.text();
          }
        } catch (e) {
          // Игнорируем ошибки чтения тела
        }
        
        responses.push({
          url,
          status,
          headers,
          contentType,
          body: body ? (typeof body === 'string' ? body.substring(0, 1000) : JSON.stringify(body).substring(0, 1000)) : null
        });
        
        console.log(`[RESPONSE] ${status} ${url} (${contentType})`);
        
        // Если это JSON с данными о машинах, выводим подробности
        if (contentType.includes('json') && body) {
          const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
          if (bodyStr.includes('product') || bodyStr.includes('car') || bodyStr.includes('item') || 
              bodyStr.includes('Mercedes') || bodyStr.includes('BMW') || bodyStr.includes('Audi')) {
            console.log('\n=== НАЙДЕНЫ ДАННЫЕ О МАШИНАХ ===');
            console.log(`URL: ${url}`);
            console.log(`Body preview: ${bodyStr.substring(0, 500)}`);
            console.log('===================================\n');
          }
        }
      }
    });
    
    console.log('Загрузка страницы каталога...');
    await page.goto(DONOR_URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Ждем загрузки динамического контента
    console.log('Ожидание загрузки контента...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Пытаемся прокрутить страницу, чтобы загрузить больше данных
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Пытаемся найти и кликнуть на кнопку "Load more"
    try {
      const buttons = await page.$$('button, a');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && (text.includes('Load more') || text.includes('Загрузить') || text.includes('Показать'))) {
          console.log('Найдена кнопка "Load more", кликаем...');
          await btn.click();
          await new Promise(resolve => setTimeout(resolve, 5000));
          break;
        }
      }
    } catch (e) {
      console.log('Кнопка "Load more" не найдена');
    }
    
    // Сохраняем все запросы и ответы в файл
    const report = {
      timestamp: new Date().toISOString(),
      url: DONOR_URL,
      requests: requests,
      responses: responses
    };
    
    fs.writeFileSync('api-endpoints-report.json', JSON.stringify(report, null, 2));
    console.log(`\nОтчет сохранен в api-endpoints-report.json`);
    console.log(`Всего запросов: ${requests.length}`);
    console.log(`Всего ответов: ${responses.length}`);
    
    // Выводим список всех API endpoints
    console.log('\n=== НАЙДЕННЫЕ API ENDPOINTS ===');
    const apiEndpoints = [...new Set(requests.map(r => r.url))];
    apiEndpoints.forEach(url => {
      console.log(`- ${url}`);
    });
    console.log('===============================\n');
    
    // Ждем немного перед закрытием браузера
    console.log('Браузер останется открытым на 30 секунд для проверки...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

findApiEndpoints().catch(console.error);
