const fs = require('fs');
const path = require('path');

const carsFilePath = path.join(__dirname, '../src/data/cars.ts');
const content = fs.readFileSync(carsFilePath, 'utf8');
const lines = content.split('\n');

// Находим начало массива cars (строка 52)
// Находим первую строку с donor-api (строка 1986)
// Находим конец массива cars (строка 3805)

const startLines = lines.slice(0, 52); // Типы, интерфейсы, функции, начало массива
const apiCarsLines = lines.slice(1985, 3805); // Автомобили из API (начиная с "},  {" до "];")
const endLines = lines.slice(3805); // Конец массива и экспорты

// Исправляем первую строку API автомобилей - убираем "},  {" и оставляем только "{"
if (apiCarsLines[0] && apiCarsLines[0].trim() === '},  {') {
  apiCarsLines[0] = '  {';
}

// Удаляем функции getPhotos и carImages, так как они больше не нужны
const cleanedStartLines = startLines.filter((line, index) => {
  // Пропускаем строки 36-50 (carImages и getPhotos)
  if (index >= 36 && index <= 50) {
    return false;
  }
  return true;
});

const newContent = cleanedStartLines.join('\n') + '\n' + apiCarsLines.join('\n') + '\n' + endLines.join('\n');

fs.writeFileSync(carsFilePath, newContent);
console.log('✅ Старые автомобили удалены, оставлены только автомобили из API донора');
console.log(`📊 Всего автомобилей из API: ${apiCarsLines.filter(line => line.includes("id: 'donor-api-")).length}`);
