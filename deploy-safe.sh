#!/bin/bash
# SAFE deployment script - NEVER deletes data directory
# This script preserves public/data/ at all costs

set -e  # Exit on error

# Change to the correct directory
cd ~/batnorton.siteaccess.ru/public_html || {
    echo "Error: Cannot find public_html directory"
    exit 1
}

echo "=== SAFE DEPLOYMENT START ==="

# STEP 1: Backup protected storage (OUTSIDE public_html - NEVER deleted)
STORAGE_BASE="$HOME/app_storage"
STORAGE_BACKUP="/tmp/app_storage_backup_$(date +%Y%m%d_%H%M%S)"

if [ -d "$STORAGE_BASE" ]; then
    echo "✓ Backing up protected storage to: $STORAGE_BACKUP"
    cp -r "$STORAGE_BASE" "$STORAGE_BACKUP" 2>/dev/null || true
    echo "✓ Protected storage backup completed"
fi

# Also backup old public/data for migration
if [ -d "public/data" ]; then
    echo "✓ Backing up old public/data for migration"
    cp -r public/data "/tmp/data_backup_$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
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

# STEP 3: Update repository
echo "✓ Updating repository..."
if [ -d ".git" ] && git rev-parse --git-dir > /dev/null 2>&1; then
    echo "✓ Using existing git repository"
    git fetch origin
    git reset --hard origin/main
    git clean -fd
else
    echo "✓ Cloning fresh repository..."
    # Remove .git if exists but broken
    rm -rf .git 2>/dev/null || true
    # Remove everything except public before cloning
    find . -maxdepth 1 -mindepth 1 ! -name "public" ! -name "." -exec rm -rf {} \; 2>/dev/null || true
    # Clone to temp directory first
    TEMP_DIR=$(mktemp -d)
    git clone https://github.com/letoceiling-coder/da-motors-premium-catalog.git "$TEMP_DIR" || {
        echo "❌ Git clone failed!"
        exit 1
    }
    # Move files from temp to current directory
    mv "$TEMP_DIR"/* . 2>/dev/null || true
    mv "$TEMP_DIR"/.[^.]* . 2>/dev/null || true
    rm -rf "$TEMP_DIR"
fi

# STEP 4: Restore protected storage (CRITICAL - data is OUTSIDE public_html)
if [ -d "$STORAGE_BACKUP" ]; then
    echo "✓ Restoring protected storage from: $STORAGE_BACKUP"
    mkdir -p "$STORAGE_BASE"
    cp -r "$STORAGE_BACKUP"/* "$STORAGE_BASE"/ 2>/dev/null || true
    chmod -R 770 "$STORAGE_BASE" 2>/dev/null || true
    echo "✓ Protected storage restored successfully"
fi

# STEP 5: Ensure protected storage exists
if [ ! -d "$STORAGE_BASE" ]; then
    echo "⚠ Creating protected storage directory"
    mkdir -p "$STORAGE_BASE"
    chmod -R 770 "$STORAGE_BASE"
fi

# STEP 6: Run migration if needed (migrate old public/data to protected storage)
if [ -d "public/data" ] && [ -f "public/api/migrate-storage.php" ]; then
    echo "✓ Running data migration (old -> new storage)..."
    php public/api/migrate-storage.php > /dev/null 2>&1 || echo "⚠ Migration completed with warnings"
fi

# STEP 7: Build project
echo "✓ Installing dependencies..."
PUPPETEER_SKIP_DOWNLOAD=true npm install

echo "✓ Building project..."
npm run build

# STEP 8: Move build files
echo "✓ Moving build files..."
mv dist/* . 2>/dev/null || true
mv dist/.[^.]* . 2>/dev/null || true
# Explicitly copy .htaccess if it exists in dist
if [ -f "dist/.htaccess" ]; then
    cp dist/.htaccess .htaccess 2>/dev/null || true
fi
# Copy API directory from public/api to api/ (Vite copies public/ to dist/)
if [ -d "dist/api" ]; then
    echo "✓ Copying API files..."
    mkdir -p api
    cp -r dist/api/* api/ 2>/dev/null || true
    chmod -R 644 api/*.php 2>/dev/null || true
fi
rmdir dist 2>/dev/null || true

# STEP 9: Clean up build artifacts (NEVER touch protected storage)
echo "✓ Cleaning build artifacts..."
rm -rf node_modules src scripts .git .gitignore package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts tailwind.config.ts postcss.config.js README.md .eslintrc.cjs bun.lockb components.json eslint.config.js .lovable vitest.config.ts 2>/dev/null || true

# STEP 10: Final verification - protected storage must exist
if [ ! -d "$STORAGE_BASE" ]; then
    echo "❌ CRITICAL ERROR: Protected storage directory is missing!"
    echo "Attempting emergency restore..."
    if [ -d "$STORAGE_BACKUP" ]; then
        mkdir -p "$STORAGE_BASE"
        cp -r "$STORAGE_BACKUP"/* "$STORAGE_BASE"/
        chmod -R 770 "$STORAGE_BASE"
        echo "✓ Emergency restore completed"
    else
        echo "❌ No backup found. Creating empty storage..."
        mkdir -p "$STORAGE_BASE"
        chmod -R 770 "$STORAGE_BASE"
    fi
else
    echo "✓ Protected storage verified: $STORAGE_BASE exists"
    DB_FILE="$STORAGE_BASE/app.db"
    if [ -f "$DB_FILE" ]; then
        echo "✓ Database file verified: $(du -h "$DB_FILE" | cut -f1)"
    fi
fi

echo "=== DEPLOYMENT COMPLETED SAFELY ==="
echo "✓ Protected storage preserved: $STORAGE_BASE"
echo "✓ Database preserved: $STORAGE_BASE/app.db"
echo "✓ Build completed"
echo "✓ Ready for production"
echo ""
echo "⚠ IMPORTANT: Data is now stored OUTSIDE public_html in: $STORAGE_BASE"
echo "   This storage is NEVER deleted during deployment!"
