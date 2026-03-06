#!/bin/bash

echo "=============================="
echo "🚀 SETUP PUSTAKA SERVER"
echo "=============================="

APP_DIR="/home/casaos/project/pustaka"
DB_NAME="pustaka"
DB_USER="pustaka_user"
DB_PASS="123456"
ROOT_PASS="rootpassword"

# =========================
# Update system
# =========================
sudo apt update -y
sudo apt upgrade -y
sudo apt install -y curl ca-certificates gnupg lsb-release

# =========================
# Install Docker
# =========================
if ! command -v docker &> /dev/null; then
  echo "🐳 Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
fi

# =========================
# Install Node.js LTS
# =========================
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# =========================
# Install PM2
# =========================
sudo npm install -g pm2

# =========================
# Run MariaDB container
# =========================
echo "🐬 Starting MariaDB container..."

docker run -d \
  --name mariadb \
  -e MYSQL_ROOT_PASSWORD=$ROOT_PASS \
  -e MYSQL_DATABASE=$DB_NAME \
  -p 3306:3306 \
  --restart unless-stopped \
  mariadb:latest

echo "⏳ Waiting MariaDB to start..."
sleep 20

# =========================
# Create DB & User
# =========================
echo "🛠️ Configuring database..."

docker exec -i mariadb mysql -uroot -p$ROOT_PASS <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME;
CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
FLUSH PRIVILEGES;
SELECT Host, User FROM mysql.user;
EOF

# =========================
# Install app dependencies
# =========================
cd $APP_DIR || exit

npm install

# =========================
# Start app with PM2
# =========================
pm2 start npm --name "pustaka-app" -- run dev
pm2 startup
pm2 save

echo "=============================="
echo "✅ SETUP SELESAI"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Password: $DB_PASS"
echo "App: pustaka-app (PM2)"
echo "=============================="