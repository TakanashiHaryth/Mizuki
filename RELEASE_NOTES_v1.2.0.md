# Mizuki v1.2.0

Keluaran ini membawa personaliti berasingan bagi setiap group, command downloader
social, fallback TikTok berlapis, respons AI yang lebih terkawal dan pemprosesan media
yang lebih mudah dikonfigurasi.

## Sorotan utama

### Personaliti Mizuki bagi setiap group

Admin boleh melihat, mengubah atau reset sifat Mizuki terus dari WhatsApp:

```text
!m personality
!m personality ceria, lembut dan suka bergurau
!m personality reset
```

Personaliti disimpan dalam MySQL bagi setiap group. Fail `personality.md` dan tetapan
persona dalam `.env` tidak lagi digunakan. Identiti default Mizuki kekal sebagai bot
pembantu WhatsApp yang ceria, periang dan suka membantu admin.

### Downloader YouTube, TikTok, Instagram dan X

Command baharu:

```text
!m yt <link>
!m tt <link>
!m ig <link>
!m x <link>
!m tt audio <link>
```

Downloader video mengutamakan format sehingga 720p dan memilih format lain yang
serasi jika format itu tidak tersedia. TikTok, Instagram dan X menyokong post yang
mempunyai beberapa gambar atau video apabila platform membenarkannya.
Pilihan `audio` memuat turun trek audio untuk dihantar sebagai mesej audio WhatsApp.

TikTok menggunakan urutan berikut:

```text
yt-dlp / gallery-dl → SocialKit → TikWM
```

Downloader lokal dicuba dahulu supaya kredit SocialKit tidak dibazirkan. SocialKit
memerlukan `SOCIALKIT_API_KEY`, manakala fallback TikWM aktif secara default tanpa API
key dan boleh dimatikan dengan `TIKWM_FALLBACK_ENABLED=false`.

### AI lebih cepat dan mesej ralat lebih jelas

- Had output dan timeout Gemini boleh dikonfigurasi.
- Thinking mode paling ringan digunakan pada model yang menyokongnya.
- Rate limit, cancellation dan timeout mempunyai mesej WhatsApp yang berbeza.

### Media dan animated sticker

- Conversion media tidak mempunyai had penggunaan per-user.
- Satu job diproses pada satu masa secara default melalui queue terbatas.
- FPS animated sticker, compression WebP dan thread FFmpeg boleh dikonfigurasi.
- Profil encoding menyesuaikan resolusi mengikut tempoh video untuk mengurangkan masa
  conversion sambil mengekalkan gerakan yang lancar.
- Reaction proses digunakan pada command media sahaja.

### Reliability dan keselamatan downloader

- Perlindungan single-instance menghalang dua proses menggunakan `auth_state/` yang sama.
- Download social disusun satu demi satu dengan sela masa rawak.
- Satu deadline dikongsi oleh downloader lokal dan semua fallback API.
- URL provider memerlukan HTTPS, host dibenarkan dan tiada redirect.
- Saiz setiap fail, jumlah carousel, tempoh media dan respons API semuanya dibatasi.
- Parameter tracking dibuang sebelum link TikTok dihantar kepada provider.

## Keperluan tambahan

Command social memerlukan:

```powershell
yt-dlp --version
gallery-dl --version
ffmpeg -version
```

SocialKit adalah pilihan. TikWM tidak memerlukan API key. Jika browser cookies
digunakan untuk post yang memerlukan login, gunakan akaun khas dan hanya jalankan bot
dalam group yang dipercayai.

## Cara menaik taraf

Hentikan proses Mizuki lama, kemudian jalankan:

```powershell
git pull
npm install
npm run migrate
npm test
npm run dev
```

`npm run migrate` diperlukan untuk menambah kolum `groups.personality`. Migration ini
selamat dijalankan semula kerana kolum yang sudah wujud akan diabaikan.

Semak `.env.example` untuk tetapan AI, queue, FFmpeg dan downloader yang baharu. Jangan
commit `.env`, `auth_state/`, cookies browser atau fail backup database.

## Perubahan tingkah laku

- Personaliti kini dikawal oleh admin bagi setiap group dan bukan melalui fail Markdown.
- `MEDIA_RATE_LIMIT_*`, `PERSONALITY_FILE` dan `BOT_PERSONA` tidak lagi digunakan.
- Semua command memerlukan ruang selepas prefix, contohnya `!m help`; bentuk rapat
  seperti `!mhelp` tidak lagi dianggap sebagai command.
- `!m uptime` masih berfungsi sebagai alias tersembunyi untuk `!m infobot`.
- `!m instagram` masih berfungsi sebagai alias tersembunyi untuk `!m ig`.
