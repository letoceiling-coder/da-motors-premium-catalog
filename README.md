# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Скрипты для обновления каталога автомобилей

Проект включает скрипты для автоматического получения данных об автомобилях с сайта-донора.

### Быстрый старт

```bash
# Получить данные об автомобилях через API
npm run fetch-api
```

### Доступные команды

- `npm run fetch-api` - Получить данные об автомобилях через API (рекомендуется)
- `npm run find-api` - Найти API endpoints на сайте-доноре
- `npm run fetch-cars` - Получить данные через Puppeteer (устаревший метод)

### Подробная документация

Подробная документация по использованию скриптов находится в файле [`scripts/README.md`](./scripts/README.md).

### Что делает скрипт `fetch-api`

1. Подключается к API сайта-донора `https://da-motors-msk.ru/catalog`
2. Извлекает данные об автомобилях (марка, модель, цена, год, фото, характеристики)
3. Автоматически исправляет некорректные цены
4. Добавляет новые автомобили в `src/data/cars.ts`
5. Удаляет дубликаты

### Важно

- Перед запуском рекомендуется сделать резервную копию файла `src/data/cars.ts`
- Скрипт автоматически исправляет цены, если они в неправильном формате
- После запуска проверьте, что данные корректны
