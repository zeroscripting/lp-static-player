# LP Static Player — GitHub orkestrator

Landing page preview video dengan pola URL `/?mov=<id>`.
GitHub = orkestrator (source of truth + dashboard + CI). Cloudflare Pages = hosting publik.

**Panduan pemakaian lengkap (dari upload sampai live): [PANDUAN.md](PANDUAN.md)**

## Arsitektur

```
GitHub repo
├─ index.html              landing page (di-serve di root)
├─ assets/style.css        style landing page
├─ assets/player.js        logika ?mov= + popup about:blank
├─ data/config.json        konfigurasi yang diedit dashboard
├─ admin/index.html        dashboard (GitHub Pages)
├─ _headers                header cache Cloudflare Pages
└─ .github/workflows/deploy-pages.yml
```

Alur:

```
dashboard (admin/) --PUT contents--> data/config.json
        |
        v
GitHub Actions (push main / workflow_dispatch)
        |
        v
wrangler pages deploy dist --project-name=<CF_PAGES_PROJECT>
        |
        v
https://<project>.pages.dev/?mov=<id>
```

## Bentuk URL

| Pola | Hasil |
|---|---|
| `/?mov=9Opq7MXm1` | video `9Opq7MXm1` |
| `/?mov=9Opq7MXm1.mp4` | `.mp4` dibuang, sama seperti di atas |
| `/?mov=` atau kosong | fallback `site.defaultVideoId` |
| `/?mov=<karakter tidak valid>` | fallback `site.defaultVideoId` |
| `/?mov=<id nonaktif>` | fallback `site.defaultVideoId` |

ID valid: `^[A-Za-z0-9_-]{1,80}$`.
URL video: `<site.cdnBase><id>.mp4`.

## Setup sekali jalan

### 1. Cloudflare Pages

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → **Direct Upload** (bukan Git integration, karena deploy lewat Actions).
2. Nama project, mis. `lp-player`. Ini jadi `<CF_PAGES_PROJECT>`.
3. Buat API Token: My Profile → API Tokens → Create Token → template **Edit Cloudflare Workers** atau custom dengan izin `Account > Cloudflare Pages > Edit`.
4. Catat **Account ID** (kanan bawah dashboard Cloudflare).

### 2. Secrets & variables di GitHub

Repo → Settings → Secrets and variables → Actions.

Secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Variables:
- `CF_PAGES_PROJECT` = nama project Pages, mis. `lp-player`

### 3. Aktifkan GitHub Pages untuk dashboard

Repo → Settings → Pages → Source: **Deploy from a branch** → Branch `main`, folder **`/admin`**.

Dashboard jadi di `https://<owner>.github.io/<repo>/`.

### 4. Personal Access Token untuk dashboard

GitHub → Settings → Developer settings → Fine-grained tokens → Generate:
- Repository access: hanya repo ini
- Permissions: `Contents: Read and write`, `Actions: Read and write`

Token disimpan di `localStorage` browser (per-device). Jangan pakai di komputer bersama.

### 5. Isi dashboard

1. Buka dashboard, isi owner/repo/branch/token → **Muat config**.
2. Tab **Situs**: isi `URL publik Cloudflare Pages`, mis. `https://lp-player.pages.dev`.
3. Tab **Video**: tambah ID, salin link.
4. Tab **Iklan**: ganti ad key + Histats ID milik sendiri.
5. **Simpan ke GitHub** → Actions jalan → live dalam ~1 menit.

## CDN prioritas

`site.cdnBases` menentukan urutan CDN:

```json
"cdnBases": [
  "https://cdn2.videy.co/",
  "https://cdn.videy.co/"
]
```

- Baris pertama = CDN utama.
- Kalau `<video>` gagal (`error`), `player.js` otomatis pindah ke baris berikutnya, baik di preview maupun di tab player.
- `cdnBase` tunggal tetap didukung; kalau diisi, nilainya dipakai sebagai prioritas pertama.
- Kalau `cdnBases` kosong atau tidak valid, dipakai default bawaan `cdn2.videy.co` lalu `cdn.videy.co`.

### Fallback SliceDrive (opsional)

```json
"slicedriveFallback": true
```

Kalau `true`, dua domain SliceDrive ditambahkan **di ujung** urutan:

```
cdn2.videy.co  →  cdn.videy.co  →  cdn.slicedrive.com  →  cdn2.slicedrive.com
```

Semua host menyajikan file yang sama (ETag identik), jadi ini murni pintu cadangan. Set `false` kalau ingin fallback berhenti di Videy saja. Bisa diubah dari dashboard tab **Situs** lewat checkbox.

Cek cepat:

```bash
node tools/check-cdn.mjs   # HEAD request ke tiap CDN untuk satu ID
node tools/sim-cdn.mjs     # simulasi urutan URL dari berbagai bentuk config
```

Catatan: `cdn.videy.co` di-hijack DNS Telkomsel (resolve ke `202.3.218.139`, 503). `cdn2.videy.co` resolve normal ke Cloudflare. Untuk audiens luar negeri keduanya jalan; fallback tetap aktif kalau salah satu bermasalah.

## Jalankan lokal

```bash
npm run dev
```

Lalu:

- Landing page: `http://localhost:3000/?mov=9Opq7MXm1`
- Dashboard: `http://localhost:3000/admin/`
- Config: `http://localhost:3000/data/config.json`

Dev server (`tools/dev-server.mjs`) punya dua peran:

1. Serve file statis, `index.html` di root — bentuk URL `/?mov=<id>` sama seperti produksi.
2. Endpoint tulis config:
   - `GET  /__local/config` → baca `data/config.json`
   - `PUT  /__local/config` → tulis `data/config.json` ke disk

Dashboard punya pilihan **Mode penyimpanan**:

| Mode | Simpan | Butuh |
|---|---|---|
| Lokal | `PUT /__local/config`, langsung ke disk | `npm run dev` |
| GitHub | commit lewat GitHub API | repo + PAT |

Mode lokal default. Cukup `npm run dev`, buka `/admin/`, edit, tekan **Simpan** — file `data/config.json` berubah, landing page langsung pakai nilai baru setelah refresh. Tanpa token, tanpa akun.

Kalau dev server mati, dashboard menampilkan `Dev server tidak aktif` dan mengingatkan perintah `npm run dev`.

Catatan: `document.write` ke `about:blank` dan auto-play butuh browser yang mengizinkan popup untuk origin ini.

## Peringatan

- Ad key default (`827191cd...`, `f8dc87b1...`) dan Histats `5020708` berasal dari situs sumber. Ganti dengan milik sendiri sebelum produksi, kalau tidak revenue masuk ke akun lain.
- `cdn.slicedrive.com` bukan milik Anda. Video bisa hilang kapan saja. Ganti `site.cdnBase` ke CDN sendiri untuk kontrol penuh.
- PAT di `localStorage` bisa dicuri lewat XSS. Halaman dashboard ini tidak memuat script pihak ketiga, tapi tetap gunakan token dengan scope minimum.
