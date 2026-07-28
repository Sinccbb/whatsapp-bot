@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo 🤖 Memulai WhatsApp Bot...
echo.

if not exist ".env" (
    echo ❌ File .env tidak ditemukan! Jalankan install.bat terlebih dahulu.
    pause
    exit /b 1
)

node index.js
pause