# Исправление проблемы с маршрутизацией /admin

## Проблема
При обращении к `/admin` сервер возвращает 404 ошибку, потому что `.htaccess` не настроен для SPA роутинга.

## Решение

### Вариант 1: Автоматическое исправление (рекомендуется)
Выполните деплой заново - скрипт теперь автоматически копирует `.htaccess`:

```bash
ssh dsc23ytp@dragon.beget.ru
cd ~/batnorton.siteaccess.ru/public_html
bash deploy-safe.sh
```

### Вариант 2: Ручное исправление
Если автоматический деплой не помог, создайте `.htaccess` вручную:

```bash
ssh dsc23ytp@dragon.beget.ru
cd ~/batnorton.siteaccess.ru/public_html
cat > .htaccess << 'EOF'
RewriteEngine On
RewriteBase /

# Pretty webhook route for Telegram
RewriteRule ^telegram/webhook$ /api/telegram-webhook.php [L,QSA]

# SPA fallback - все запросы перенаправляются на index.html
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOF
```

### Проверка
После создания `.htaccess` проверьте:
1. Файл существует: `ls -la .htaccess`
2. Права доступа: `chmod 644 .htaccess`
3. Откройте в браузере: `https://batnorton.siteaccess.ru/admin`

## Важно
- `.htaccess` должен находиться в корне `public_html`
- Убедитесь, что модуль `mod_rewrite` включен на сервере
- После изменений может потребоваться несколько секунд для применения
