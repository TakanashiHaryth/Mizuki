# Mizuki — WhatsApp Community Bot

Bot kumpulan WhatsApp berasaskan TypeScript dengan AI Gemini, alat admin, poll,
penukaran media dan permainan ringkas.

## Arahan

Prefix boleh diubah melalui `BOT_PREFIX` dalam `.env` (contoh di bawah menggunakan `!m`).

| Kategori | Arahan |
|---|---|
| Admin | `!mkick`, `!mpromote`, `!mdemote`, `!mtagall`, `!mdelete` |
| General | `!mhelp`, `!mping`, `!muptime`, `!minfobot`, `!minfogroup`, `!minfomember`, `!mowner`, `!mprivacy` |
| AI | `Mizuki, [mesej]`, `!mai [mesej]`, `!mforgetme` |
| Utility | `!mpoll Soalan \| Pilihan 1 \| Pilihan 2` |
| Minigame | `!mflipcoin`, `!mdice` |
| Media | `!msticker`, `!mimg`, `!mtovideo`, `!mtogif` |

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
