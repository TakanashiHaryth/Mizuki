# Mizuki — WhatsApp Community Bot

Current release: **v1.1.0**. See [CHANGELOG.md](CHANGELOG.md) for release history.

Bot kumpulan WhatsApp berasaskan TypeScript dengan AI Gemini, alat admin, poll,
penukaran media dan permainan ringkas.

## Arahan

Prefix boleh diubah melalui `BOT_PREFIX` dalam `.env` (contoh di bawah menggunakan `!m`).

| Kategori | Arahan |
|---|---|
| Admin | `!mkick`, `!mpromote`, `!mdemote`, `!mtagall`, `!mdelete` |
| General | `!mhelp`, `!mping`, `!minfobot`, `!minfogroup`, `!minfomember`, `!mowner`, `!mprivacy` |
| AI | `Mizuki, [mesej]`, `!mai [mesej]`, `!mforgetme` |
| Utility | `!mpoll Soalan \| Pilihan 1 \| Pilihan 2` |
| Minigame | `!mflipcoin`, `!mdice` |
| Media | `!msticker`, `!mimg`, `!mtovideo`, `!mtogif` |

`!mtogif` menukar video maksimum 10 saat kepada animated WhatsApp sticker (WebP),
bukan video MP4 dengan paparan GIF.

Sticker gambar dan animated sticker membawa metadata pack/author yang boleh diubah
melalui `STICKER_PACK_NAME` dan `STICKER_AUTHOR` dalam `.env`.

Untuk proses AI dan media, Mizuki memberi reaction `⏳` semasa bekerja, kemudian
menggantikannya dengan `✅` apabila berjaya atau `❌` apabila gagal.

## Keperluan

- Node.js 20 atau lebih baharu
- MySQL 8 atau MariaDB (MySQL dalam XAMPP juga boleh)
- ffmpeg untuk arahan video/GIF
- Nombor WhatsApp khas sangat disarankan

Selepas memasang ffmpeg dengan `winget`, tutup dan buka semula PowerShell sebelum
menjalankan `ffmpeg -version`.

## Pemasangan

1. Pasang dependency:

   ```powershell
   npm install
   ```

2. Salin `.env.example` kepada `.env`, kemudian isi API key dan akaun database.
   Jangan padam `.env.example`; fail itu ialah templat selamat untuk GitHub.

3. Ubah `personality.md` untuk personaliti, gaya bahasa dan pilihan Mizuki.

4. Cipta database dan pengguna khas (jangan gunakan akaun `root` untuk hosting):

   ```sql
   CREATE DATABASE mizuki_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'mizuki'@'localhost' IDENTIFIED BY 'kata_laluan_yang_kuat';
   GRANT ALL PRIVILEGES ON mizuki_bot.* TO 'mizuki'@'localhost';
   FLUSH PRIVILEGES;
   ```

5. Jalankan migrasi dan ujian:

   ```powershell
   npm run migrate
   npm test
   ```

6. Mulakan bot:

   ```powershell
   npm run dev
   ```

   Imbas QR melalui WhatsApp > Linked devices. Sesi disimpan dalam `auth_state/`,
   jadi QR tidak perlu diimbas semula selagi folder itu kekal dan sesi tidak logout.

## Backup dan restore MySQL

Sistem akan mengesan alat MySQL XAMPP di `C:\xampp\mysql\bin`. Jika XAMPP dipasang
di tempat lain, tetapkan `MYSQL_BIN_DIR` dalam `.env`.

Buat backup manual semasa MySQL sedang berjalan:

```powershell
npm run db:backup
```

Backup disimpan sebagai `backups\*.sql.gz` bersama checksum SHA-256 dan folder itu
tidak akan masuk Git. Backup lebih lama daripada `DB_BACKUP_RETENTION_DAYS` dibuang
semasa backup baharu dibuat.

Lihat dan periksa backup/database:

```powershell
npm run db:list
npm run db:verify -- latest
npm run db:check
```

Pulihkan backup tertentu:

```powershell
npm run db:restore -- latest --yes
# atau pilih fail tertentu:
npm run db:restore -- backups\NAMA-FAIL.sql.gz --yes
npm run db:check
```

Restore akan mengesahkan checksum dan membuat satu backup `pre-restore` terlebih
dahulu. Hentikan bot dengan `Ctrl+C` sebelum restore. Jika database sedang rosak dan
backup keselamatan tidak dapat dibuat, `--skip-backup` tersedia sebagai pilihan terakhir:

```powershell
npm run db:restore -- backups\NAMA-FAIL.sql.gz --yes --skip-backup
```

Fail SQL mengandungi data pengguna dan memori AI dalam bentuk boleh dibaca. Simpan
folder backup secara private dan jangan upload ke GitHub atau cloud awam.

## Keselamatan dan privasi

- `.env`, semua variasi `.env.*`, `auth_state/`, `dist/`, log dan `node_modules/`
  dikecualikan daripada Git.
- `auth_state/` memberi akses kepada sesi WhatsApp. Jangan upload, kongsi atau simpan
  folder itu dalam cloud awam. Pada Linux, bot menetapkan folder/fail sesi kepada
  permission `0700`/`0600`; pada Windows ia bergantung pada ACL akaun Windows.
- Memori AI diasingkan mengikut pengguna dan kumpulan, serta dikekalkan sebagai
  rolling window sahaja. Pengguna boleh melihat polisi melalui `!mprivacy` dan
  memadam/opt-out melalui `!mforgetme`.
- AI dan media mempunyai had penggunaan per pengguna. ffmpeg/sharp juga diproses
  melalui queue dengan concurrency terhad.
- Saiz media diperiksa daripada metadata sebelum muat turun dan diperiksa semula
  selepas muat turun.
- Log penggunaan arahan dan tindakan admin lama dibuang berdasarkan
  `LOG_RETENTION_DAYS` (lalai 90 hari).

Sebelum push ke GitHub, ikuti senarai semak dalam [SECURITY.md](SECURITY.md).

## Production

Build dan jalankan fail yang telah dikompilasi:

```powershell
npm run build
pm2 start dist/index.js --name mizuki
pm2 save
```

Hosting perlu menyediakan storan kekal untuk `auth_state/` dan database MySQL.
Simpan semua nilai `.env` sebagai secret pada platform hosting, bukan dalam source code.

## Nota WhatsApp

Projek ini menggunakan Baileys, library WhatsApp Web tidak rasmi. Ia boleh terjejas
oleh perubahan WhatsApp dan mempunyai risiko akaun disekat. Gunakan nombor khas dan
elakkan spam atau automasi agresif.

## Stack

- TypeScript / Node.js
- Baileys
- MySQL/MariaDB
- Google Gen AI SDK (`@google/genai`)
- sharp dan ffmpeg
- pino

## Lesen

MIT
