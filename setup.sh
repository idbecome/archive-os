#!/bin/bash

echo "=============================="
echo "🚀 SETUP PUSTAKA APP SERVER"
echo "=============================="

# update system
sudo apt update -y
sudo apt upgrade -y

# install curl
sudo apt install -y curl

# install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# cek versi
node -v
npm -v

# install pm2
sudo npm install -g pm2

# masuk folder project (ubah jika beda path)
APP_DIR="/home/casaos/project/pustaka"
cd $APP_DIR || exit

# install dependency
npm install

# start app with pm2
pm2 start npm --name "pustaka-app" -- run dev

# setup autorun
pm2 startup
pm2 save

echo "=============================="
echo "✅ SETUP SELESAI"
echo "Akses app kamu sekarang"
echo "Gunakan: pm2 list"
echo "=============================="
