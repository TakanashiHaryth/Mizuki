# Mizuki v1.1.0

Kemas kini ini menumpukan backup database yang lebih selamat dan pengalaman sticker
WhatsApp yang lebih baik.

## Sorotan utama

### Backup dan pemulihan MySQL

```powershell
npm run db:backup
npm run db:list
npm run db:verify -- latest
npm run db:check
npm run db:restore -- latest --yes
```

Backup disimpan secara lokal sebagai fail `.sql.gz`, disahkan menggunakan SHA-256,
dan tidak dimasukkan ke GitHub. Restore membuat backup keselamatan terlebih dahulu.

### Animated sticker sebenar

Reply video maksimum 10 saat dengan:

```text
!mtogif
```

Mizuki kini menghasilkan animated WebP sticker sebenar, bukan video MP4 dalam mod GIF.
Kualiti, FPS dan resolusi diselaraskan secara automatik untuk memenuhi had saiz.

### Identiti sticker Mizuki

Sticker biasa dan animated sticker mempunyai metadata pack dan author. Nilainya boleh
diubah dalam `.env`:

```env
STICKER_PACK_NAME=Mizuki
STICKER_AUTHOR=Mizuki Bot
```

### Status proses

Command AI dan media memberi reaction:

- `⏳` sedang diproses
- `✅` berjaya
- `❌` gagal

### Infobot lebih lengkap

`!minfobot` kini merangkumi uptime. `!muptime` masih berfungsi sebagai alias supaya
pengguna lama tidak terjejas.

## Cara menaik taraf

```powershell
git pull
npm install
npm run build
npm test
```

Tiada migrasi database baharu diperlukan untuk keluaran ini. Restart bot selepas build.
