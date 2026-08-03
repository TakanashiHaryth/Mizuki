# Changelog

Semua perubahan penting Mizuki akan direkodkan dalam fail ini.

## [1.1.0] - 2026-08-03

### Ditambah

- Sistem backup MySQL lokal melalui `db:backup`, `db:list`, `db:verify`, `db:check`
  dan `db:restore`.
- Backup SQL dimampatkan sebagai `.sql.gz` dan diberikan checksum SHA-256.
- Backup keselamatan automatik sebelum proses restore serta retention backup 30 hari.
- Animated WhatsApp sticker WebP melalui command `!mtogif`.
- Pemampatan animated sticker adaptif sehingga berada di bawah had 500 KB.
- Metadata `pack name` dan `author` pada sticker biasa dan animated sticker.
- Reaction status `⏳`, `✅` dan `❌` untuk proses AI dan media.

### Diubah

- `!minfobot` kini turut memaparkan uptime lengkap dalam hari, jam, minit dan saat.
- `!muptime` dikeluarkan daripada menu tetapi dikekalkan sebagai alias `!minfobot`.
- Output `!mtogif` ditukar daripada video MP4 dengan `gifPlayback` kepada animated
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
