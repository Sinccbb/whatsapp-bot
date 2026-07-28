@echo off
chcp 65001 >nul
:: Pindah ke direktori utama proyek (folder induk dari script)
cd /d "%~dp0\.."

echo ========================================================
echo 🚀 Script Instalasi Otomatis WhatsApp Bot (Windows)
echo ========================================================
echo.

:: 1. Cek & Otomatis Instal Node.js jika belum ada
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ Node.js belum terinstall! Memulai instalasi otomatis Node.js via winget...
    where winget >nul 2>nul
    if %errorlevel% equ 0 (
        winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        echo ✅ Node.js berhasil dipasang!
    ) else (
        echo ❌ winget tidak ditemukan. Silakan download & install Node.js manual dari: https://nodejs.org
        pause
        exit /b 1
    )
) else (
    echo ✅ Node.js sudah terdeteksi.
)

:: 2. Inisialisasi package.json
if not exist "package.json" (
    echo 📦 Membuat file package.json...
    call npm init -y
) else (
    echo ✅ package.json sudah ada.
)

:: 3. Install dependency
echo 📥 Menginstall library yang dibutuhkan...
call npm install whatsapp-web.js qrcode-terminal @google/generative-ai dotenv google-it google-tts-api

:: 4. Buat folder aset
echo 📁 Membuat folder aset lokal (somem ^& gambar)...
if not exist "somem" mkdir somem
if not exist "gambar" mkdir gambar

:: 5. Buat file database JSON dasar
if not exist "catatan.json" (
    echo {} > catatan.json
    echo 📄 File catatan.json berhasil dibuat.
)
if not exist "hall_of_fame.json" (
    echo [] > hall_of_fame.json
    echo 📄 File hall_of_fame.json berhasil dibuat.
)

:: 6. Input API Key & Buat .env
if not exist ".env" (
    echo 🔑 Pengaturan GEMINI API KEY
    set /p API_KEY="Masukkan GEMINI_API_KEY kamu: "
    echo GEMINI_API_KEY=%API_KEY% > .env
    echo ✅ File .env berhasil dibuat dengan API Key kamu!
) else (
    echo ✅ File .env sudah ada.
)

echo.
echo ========================================================
echo ✨ Instalasi Selesai! Siap menjalankan bot.
echo 👉 Kamu bisa jalankan "run.bat" yang ada di folder Windows.
echo ========================================================
pause