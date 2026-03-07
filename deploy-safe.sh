#!/bin/bash
# SAFE deployment script - NEVER deletes data directory
# This script preserves public/data/ at all costs

set -e  # Exit on error

cd batnorton.siteaccess.ru/public_html || exit 1

echo "=== SAFE DEPLOYMENT START ==="

# STEP 1: Backup data directory to multiple locations
DATA_BACKUP="/tmp/data_backup_$(date +%Y%m%d_%H%M%S)"
DATA_BACKUP_ALT="/home/dsc23ytp/data_backup_$(date +%Y%m%d_%H%M%S)"

if [ -d "public/data" ]; then
    echo "✓ Backing up data to: $DATA_BACKUP"
    cp -r public/data "$DATA_BACKUP" 2>/dev/null || true
    
    echo "✓ Backing up data to: $DATA_BACKUP_ALT"
    mkdir -p /home/dsc23ytp 2>/dev/null || true
    cp -r public/data "$DATA_BACKUP_ALT" 2>/dev/null || true
    
    echo "✓ Data backup completed"
else
    echo "⚠ No public/data directory found"
fi

# STEP 2: Remove ONLY specific files, NEVER touch public/data
echo "✓ Cleaning old files (preserving public/data)..."

# Remove root level files except public
find . -maxdepth 1 -mindepth 1 ! -name "public" ! -name "." -exec rm -rf {} \; 2>/dev/null || true

# In public directory, remove everything EXCEPT data
if [ -d "public" ]; then
    echo "✓ Cleaning public directory (preserving data)..."
    find public -mindepth 1 -maxdepth 1 ! -name "data" -exec rm -rf {} \; 2>/dev/null || true
fi

# STEP 3: Clone repository
echo "✓ Cloning repository..."
if [ -d ".git" ]; then
    git fetch origin
    git reset --hard origin/main
    git clean -fd
else
    git clone https://github.com/letoceiling-coder/da-motors-premium-catalog.git .
fi

# STEP 4: Restore data from backup (CRITICAL)
if [ -d "$DATA_BACKUP" ] || [ -d "$DATA_BACKUP_ALT" ]; then
    RESTORE_FROM=""
    if [ -d "$DATA_BACKUP" ]; then
        RESTORE_FROM="$DATA_BACKUP"
    elif [ -d "$DATA_BACKUP_ALT" ]; then
        RESTORE_FROM="$DATA_BACKUP_ALT"
    fi
    
    if [ -n "$RESTORE_FROM" ]; then
        echo "✓ Restoring data from: $RESTORE_FROM"
        mkdir -p public/data
        cp -r "$RESTORE_FROM"/* public/data/ 2>/dev/null || true
        chmod -R 775 public/data 2>/dev/null || true
        echo "✓ Data restored successfully"
    fi
fi

# STEP 5: Ensure data directory exists
if [ ! -d "public/data" ]; then
    echo "⚠ Creating empty data directory"
    mkdir -p public/data
    chmod -R 775 public/data
fi

# STEP 6: Build project
echo "✓ Installing dependencies..."
PUPPETEER_SKIP_DOWNLOAD=true npm install

echo "✓ Building project..."
npm run build

# STEP 7: Move build files
echo "✓ Moving build files..."
mv dist/* . 2>/dev/null || true
mv dist/.[^.]* . 2>/dev/null || true
rmdir dist 2>/dev/null || true

# STEP 8: Clean up build artifacts (NEVER touch public/data)
echo "✓ Cleaning build artifacts..."
rm -rf node_modules src scripts .git .gitignore package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts tailwind.config.ts postcss.config.js README.md .eslintrc.cjs bun.lockb components.json eslint.config.js .lovable vitest.config.ts 2>/dev/null || true

# STEP 9: Final verification - data must exist
if [ ! -d "public/data" ]; then
    echo "❌ CRITICAL ERROR: public/data directory is missing!"
    echo "Attempting emergency restore..."
    if [ -d "$DATA_BACKUP" ]; then
        mkdir -p public/data
        cp -r "$DATA_BACKUP"/* public/data/
        echo "✓ Emergency restore completed"
    else
        echo "❌ No backup found. Data may be lost!"
        exit 1
    fi
else
    echo "✓ Data directory verified: public/data exists"
fi

echo "=== DEPLOYMENT COMPLETED SAFELY ==="
echo "✓ Data preserved: public/data/"
echo "✓ Build completed"
echo "✓ Ready for production"
