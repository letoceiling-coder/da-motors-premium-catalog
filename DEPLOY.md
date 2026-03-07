# Инструкция по деплою

## Важно: Сохранение данных

При деплое **всегда сохраняется** директория `public/data/`, которая содержит:
- `bot-config.json` - настройки бота (токен, webhook, приветствие)
- `bot-users.json` - пользователи бота
- `bot-admins.json` - администраторы бота
- `applications.json` - заявки из MiniApp
- `cars.json` - каталог автомобилей
- `webhook.log` - логи webhook

## Команда деплоя

```bash
ssh dsc23ytp@dragon.beget.ru 'cd batnorton.siteaccess.ru/public_html && if [ -d "public/data" ]; then echo "Backing up data..." && cp -r public/data /tmp/data_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true; fi && BACKUP=$(ls -td /tmp/data_backup_* 2>/dev/null | head -1) && find . -mindepth 1 -maxdepth 1 ! -name "public" -exec rm -rf {} \; 2>/dev/null || true && if [ -d "public" ]; then find public -mindepth 1 -maxdepth 1 ! -name "data" -exec rm -rf {} \; 2>/dev/null || true; fi && git clone https://github.com/letoceiling-coder/da-motors-premium-catalog.git . && if [ -n "$BACKUP" ] && [ -d "$BACKUP" ]; then mkdir -p public/data && cp -r "$BACKUP"/* public/data/ 2>/dev/null || true && chmod -R 775 public/data 2>/dev/null || true && echo "Data restored"; fi && PUPPETEER_SKIP_DOWNLOAD=true npm install && npm run build && mv dist/* . && mv dist/.??* . 2>/dev/null || true && rmdir dist && rm -rf node_modules src scripts .git .gitignore package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts tailwind.config.ts postcss.config.js README.md .eslintrc.cjs bun.lockb components.json eslint.config.js .lovable vitest.config.ts && if [ ! -d "public/data" ]; then mkdir -p public/data && chmod -R 775 public/data; fi && echo "Deployment completed with data preserved"'
```

## Что делает команда:

1. **Резервное копирование** - сохраняет `public/data/` в `/tmp/data_backup_*`
2. **Очистка** - удаляет все файлы, кроме данных
3. **Клонирование** - клонирует репозиторий
4. **Восстановление данных** - восстанавливает `public/data/` из бэкапа
5. **Сборка** - устанавливает зависимости и собирает проект
6. **Развертывание** - перемещает собранные файлы на место
7. **Очистка** - удаляет ненужные файлы (node_modules, исходники и т.д.)

## Проверка после деплоя

После деплоя проверьте:
- ✅ Токен бота сохранен в админ-панели
- ✅ Пользователи бота отображаются
- ✅ Заявки не потеряны
- ✅ Webhook работает
