# Atourin Gateway — halaman publik + admin panel

- Halaman publik: `/`  (konten diambil dari `/api/config`)
- Admin panel: `/admin` (login dengan `ADMIN_PASSWORD`)

## Struktur

```
public/index.html        halaman gateway (desain asli)
public/js/app.js         render button, event card + countdown, kartu Gateway
public/js/teleport.js    easter egg "Gateway" (tidak diubah)
public/admin/            admin panel (vanilla JS, tanpa build)
api/config.js            GET publik (di-cache CDN 10 detik)
api/admin/auth.js        GET cek sesi · POST login · DELETE logout
api/admin/config.js      GET/PUT seluruh konten (butuh login)
api/admin/upload.js      POST upload gambar → Vercel Blob (butuh login)
lib/                     store (Upstash Redis), auth (cookie HMAC), validasi
```

## Deploy ke Vercel

1. Push folder ini ke GitHub, lalu **Add New → Project** di Vercel dan pilih repo-nya
   (Framework Preset: *Other*, tidak perlu build command).
2. **Storage** (tab Storage di project):
   - **Upstash Redis** (Marketplace) → menyimpan konten. `UPSTASH_REDIS_REST_URL/TOKEN` (atau `KV_REST_API_*`) terisi otomatis.
   - **Blob** → menyimpan gambar. `BLOB_READ_WRITE_TOKEN` terisi otomatis.
3. **Settings → Environment Variables**:
   - `ADMIN_PASSWORD` — password login admin (wajib)
   - `SESSION_SECRET` — string acak panjang (disarankan)
4. **Redeploy**, lalu buka `/admin`.

Develop lokal: `npm i -g vercel`, `npm i`, `vercel link`, `vercel env pull`, `vercel dev`.
Tanpa Redis/Blob, mode lokal menyimpan data di `.data/` dan gambar di `public/uploads/`.

## Perilaku penting

- **Button**: ikon bawaan (24 pilihan) atau upload sendiri, teks, link, urutan, tambah/hapus, sembunyikan.
- **Event**: gambar, judul, lokasi, tanggal (otomatis atau teks manual), countdown, link.
  - Countdown ke waktu mulai → saat berlangsung berubah jadi "Berakhir dalam" → setelah selesai kartu hilang otomatis.
  - Satuan countdown bebas (Hari/Jam/Menit/Detik); jika "Hari" dimatikan, jam menampung sisa hari.
  - "Mulai ditampilkan pada" (opsional) menyembunyikan event sampai waktunya (mis. tiket dibuka).
  - Urutan otomatis: yang mulai paling awal di atas.
- **Info Gateway**: ikon, judul, deskripsi, teks button, link, warna, urutan.
- Perubahan di admin muncul di halaman publik dalam ±10 detik (cache CDN).
- Link hanya boleh `http(s)`, `mailto:`, `tel:`; gambar di-resize di browser sebelum upload.
