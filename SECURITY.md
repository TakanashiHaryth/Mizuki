# Security Guide

## Sebelum publish ke GitHub

Jalankan semakan berikut dari folder projek:

```powershell
npm test
npm audit
git status --short
git check-ignore -v .env auth_state\creds.json node_modules dist
```

Pastikan `.env` dan semua kandungan `auth_state/` tidak muncul sebagai fail yang akan
di-commit. Kekalkan `.env.example` kerana ia hanya mengandungi placeholder.

Jika API key atau `auth_state/creds.json` pernah ter-upload, anggap rahsia telah bocor:

1. Batalkan dan cipta semula API key Gemini.
2. Logout linked device Mizuki melalui WhatsApp.
3. Padam sesi lokal yang terjejas dan pair semula.
4. Tukar kata laluan database jika ia turut terdedah.

## Pengendalian secret

- Jangan letak API key, kata laluan atau kandungan sesi dalam source code, screenshot,
  issue GitHub atau log.
- Gunakan akaun database khas dengan akses hanya kepada database Mizuki.
- Untuk hosting, masukkan nilai `.env` melalui secret/environment settings platform.
- Pastikan volume `auth_state/` hanya boleh dibaca oleh proses bot dan kekal selepas restart.
- Jangan commit output `dist/`; build semula pada mesin atau platform deployment.

## Had perlindungan sesi

Baileys menyimpan kunci sesi sebagai beberapa fail lokal dan bukan sebagai fail
terenkripsi oleh aplikasi ini. Perlindungan utamanya ialah permission/ACL sistem operasi,
folder private dan tidak memasukkannya ke Git. Sesi yang dicuri perlu dibatalkan melalui
menu Linked devices dalam WhatsApp.

## Pemeriksaan dependency

Jalankan `npm audit` sebelum setiap release dan commit `package-lock.json` supaya versi
pemasangan boleh diulang.
