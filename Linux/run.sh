#!/bin/bash

# Pindah ke direktori utama proyek
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/.."

echo "🤖 Memulai WhatsApp Bot..."
echo ""

if [ ! -f ".env" ]; then
    echo "❌ File .env tidak ditemukan! Jalankan ./Linux/install.sh terlebih dahulu."
    exit 1
fi

node index.js
