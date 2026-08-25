# Changelog

Semua perubahan penting Mizuki akan direkodkan dalam fail ini.

## [Unreleased]

## [1.2.0] - 2026-08-25

### Ditambah

- Command admin `!m personality` untuk melihat, mengubah dan reset sifat Mizuki
  secara berasingan bagi setiap group.
- Perlindungan single-instance untuk mengelakkan konflik sesi WhatsApp apabila
  dua proses Mizuki dimulakan serentak.
- Command media `!m yt`, `!m tt`, `!m ig` dan `!m x` untuk memuat turun video
  awam atau audio MP3 menggunakan pilihan `audio`.
- Sokongan beberapa gambar/video dalam satu post Instagram atau X, dengan
  alias lama `!m instagram` dikekalkan secara tersembunyi.
- Sokongan semua gambar yang tersedia daripada TikTok photo post melalui `!m tt`, tanpa
  mengubah laluan video HD sedia ada.
- Fallback SocialKit pilihan untuk video/audio TikTok apabila downloader lokal
  gagal atau disekat, menggunakan key free-tier daripada `.env`.
- Fallback TikWM tanpa API key selepas SocialKit gagal atau kredit percuma habis,
  termasuk sokongan video, audio dan post beberapa gambar.

### Diubah

- Semua command kini memerlukan ruang selepas prefix, contohnya `!m help`; bentuk
  rapat seperti `!mhelp` tidak lagi dianggap sebagai command.
- Personaliti kini disimpan dalam MySQL dan tidak lagi dibaca daripada `.env`
  atau `personality.md`.
- Identiti default Mizuki ialah bot pembantu WhatsApp untuk membantu admin,
  dengan sifat ceria, suka membantu dan periang.
- Respons Gemini dihadkan kepada 256 output tokens secara default dan menggunakan
  thinking mode paling ringan pada model yang menyokongnya.
- Pemilih format MP4 kini mempunyai fallback untuk media yang tiada metadata
  resolusi 720p, mengelakkan ralat `Requested format is not available`.
- Conversion media tidak lagi mempunyai had penggunaan per-user. Queue terbatas
  kekal aktif secara default dan boleh dikonfigurasi atau dimatikan melalui `.env`.
- Animated sticker menggunakan FPS, compression level dan thread FFmpeg yang boleh
  dikonfigurasi, dengan profil lebih ringan untuk video yang panjang.
- Reaction proses kini digunakan pada command media sahaja.

### Dibaiki

- Ralat Gemini `429`, `499`, cancellation dan timeout kini memberi mesej pengguna
  yang khusus serta tidak membiarkan command menunggu tanpa had.
- TikTok audio yang meminta login kini diteruskan kepada fallback API.
- Short-link TikTok mencuba kedua-dua extractor lokal sebelum API supaya link photo
  carousel tidak tersalah dianggap sebagai video tunggal.
- Respons carousel kosong, URL provider tidak sah, redirect dan fail kosong kini
  ditolak dengan ralat yang jelas.

### Keselamatan

- URL download diperiksa menggunakan HTTPS dan allowlist host sebelum media provider
  dimuat turun; redirect provider disekat.
- Respons JSON dan media pihak ketiga mempunyai had saiz, jumlah, durasi dan timeout.
- Satu deadline dikongsi oleh keseluruhan rantai downloader supaya fallback berikutnya
  tidak memulakan semula masa menunggu penuh.
- Query tracking dan fragment dibuang sebelum link TikTok dihantar kepada API.

### Keserasian

- `npm run migrate` diperlukan untuk menambah kolum `groups.personality`.
- `personality.md`, `PERSONALITY_FILE`, `BOT_PERSONA` dan tetapan
  `MEDIA_RATE_LIMIT_*` tidak lagi digunakan.
- Command social memerlukan `yt-dlp`, `gallery-dl` dan `ffmpeg`; fallback TikWM tidak
  memerlukan API key, manakala SocialKit kekal pilihan.

## [1.1.0] - 2026-08-03

### Ditambah

- Sistem backup MySQL lokal melalui `db:backup`, `db:list`, `db:verify`, `db:check`
  dan `db:restore`.
- Backup SQL dimampatkan sebagai `.sql.gz` dan diberikan checksum SHA-256.
- Backup keselamatan automatik sebelum proses restore serta retention backup 30 hari.
- Animated WhatsApp sticker WebP melalui command `!m togif`.
- Pemampatan animated sticker adaptif sehingga berada di bawah had 500 KB.
- Metadata `pack name` dan `author` pada sticker biasa dan animated sticker.
- Reaction status `⏳`, `✅` dan `❌` untuk proses AI dan media.

### Diubah

- `!m infobot` kini turut memaparkan uptime lengkap dalam hari, jam, minit dan saat.
- `!m uptime` dikeluarkan daripada menu tetapi dikekalkan sebagai alias `!m infobot`.
- Output `!m togif` ditukar daripada video MP4 dengan `gifPlayback` kepada animated
  WebP sticker sebenar.
- Versi bot kini dibaca terus daripada `package.json` supaya nombor versi konsisten.

### Keselamatan

- Folder `backups/` dikecualikan daripada Git kerana dump mengandungi data pengguna.
- Password MySQL dihantar kepada alat XAMPP melalui fail option sementara dan tidak
  diletakkan pada command line.
- Restore memerlukan pengesahan `--yes`; fail dengan checksum rosak akan ditolak.

### Keserasian

- Tiada perubahan database diperlukan untuk v1.1.0.
- Node.js 20+, MySQL/MariaDB dan ffmpeg masih diperlukan.
