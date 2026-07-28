require('dotenv').config(); 
const googleIt = require('google-it'); 

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js'); 
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs'); 
const { getAudioUrl } = require('google-tts-api');

// --- PENGATURAN API KEY GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// --- PENGATURAN DATABASE, SISTEM JEDA & SESI GAME ---
const fileCatatan = './catatan.json';
if (!fs.existsSync(fileCatatan)) {
    fs.writeFileSync(fileCatatan, JSON.stringify({}));
}
let waktuTerakhirTTS = 0; 
let waktuTerakhirSearch = 0;
const sesiGame = {}; 

// --- DATA SOAL CAK LONTONG ---
const cakLontong = [
    { soal: "Makan makan apa yang mudah?", jawaban: "Tahu Easy", deskripsi: "xixixixixixixixi" },
    { soal: "Restoran apa yang rugi?", jawaban: "Restoran Mie Ga Cuan", deskripsi: "xixixixixixixixi" },
    { soal: "Kenapa matahari tenggelam?", jawaban: "Karena gak bisa berenang", deskripsi: "xixixixixixixixi" },
    { soal: "Burung, burung apa yang suka nolak?", jawaban: "Burung Gak Gak", deskripsi: "xixixixixixixixi terkocok perut bapack" },
    { soal: "Sayuran apa yang dingin?", jawaban: "Sayur Cold", deskripsi: "xixixixixixixixi" },
    { soal: "Gula, gula apa yang bukan gula?", jawaban: "Gula Aren't", deskripsi: "xixixixixixixixi" },
    { soal: "Nama kota apa yang banyak bapak-bapaknya?", jawaban: "Purwodaddy", deskripsi: "xixixixixixi" }
];

// --- DATA & FUNGSI TEBAK KATA (HANGMAN) ---
const HOF_FILE = './hall_of_fame.json';
let wordBankTebakKata = ["AMBA", "JUNAIDI", "PAIDI", "SUPADI", "UNCLESAM", "KOMPUTER", "POHON", "WASAP"];
const MAX_WRONG = 6;
const sesiTebakKata = {}; 

let hofTebakKata = [];
if (fs.existsSync(HOF_FILE)) {
    try {
        hofTebakKata = JSON.parse(fs.readFileSync(HOF_FILE, 'utf-8'));
    } catch (e) {
        hofTebakKata = [];
    }
}

function getHangmanArt(wrong) {
    let art = "```\n +---+\n |   |\n";
    if (wrong >= 1) art += " O   |\n"; else art += "     |\n";
    if (wrong === 2) art += " |   |\n"; 
    else if (wrong === 3) art += "/|   |\n"; 
    else if (wrong >= 4) art += "/|\\  |\n"; 
    else art += "     |\n";
    if (wrong === 5) art += "/    |\n"; 
    else if (wrong >= 6) art += "/ \\  |\n"; 
    else art += "     |\n";
    art += "     |\n=========```";
    return art;
}

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('🎉 Mantap! Bot WhatsApp online, semua fitur aktif dan API Key aman!');
});

// --- MESIN PENGOLAH PESAN ---
client.on('message_create', async message => {
    const teks = message.body;
    const chatId = message.fromMe ? message.to : message.from; 

    if (!teks) return; 

    // --- CEK JAWABAN GAME CAK LONTONG ---
    if (sesiGame[chatId] && teks.startsWith('!jawab ')) {
        const jawabanUser = teks.replace('!jawab ', '').trim().toLowerCase(); 
        const jawabanBenar = sesiGame[chatId].jawaban.toLowerCase();

        if (jawabanUser === jawabanBenar) {
            await message.reply(`🎉 BENAR!\n\nJawaban: *${sesiGame[chatId].jawaban.toUpperCase()}*\nAlasan: ${sesiGame[chatId].deskripsi}`);
            delete sesiGame[chatId]; 
            return;
        } 
    }

    if (teks === '!nyerah' && sesiGame[chatId]) {
        await message.reply(`Wooo nyerah!\n\nJawaban: *${sesiGame[chatId].jawaban.toUpperCase()}*\nAlasan: ${sesiGame[chatId].deskripsi}`);
        delete sesiGame[chatId];
        return;
    }

    // --- 0. FITUR GAME CAK LONTONG ---
    if (teks === '!game') {
        if (sesiGame[chatId]) {
            await message.reply('Selesaikan dulu game yang lagi jalan, atau ketik *!nyerah*.');
            return;
        }

        const soalAcak = cakLontong[Math.floor(Math.random() * cakLontong.length)];

        sesiGame[chatId] = {
            jawaban: soalAcak.jawaban,
            deskripsi: soalAcak.deskripsi
        };

        await message.reply(`🎮 *TEBAK-TEBAKAN CAK LONTONG* 🎮\n\n📝 Soal: *${soalAcak.soal}*\n\n_Balas dengan *!jawab <jawabanmu>*. Ketik *!nyerah* kalau pusing mikirnya._`);
        return;
    }

    // --- 1. FITUR PESAN SUARA (TTS) ---
    if (teks.startsWith('!suara ')) {
        const sekarang = Date.now(); 
        const jeda = 10000; 

        if (sekarang - waktuTerakhirTTS < jeda) {
            const sisaWaktu = Math.ceil((jeda - (sekarang - waktuTerakhirTTS)) / 1000);
            await message.reply(`Sabar! Mesin suaranya lagi pendinginan biar nggak panas. Tunggu *${sisaWaktu} detik* lagi ya.`);
            return;
        }

        const teksSuara = teks.replace('!suara ', '').trim();
        if (!teksSuara) {
            await message.reply('Teksnya mana? Contoh ketik: *!suara Halo kawan-kawan*');
            return;
        }

        try {
            waktuTerakhirTTS = sekarang; 
            const urlAudio = getAudioUrl(teksSuara, {
                lang: 'id',
                slow: false,
                host: 'https://translate.google.com',
            });

            const media = await MessageMedia.fromUrl(urlAudio, { unsafeMime: true });
            await client.sendMessage(message.from, media, { sendAudioAsVoice: true });
            
        } catch (error) {
            console.error('Mesin suara ngadat:', error);
            await message.reply('Waduh, pita suara bot lagi serak. Gagal bikin pesan suara.');
        }
        return;
    }

    // --- 2. FITUR GUDANG CATATAN ---
    if (teks.startsWith('!simpan ')) {
        const isiPesan = teks.replace('!simpan ', '').trim();
        const spasiPertama = isiPesan.indexOf(' ');
        
        if (spasiPertama === -1) {
            await message.reply('Format salah! Ketik: *!simpan <judul> <isi catatannya>*');
            return;
        }

        const judul = isiPesan.substring(0, spasiPertama).toLowerCase();
        const isi = isiPesan.substring(spasiPertama + 1);

        const dataCatatan = JSON.parse(fs.readFileSync(fileCatatan));
        dataCatatan[judul] = isi;
        fs.writeFileSync(fileCatatan, JSON.stringify(dataCatatan, null, 2));

        await message.reply(`✅ Siap! Catatan *${judul}* sudah aman tersimpan di gudang.`);
        return;
    }

    if (teks.startsWith('!catatan ')) {
        const judul = teks.replace('!catatan ', '').trim().toLowerCase();
        const dataCatatan = JSON.parse(fs.readFileSync(fileCatatan));

        if (dataCatatan[judul]) {
            await message.reply(`📝 *Catatan: ${judul}*\n\n${dataCatatan[judul]}`);
        } else {
            await message.reply(`Waduh, catatan *${judul}* nggak ketemu di gudang nih.`);
        }
        return;
    }

    if (teks === '!listcatatan') {
        const dataCatatan = JSON.parse(fs.readFileSync(fileCatatan));
        const daftarJudul = Object.keys(dataCatatan); 

        if (daftarJudul.length === 0) {
            await message.reply('Gudang catatan masih kosong');
        } else {
            let pesanBalasan = '📚 *DAFTAR CATATAN TERSIMPAN* 📚\n\n';
            daftarJudul.forEach((j, index) => {
                pesanBalasan += `${index + 1}. ${j}\n`;
            });
            pesanBalasan += `\n_Ketik *!catatan <judul>* untuk membukanya._`;
            await message.reply(pesanBalasan);
        }
        return;
    }

    // --- 3. FITUR STIKER TEKS ---
    if (teks.startsWith('!stiker')) {
        let teksStiker = teks.replace('!stiker', '').trim();
        teksStiker = teksStiker.replace(/^["']|["']$/g, ''); 

        if (!teksStiker) {
            await message.reply('Mana text nya?');
            return;
        }

        try {
            const urlGambar = `https://placehold.co/512x512/128C7E/FFFFFF.png?text=${encodeURIComponent(teksStiker)}`;
            const media = await MessageMedia.fromUrl(urlGambar, { unsafeMime: true });
            
            await client.sendMessage(message.from, media, { 
                sendMediaAsSticker: true, 
                stickerName: 'Stiker Teks', 
                stickerAuthor: 'Bot Wasap' 
            });
        } catch (error) {
            console.error('Waduh, gagal bikin stiker teks:', error);
            await message.reply('Waduh, gagal bikin sticker.');
        }
        return;
    }

    // --- 4. FITUR PEMANDANGAN ALAM ---
    if (teks === '!pemandangan' || teks === '!healing') {
        try {
            await message.reply('Sedang mencari spot pemandangan alam terbaik buat kamu... 🏞️');
            
            const angkaAcak = Math.floor(Math.random() * 1000);
            const urlGambar = `https://loremflickr.com/800/600/nature,landscape?lock=${angkaAcak}`;
            
            const media = await MessageMedia.fromUrl(urlGambar, { unsafeMime: true });
            await client.sendMessage(message.from, media, { caption: 'nih' });
        } catch (error) {
            console.error('Kamera gagal menjepret:', error);
            await message.reply('Waduh, error bang');
        }
        return;
    }

    // --- 5A. FITUR SOUND MEME (TANPA RENAME NAMA FILE) ---
    if (teks === '!soundmeme') {
        const folderSomem = './somem';
        
        if (!fs.existsSync(folderSomem)) {
            await message.reply('Folder "somem" belum dibikin nih.');
            return;
        }

        try {
            const files = fs.readdirSync(folderSomem);
            
            if (files.length === 0) {
                await message.reply('Folder "somem" masih kosong.');
                return;
            }

            // Otomatis memilih file apapun yang ada di folder
            const fileAcak = files[Math.floor(Math.random() * files.length)];
            const pathSuara = `${folderSomem}/${fileAcak}`;

            const media = MessageMedia.fromFilePath(pathSuara);
            await client.sendMessage(message.from, media);
        } catch (error) {
            console.error('Gagal ngirim sound meme:', error);
            await message.reply('Waduh, gagal ngirim suaranya.');
        }
        return;
    }

    // --- 5B. FITUR GAMBAR RANDOM (TANPA RENAME NAMA FILE) ---
    if (teks === '!gambarrandom') {
        const folderGambar = './gambar';
        
        if (!fs.existsSync(folderGambar)) {
            await message.reply('Folder "gambar" belum dibikin nih. Bikin dulu foldernya ya bos!');
            return;
        }

        try {
            const files = fs.readdirSync(folderGambar);
            
            if (files.length === 0) {
                await message.reply('Folder "gambar" masih kosong melompong.');
                return;
            }

            // Otomatis memilih gambar apapun yang ada di folder
            const fileAcak = files[Math.floor(Math.random() * files.length)];
            const pathGambar = `${folderGambar}/${fileAcak}`;

            const media = MessageMedia.fromFilePath(pathGambar);
            await client.sendMessage(message.from, media, { caption: 'Ini gambar random buat kamu!' });
        } catch (error) {
            console.error('Gagal ngirim gambar random:', error);
            await message.reply('Waduh, gagal ngirim gambarnya nih. Pastikan format filenya didukung ya.');
        }
        return;
    }

    // --- 6. SEARCH INTERNET (GOOGLE-IT) DENGAN JEDA ---
    if (teks.startsWith('!search ')) {
        const sekarang = Date.now(); 
        const jeda = 15000; // Jeda 15 detik 

        if (sekarang - waktuTerakhirSearch < jeda) {
            const sisaWaktu = Math.ceil((jeda - (sekarang - waktuTerakhirSearch)) / 1000);
            await message.reply(`Sabar! Mesin pencarinya lagi ambil napas biar nggak diblokir. Tunggu *${sisaWaktu} detik* lagi ya.`);
            return;
        }

        const query = teks.replace('!search ', '').trim();
        
        if (!query) {
            await message.reply('Mau cari apa? Contoh: *!search jadwal sholat hari ini*');
            return;
        }

        try {
            waktuTerakhirSearch = sekarang; 
            await message.reply(`🔍 Sedang meluncur ke Google untuk mencari: *${query}*...`);
            
            const results = await googleIt({ 'query': query, 'disableConsole': true });
            
            if (!results || results.length === 0) {
                await message.reply('Waduh, Google nggak nemu hasil apa-apa nih.');
                return;
            }

            let pesanBalasan = `🌐 *HASIL PENCARIAN GOOGLE: ${query}*\n\n`;
            const batas = Math.min(3, results.length); // Ambil 3 teratas
            
            for (let i = 0; i < batas; i++) {
                const res = results[i];
                pesanBalasan += `*${i + 1}. ${res.title}*\n`;
                pesanBalasan += `📝 _${res.snippet}_\n`;
                pesanBalasan += `🔗 ${res.link}\n\n`;
            }

            await message.reply(pesanBalasan);
        } catch (error) {
            console.error('Error saat Search:', error);
            await message.reply('Gagal mencari di internet. Mesin pencarinya lagi ditahan sama satpam Google.');
        }
        return;
    }

    // --- 7. MENU JADUL LAINNYA ---
    if (teks === '!ping') {
        await message.reply('Jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa jawa');
        return; 
    }

    if (teks === '!menu') {
        const teksMenu = `🤖 *MENU BOT WASAP* 🤖\n\n` +
                         `1. *!ping* - Cek status mesin bot\n` +
                         `2. *!tanya <pertanyaan>* - Ngobrol pintar dengan AI\n` +
                         `3. *!search <kata kunci>* - Cari info di internet\n` +
                         `4. *!stiker <teks>* - Sulap teks menjadi stiker\n` +
                         `5. *!simpan <judul> <isi>* - Simpan catatan penting\n` +
                         `6. *!catatan <judul>* - Buka catatan tersimpan\n` +
                         `7. *!listcatatan* - Lihat semua isi gudang\n` +
                         `8. *!pemandangan* - Cuci mata lihat foto alam\n` +
                         `9. *!suara <teks>* - Ubah teks jadi Voice Note (Jeda 10 dtk)\n` +
                         `10. *!game* - Main tebak-tebakan Cak Lontong\n` +
                         `11. *!soundmeme* - Kirim random sound meme\n` +
                         `12. *!gambarrandom* - Kirim random gambar dari folder\n` +
                         `13. *!tebakkata <nama>* - Memulai game Hangman\n` +
                         `14. *!tebak <huruf>* - Menebak huruf Hangman\n` +
                         `15. *!lihatskor* - Cek papan peringkat Hangman\n\n` +
                         `_Ketik perintah di atas untuk menggunakan fitur bot._`;
        await message.reply(teksMenu);
        return;
    }

    // --- 8. FITUR AI (GEMINI VIA !tanya) ---
    if (teks.startsWith('!tanya')) {
        const pertanyaan = teks.replace('!tanya', '').trim();

        if (!pertanyaan) {
            await message.reply('Kamu nanya?');
            return;
        }

        try {
            const result = await aiModel.generateContent(pertanyaan);
            const balasanAI = result.response.text();
            await message.reply(balasanAI);
        } catch (error) {
            console.error("Error AI:", error);
            await message.reply("API lagi sibuk, ntar ae");
        }
        return; 
    }

    // --- 9. FITUR GAME: TEBAK KATA (HANGMAN) ---
    if (teks.startsWith('!tebakkata ')) {
        const namaPemain = teks.replace('!tebakkata ', '').trim();

        if (!namaPemain) {
            await message.reply('Tulis namamu dong! Contoh: *!tebakkata Budi*');
            return;
        }

        if (sesiTebakKata[chatId]) {
            await message.reply('Selesaikan dulu tebak kata yang lagi jalan, atau ketik *!nyerahtebak*.');
            return;
        }

        const secretWord = wordBankTebakKata[Math.floor(Math.random() * wordBankTebakKata.length)];
        
        sesiTebakKata[chatId] = {
            nama: namaPemain,
            waktuMulai: Date.now(), // Pencatat waktu mulai
            secret: secretWord,
            display: Array(secretWord.length).fill('_'),
            guessed: [],
            wrong: 0
        };

        let pesan = `🎮 *GAME TEBAK KATA* 🎮\n\n`;
        pesan += `Pemain: *${namaPemain}*\n`;
        pesan += `Kata ini punya *${secretWord.length} huruf*.\n\n`;
        pesan += `Kata: ${sesiTebakKata[chatId].display.join(' ')}\n\n`;
        pesan += `Balas dengan *!tebak <huruf>* (contoh: !tebak A).`;
        
        await message.reply(pesan);
        return;
    }

    if (teks === '!nyerahtebak' && sesiTebakKata[chatId]) {
        await message.reply(`Yah, menyerah! Kepalamu digantung.\nKata rahasianya adalah: *${sesiTebakKata[chatId].secret}*`);
        delete sesiTebakKata[chatId];
        return;
    }

    if (teks.startsWith('!tebak ') && sesiTebakKata[chatId]) {
        const huruf = teks.replace('!tebak ', '').trim().toUpperCase()[0]; 
        const game = sesiTebakKata[chatId];

        if (!huruf || !/[A-Z]/.test(huruf)) {
            await message.reply('Masukkan satu huruf aja! (contoh: *!tebak A*)');
            return;
        }

        if (game.guessed.includes(huruf)) {
            await message.reply(`Huruf *${huruf}* udah pernah ditebak! Coba yang lain.`);
            return;
        }

        game.guessed.push(huruf);
        let benar = false;

        for (let i = 0; i < game.secret.length; i++) {
            if (game.secret[i] === huruf) {
                game.display[i] = huruf;
                benar = true;
            }
        }

        if (!benar) {
            game.wrong++;
        }

        const isMenang = !game.display.includes('_');
        const isKalah = game.wrong >= MAX_WRONG;

        let statusPesan = benar ? `✅ Benar! Huruf *${huruf}* ada.` : `❌ Salah! Huruf *${huruf}* nggak ada.`;
        let gambarHangman = getHangmanArt(game.wrong);
        let tampilanKata = game.display.join(' ');
        let hurufDitebak = game.guessed.join(', ');

        let balasan = `${statusPesan}\n${gambarHangman}\n\nKata: *${tampilanKata}*\nNyawa tersisa: ${MAX_WRONG - game.wrong}\nSudah ditebak: ${hurufDitebak}`;

        if (isMenang) {
            const durasi = Math.floor((Date.now() - game.waktuMulai) / 1000); 
            
            hofTebakKata.push({
                nama: game.nama,
                kata: game.secret,
                durasi: durasi,
                tanggal: new Date().toLocaleDateString('id-ID')
            });

            fs.writeFileSync(HOF_FILE, JSON.stringify(hofTebakKata, null, 2));

            balasan += `\n\n🎉 *SELAMAT ${game.nama}!* Kamu menebak kata *${game.secret}* dalam waktu *${durasi} detik*! 🏆\nNamamu sudah aman tercatat di Hall of Fame.`;
            delete sesiTebakKata[chatId];
        } else if (isKalah) {
            balasan += `\n\n💀 *GAME OVER ${game.nama}!* Kamu digantung.\nKata rahasianya adalah: *${game.secret}*`;
            delete sesiTebakKata[chatId];
        }

        await message.reply(balasan);
        return;
    }

    // --- 10. FITUR LIHAT HALL OF FAME ---
    if (teks === '!lihatskor') {
        if (hofTebakKata.length === 0) {
            await message.reply('Belum ada pahlawan di Hall of Fame nih. Yuk main dan cetak rekor!');
            return;
        }

        let skorDiurutkan = [...hofTebakKata].sort((a, b) => a.durasi - b.durasi);
        
        let pesanBalasan = `🏆 *HALL OF FAME (TEBAK KATA)* 🏆\n_Diurutkan dari pemain tercepat_\n\n`;
        
        const batas = Math.min(10, skorDiurutkan.length);
        for (let i = 0; i < batas; i++) {
            const data = skorDiurutkan[i];
            pesanBalasan += `*${i + 1}. ${data.nama}*\n`;
            pesanBalasan += `⏱️ Waktu: ${data.durasi} detik | 📝 Kata: ${data.kata}\n`;
            pesanBalasan += `📅 Tanggal: ${data.tanggal}\n\n`;
        }

        await message.reply(pesanBalasan);
        return;
    }

}); // Penutup mesin yang aman sekarang ada di sini!

client.initialize();