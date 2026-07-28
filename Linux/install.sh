#!/bin/bash

# Pindah ke direktori utama proyek (folder induk dari script)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/.."

echo "========================================================"
echo "🚀 Script Instalasi Otomatis WhatsApp Bot (Linux/macOS)"
echo "========================================================"
echo ""

# 1. Cek & Otomatis Instal Node.js & NPM jika belum ada
if ! command -v node &> /dev/null
then
    echo "⚠️ Node.js belum terinstall! Memulai instalasi otomatis Node.js..."
    
    if [ -f /etc/debian_version ]; then
        echo "📦 Terdeteksi sistem Debian/Ubuntu. Menginstall via apt..."
        sudo apt update
        sudo apt install -y nodejs npm
    elif [ -f /etc/redhat-release ]; then
        echo "📦 Terdeteksi sistem RHEL/CentOS/Fedora. Menginstall via dnf..."
        sudo dnf install -y nodejs npm
    elif [ -f /etc/arch-release ]; then
        echo "📦 Terdeteksi sistem Arch Linux. Menginstall via pacman..."
        sudo pacman -S --noconfirm nodejs npm
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "📦 Terdeteksi macOS. Menginstall via Homebrew..."
        if ! command -v brew &> /dev/null; then
            echo "❌ Homebrew belum ada. Silakan install Node.js manual dari https://nodejs.org"
            exit 1
        fi
        brew install node
    else
        echo "❌ OS tidak dikenali secara otomatis. Silakan install Node.js manual dari https://nodejs.org"
        exit 1
    fi
    echo "✅ Node.js berhasil diinstall!"
else
    echo "✅ Node.js sudah terdeteksi: $(node -v)"
fi

# 2. Inisialisasi package.json jika belum ada
if [ ! -f "package.json" ]; then
    echo "📦 Membuat file package.json..."
    npm init -y
else
    echo "✅ package.json sudah ada."
fi

# 3. Install dependency Node.js
echo "📥 Menginstall library/dependency yang dibutuhkan..."
npm install whatsapp-web.js qrcode-terminal @google/generative-ai dotenv google-it google-tts-api

# 4. Buat folder aset yang dibutuhkan
echo "📁 Membuat folder aset lokal (somem & gambar)..."
mkdir -p somem
mkdir -p gambar

# 5. Buat file database JSON dasar jika belum ada
if [ ! -f "catatan.json" ]; then
    echo "{}" > catatan.json
    echo "📄 File catatan.json berhasil dibuat."
fi

if [ ! -f "hall_of_fame.json" ]; then
    echo "[]" > hall_of_fame.json
    echo "📄 File hall_of_fame.json berhasil dibuat."
fi

# 6. Input API Key Gemini
if [ ! -f ".env" ]; then
    echo "🔑 Pengaturan API Key Gemini"
    read -p "Masukkan GEMINI_API_KEY kamu: " api_key
    echo "GEMINI_API_KEY=$api_key" > .env
    echo "✅ API Key berhasil disimpan ke file .env!"
else
    echo "✅ File .env sudah ada."
fi

# 7. Berikan akses eksekusi ke run.sh
if [ -f "Linux/run.sh" ]; then
    chmod +x Linux/run.sh
fi

echo ""
echo "========================================================"
echo "✨ Instalasi Selesai! Siap menjalankan bot."
echo "👉 Untuk menjalankan bot, ketik: ./Linux/run.sh"
echo "========================================================"