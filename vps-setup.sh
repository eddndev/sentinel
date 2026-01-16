#!/bin/bash

# Sentinel VPS Setup Script
# Works on Ubuntu 20.04/22.04 LTS

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Sentinel VPS Setup ===${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (sudo -i)${NC}"
  exit 1
fi

# 1. Update System
echo -e "${GREEN}1. Updating system packages...${NC}"
apt-get update && apt-get upgrade -y
apt-get install -y curl git unzip build-essential ffmpeg nginx redis-server postgresql postgresql-contrib

# 2. Install Bun
if ! command -v bun &> /dev/null; then
    echo -e "${GREEN}2. Installing Bun...${NC}"
    curl -fsSL https://bun.sh/install | bash
    # Add to path for this session
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    # Make global symlink just in case
    ln -sf ~/.bun/bin/bun /usr/local/bin/bun
else
    echo -e "${BLUE}Bun already installed.${NC}"
fi

# 3. Install PM2
echo -e "${GREEN}3. Installing PM2...${NC}"
bun install -g pm2

# 4. Configure PostgreSQL
echo -e "${GREEN}4. Configuring PostgreSQL...${NC}"
# Check if user sentinel exists
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='sentinel'" | grep -q 1; then
    echo -n "Enter password for database user 'sentinel': "
    read -s DB_PASSWORD
    echo
    sudo -u postgres psql -c "CREATE USER sentinel WITH PASSWORD '$DB_PASSWORD';"
    sudo -u postgres psql -c "CREATE DATABASE sentinel OWNER sentinel;"
    echo -e "${GREEN}Database 'sentinel' created.${NC}"
else
    echo -e "${BLUE}User 'sentinel' already exists. Skipping creation.${NC}"
    DB_PASSWORD="<YOUR_DB_PASSWORD>"
fi

# 5. Project Directory
echo -e "${GREEN}5. Setting up Project Directory...${NC}"
mkdir -p /var/www/sentinel
chown -R $USER:$USER /var/www/sentinel
chmod -R 755 /var/www/sentinel

# 6. Nginx Configuration
echo -e "${GREEN}6. Configuring Nginx...${NC}"
read -p "Enter your domain name (e.g., app.example.com): " DOMAIN_NAME

cat > /etc/nginx/sites-available/sentinel <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    # Frontend (Static Files)
    location / {
        root /var/www/sentinel/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }

    # Backend API Proxy
    location /api/ {
        # Strip /api prefix if your backend doesn't expect it, 
        # BUT based on your routes, if you use grouping, check this.
        # Assuming backend runs on root paths, we might need rewrite.
        # If backend expects /api/auth, pass as is.
        proxy_pass http://127.0.0.1:8080/; 
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable Site
ln -sf /etc/nginx/sites-available/sentinel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo -e "${GREEN}=== Setup Complete ===${NC}"
echo -e "Next steps:"
echo -e "1. Copy your code to /var/www/sentinel"
echo -e "2. Create a .env file in /var/www/sentinel/backend/.env with:"
echo -e "   DATABASE_URL=postgresql://sentinel:$DB_PASSWORD@localhost:5432/sentinel"
echo -e "   REDIS_URL=redis://localhost:6379"
echo -e "   PORT=8080"
echo -e "3. Build and Run:"
echo -e "   cd /var/www/sentinel/backend && bun install && bunx prisma migrate deploy && bun run build"
echo -e "   cd /var/www/sentinel/frontend && bun install && bun run build"
echo -e "   pm2 start /var/www/sentinel/backend/dist/index.js --name sentinel-backend"
echo -e "   pm2 save"
