@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo ========================================================
echo 🚀 Script Instalasi Otomatis WhatsApp Bot (Windows)
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js belum terinstall! Silakan install Node.js (v18+) terlebih dahulu.
    pause
    exit /b 1
) else (
    echo ✅ Node.js terdeteksi.
)

if not exist "package.json" (
    echo 📦 Membuat file package.json...
    call npm init -y
)

echo 📥 Menginstall library yang dibutuhkan...
call npm install whatsapp-web.js qrcode-terminal @google/generative-ai dotenv google-it google-tts-api

echo 📁 Membuat folder aset lokal (somem & gambar)...
if not exist "somem" mkdir somem
if not exist "gambar" mkdir gambar

if not exist "catatan.json" echo {} > catatan.json
if not exist "hall_of_fame.json" echo [] > hall_of_fame.json

if not exist ".env" (
    echo 🔑 Pengaturan GEMINI API KEY
    set /p API_KEY="Masukkan GEMINI_API_KEY kamu: "
    echo GEMINI_API_KEY=%API_KEY% > .env
    echo ✅ File .env berhasil dibuat dengan API Key kamu!
)

echo.
echo ========================================================
echo ✨ Instalasi Selesai! Siap menjalankan bot.
echo 👉 Tinggal klik 2 kali file "run.bat"!
echo ========================================================
pause