# Panduan Pakai â€” dari input sampai live

Dokumen ini menjelaskan alur lengkap: upload video â†’ dapat ID â†’ masuk katalog â†’ link dibagikan â†’ deploy â†’ apa yang dilihat pengunjung.

---

## 0. Peta besar

```
[1] Upload video ke videy.co
        â”‚
        â”‚  dapat ID, mis. jzvGRGGb1
        â–¼
[2] File video ada di CDN
        cdn2.videy.co/jzvGRGGb1.mp4
        cdn.videy.co/jzvGRGGb1.mp4        (mirror, file sama)
        cdn.slicedrive.com/jzvGRGGb1.mp4  (mirror, file sama)
        â”‚
        â–¼
[3] Dashboard: catat ID â†’ jadi link
        https://<project>.pages.dev/?mov=jzvGRGGb1
        â”‚
        â–¼
[4] Deploy (GitHub â†’ Cloudflare Pages)
        â”‚
        â–¼
[5] Pengunjung buka link
        preview 9:16 â†’ tekan Play â†’ tab baru memutar video
```

Yang disimpan LP cuma **ID**. Video tidak pernah disimpan di server Anda.

---

## 1. Input: upload video

1. Buka `https://videy.co/`.
2. Pilih file video â†’ Upload.
3. Setelah selesai, Anda dapat halaman share:
   ```
   https://videy.co/v/?id=jzvGRGGb1
   ```
4. **ID = bagian setelah `id=`** â†’ `jzvGRGGb1`.

Aturan ID (dipakai LP):
```
^[A-Za-z0-9_-]{1,80}$
```
Huruf besar/kecil, angka, `_`, `-`. Maksimal 80 karakter.

Kalau URL ditempel dengan `.mp4` di belakang, LP tetap menerima:
```
/?mov=jzvGRGGb1.mp4   â†’  dianggap jzvGRGGb1
```

---

## 2. Verifikasi: file benar-benar ada di CDN

Jangan langsung sebar link. Cek dulu:

```bash
node tools/check-cdn.mjs jzvGRGGb1
```

Contoh keluaran sehat:

```
=== urutan CDN untuk id: jzvGRGGb1 ===
 1. https://cdn2.videy.co/jzvGRGGb1.mp4       -> 200  7.262.624 byte
 2. https://cdn.videy.co/jzvGRGGb1.mp4         -> 200  7.262.624 byte
 3. https://cdn.slicedrive.com/jzvGRGGb1.mp4   -> 200  7.262.624 byte
 4. https://cdn2.slicedrive.com/jzvGRGGb1.mp4  -> 200  7.262.624 byte
```

Arti:
- `200` = file ada, siap diputar.
- `404` = ID salah atau upload gagal.
- `503` / sertifikat aneh = kena blokir ISP (bukan file hilang).

Kalau nomor 1 `200`, nomor 2â€“4 tidak dipakai â€” itu cuma cadangan.

---

## 3. Masuk katalog dashboard

```bash
npm run dev
```

Buka `http://localhost:3000/docs/`.

### Tab Video
1. Isi **ID video** â†’ `jzvGRGGb1`
   Boleh juga tempel URL penuh â€” otomatis diambil ID-nya:
   ```
   https://videy.co/v/?id=jzvGRGGb1        â†’ jzvGRGGb1
   https://cdn2.videy.co/jzvGRGGb1.mp4      â†’ jzvGRGGb1
   https://cdn.slicedrive.com/jzvGRGGb1.mp4 â†’ jzvGRGGb1
   https://amjx.pages.dev/?mov=jzvGRGGb1    â†’ jzvGRGGb1
   ```
2. Isi **Judul** (opsional) â†’ mis. `Motor di puncak`
3. Klik **Tambah** (atau tekan Enter)

Baris baru muncul dengan:
- kolom **ID**
- kolom **Judul**
- checkbox **Aktif**
- kolom **Link** (bisa disalin / dibuka)
- tombol **Salin**, **Buka**, **Hapus**

### Arti checkbox Aktif
| Status | Perilaku |
|---|---|
| dicentang | link memutar video itu |
| tidak dicentang | link dialihkan ke `Default Video ID` |

Berguna untuk menonaktifkan video bermasalah tanpa menghapus katalognya.

### Tab Situs
| Field | Isi |
|---|---|
| Judul situs | nama yang muncul di `<title>` |
| Default Video ID | video pengganti kalau `?mov=` kosong/invalid/nonaktif |
| CDN base URL | `https://cdn2.videy.co/` |
| URL publik Cloudflare Pages | `https://<project>.pages.dev` |
| CDN fallback | daftar host, satu per baris, urutan prioritas |
| Checkbox SliceDrive | tambah `cdn.slicedrive.com` + `cdn2.slicedrive.com` di ujung |

### Tab Iklan
| Field | Isi |
|---|---|
| Ad key atas | 32 karakter hex |
| Ad key bawah | 32 karakter hex |
| Histats tag | mis. `1,5020708,4,0,0,0,00010000` |

Kosong atau format salah â†’ otomatis diabaikan, halaman tetap jalan.

### Tab Deploy
- **Trigger deploy** â€” jalankan workflow GitHub Actions manual.
- **Muat ulang status** â€” lihat run terakhir.
- Daftar run: nomor, status, waktu, link.

Di mode lokal, tab ini hanya menampilkan keterangan (deploy butuh GitHub).

### Tab JSON
- **Unduh config.json** â€” backup.
- **Impor config.json** â€” restore.
- Editor langsung â€” ubah JSON, klik di luar kotak untuk menerapkan.

---

## 4. Simpan: dua mode

### Mode Lokal (untuk development)

```
Dashboard  â†’  PUT /__local/config  â†’  data/config.json di disk
```

- Tidak butuh akun/token.
- Butuh `npm run dev` hidup.
- Setelah **Simpan**, refresh landing page â†’ nilai baru aktif.

### Mode GitHub (untuk produksi)

```
Dashboard  â†’  GitHub Contents API  â†’  commit data/config.json
                                          â”‚
                                          â–¼
                                   GitHub Actions
                                          â”‚
                                          â–¼
                                   Cloudflare Pages
```

- Butuh repo + Personal Access Token (fine-grained):
  - `Contents: Read and write`
  - `Actions: Read and write`
- Token disimpan di `localStorage` browser itu saja.

Cara pakai:
1. Tab Koneksi â†’ **Mode penyimpanan** = `GitHub`
2. Isi Owner, Repository, Branch, Token
3. **Muat config**
4. Edit apa pun â†’ **Simpan ke GitHub**
5. Tunggu Â±1 menit, tab Deploy berubah `success`

---

## 5. Ambil link dan bagikan

Format link:

```
https://<project>.pages.dev/?mov=<ID>
```

Contoh:
```
https://amjx.pages.dev/?mov=jzvGRGGb1
```

Tombol **Salin** di tab Video langsung menyalin bentuk ini (memakai `URL publik Cloudflare Pages`).

Di lokal:
```
http://localhost:3000/?mov=jzvGRGGb1
```

Bentuk path sama. Hanya hostname beda.

### Variasi URL
| URL | Hasil |
|---|---|
| `/?mov=jzvGRGGb1` | video itu |
| `/?mov=jzvGRGGb1.mp4` | sama |
| `/?mov=` | default video |
| `/?` | default video |
| `/?mov=<id tidak valid>` | default video |
| `/?mov=<id nonaktif>` | default video |

---

## 6. Yang dilihat pengunjung

### Layar 1 â€” preview
- Kartu 9:16, maksimal 450px (350px di HP kecil).
- Video diam, muted, tanpa kontrol.
- Frame diambil dari detik 0.1 supaya tidak hitam.
- Tombol play bulat di tengah.
- Label `Video: <ID>` di kiri bawah.
- Kalau video gagal: preview disembunyikan, muncul pesan.

### Tekan Play
1. `window.open('about:blank')` dipanggil **sinkron** â€” tanpa `setTimeout`/`await`.
2. Tab baru diisi HTML player lewat `document.write`.
3. `newTab.opener = null` â€” tab iklan tak bisa menyentuh tab asal.
4. URL tab tetap `about:blank`, tidak ada `/watch.html`, tidak ada Blob.

Kalau popup diblokir:
> Tab baru diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.

### Layar 2 â€” player
- Video `controls autoplay muted`.
- Slot iklan atas 320Ã—50, bawah 300Ã—250.
- Histats tracking.
- Kalau video gagal: pesan + link "buka MP4 langsung".
- Fallback CDN: `error` â†’ pindah host berikutnya â†’ `play()` lagi.

---

## 7. Deploy

### Pertama kali (sekali saja)
1. Buat repo GitHub, push folder ini.
2. Cloudflare â†’ Workers & Pages â†’ Create â†’ Pages â†’ **Direct Upload** â†’ nama project.
3. Cloudflare API Token (`Cloudflare Pages: Edit`) + Account ID.
4. GitHub â†’ Settings â†’ Secrets and variables â†’ Actions:
   - Secret `CLOUDFLARE_API_TOKEN`
   - Secret `CLOUDFLARE_ACCOUNT_ID`
   - Variable `CF_PAGES_PROJECT` = nama project
5. GitHub â†’ Settings â†’ Pages â†’ Source: branch `main`, folder `/docs`.

### Setiap update
```
Edit dashboard â†’ Simpan â†’ commit â†’ Actions â†’ live
```
Tidak perlu upload manual.

### Perintah manual
```bash
npx wrangler pages deploy dist --project-name=<nama-project>
```

---

## 8. Cek cepat (cheat sheet)

```bash
npm run dev                          # landing + dashboard lokal
node tools/check-cdn.mjs <ID>        # status tiap CDN untuk satu ID
node tools/sim-cdn.mjs               # simulasi urutan URL dari config
node tools/measure.mjs <url>         # deteksi overflow horizontal
node tools/shot.mjs <url> <w> <h> <file.png>  # screenshot akurat
node --check assets/player.js        # validasi sintaks
```

Halaman uji:
```
http://localhost:3000/?mov=<ID>       landing
http://localhost:3000/docs/          dashboard
http://localhost:3000/docs/#site     langsung ke tab Situs
http://localhost:3000/data/config.json
```

---

## 9. Kalau ada masalah

| Gejala | Cek |
|---|---|
| Preview hitam terus | `node tools/check-cdn.mjs <ID>` â†’ harus 200 |
| Tombol Play tak membuka tab | popup blocker; izinkan popup untuk situs |
| Tab terbuka tapi video tak jalan | CDN diblokir ISP; lihat fallback di Network tab |
| Dashboard bilang "Dev server tidak aktif" | `npm run dev` belum jalan |
| Simpan gagal (mode GitHub) | token kedaluwarsa / izin kurang |
| Deploy tak jalan | Secrets `CLOUDFLARE_*` dan variable `CF_PAGES_PROJECT` |
| Perubahan tidak muncul di live | cek tab Deploy, lihat run terakhir |
| `?mov=` selalu video default | ID tidak valid, atau checkbox Aktif mati |

---

## 10. Batasan yang perlu diingat

1. **Video bukan milik Anda.** `cdn.videy.co` / `cdn.slicedrive.com` dikelola pihak lain. File bisa hilang kapan saja. Simpan master di device sendiri.
2. **Sebagian ISP memblokir.** `cdn.videy.co` di-hijack Telkomsel (503). Karena itu `cdn2.videy.co` jadi prioritas dan SliceDrive jadi cadangan.
3. **Ad key & Histats** bawaan milik situs sumber. Ganti di tab Iklan kalau ingin revenue masuk ke akun sendiri.
4. **Token di browser.** Jangan pakai dashboard mode GitHub di komputer bersama.
5. **Pop-up wajib diizinkan.** Tanpa itu, tombol Play tak bisa membuka tab.
