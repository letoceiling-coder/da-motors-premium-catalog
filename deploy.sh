#!/bin/bash
# Deployment script that preserves data directory

cd batnorton.siteaccess.ru/public_html || exit 1

# Backup data directory if it exists
if [ -d "public/data" ]; then
    echo "Backing up data directory..."
    cp -r public/data /tmp/data_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    BACKUP_DIR=$(ls -td /tmp/data_backup_* | head -1)
    echo "Backup created: $BACKUP_DIR"
fi

# Clean everything except data
echo "Cleaning old files..."
find . -mindepth 1 -maxdepth 1 ! -name 'public' -exec rm -rf {} \; 2>/dev/null || true
if [ -d "public" ]; then
    find public -mindepth 1 -maxdepth 1 ! -name 'data' -exec rm -rf {} \; 2>/dev/null || true
fi

# Clone repository
echo "Cloning repository..."
git clone https://github.com/letoceiling-coder/da-motors-premium-catalog.git . || exit 1

# Restore data directory if backup exists
if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
    echo "Restoring data directory..."
    if [ ! -d "public/data" ]; then
        mkdir -p public/data
    fi
    cp -r "$BACKUP_DIR"/* public/data/ 2>/dev/null || true
    chmod -R 775 public/data 2>/dev/null || true
    echo "Data directory restored"
fi

# Build project
echo "Installing dependencies..."
PUPPETEER_SKIP_DOWNLOAD=true npm install || exit 1

echo "Building project..."
npm run build || exit 1

# Move build files
echo "Moving build files..."
mv dist/* . 2>/dev/null || true
mv dist/.[^.]* . 2>/dev/null || true
rmdir dist 2>/dev/null || true

# Clean up unnecessary files
echo "Cleaning up..."
rm -rf node_modules src scripts .git .gitignore package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts tailwind.config.ts postcss.config.js README.md .eslintrc.cjs bun.lockb components.json eslint.config.js .lovable vitest.config.ts 2>/dev/null || true

# Ensure data directory exists and has correct permissions
if [ ! -d "public/data" ]; then
    mkdir -p public/data
fi
chmod -R 775 public/data 2>/dev/null || true

echo "Deployment completed successfully!"
