# AI-AGENTS.md — Instruksi untuk AI Coding Agent

> Baca file ini **sebelum mengubah kode**. Isinya: konteks, perintah, aturan yang tidak boleh dilanggar, standar kode, resep perubahan umum, cara menguji, dan jebakan yang sudah pernah terjadi di proyek ini.
> Dokumen terkait: [PRODUCT-REQUIREMENTS.md](PRODUCT-REQUIREMENTS.md) (apa dan mengapa) · [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) (tampilan) · [ARCHITECTURE.md](ARCHITECTURE.md) (cara kerja)

---

## 1. Konteks dalam 30 detik

**QA Recorder** = aplikasi web untuk QC/QA fungsional website. Pengguna membuka website target di panel (lewat reverse proxy milik aplikasi, jadi **satu origin**), merekam aksinya menjadi skenario JSON, memutarnya ulang otomatis di panel, lalu mengekspor laporan (HTML/MD/PDF/Word) berisi langkah dan screenshot.

- Target utama: aplikasi legacy ASP.NET WebForms (contoh: CARE Web Application V5) dengan menu `onmouseover`, popup `window.open`, `<dialog>` + `<iframe>`, tombol F2, `confirm()`, postback lambat.
- Pengguna: QA non-programmer berbahasa Indonesia.
- Stack: Node (tanpa dependensi npm) + satu berkas HTML/JS murni + Supabase. Di-host di **Render.com**; dapat dijalankan lokal.

## 2. Perintah

| Tujuan | Perintah |
|---|---|
| Persiapan | Salin `.env.example` → `.env`, isi `QA_PASSWORD` (+ `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` bila perlu DB). Node **≥ 20.12**. Tidak ada `npm install` (tanpa dependensi). |
| Jalankan lokal | `npm run dev` → `http://localhost:3000/__qa/` (atau `node dev.js`; skrip npm memakai `--env-file=.env` dan berhenti bila `.env` tidak ada) |
| Uji unit | `npm test` |
| Periksa sintaks JS UI | Ekstrak isi `<script>` ke berkas lalu `node --check` (UI adalah satu berkas HTML) |
| Build | **Tidak ada.** Jangan menambah build step. |

Env: `QA_PASSWORD` (wajib), `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ALLOW_PRIVATE_HOSTS=1` (**hanya lokal**, untuk menguji situs di `localhost`).

## 3. Peta kode

| Mau mengubah… | Lihat |
|---|---|
| Login, rute API, simpan skenario | `api/qa-app.js` |
| Penerusan ke website target, penulisan ulang, penyisipan hook | `api/qa-proxy.js` |
| Cookie/auth/host privat/baca body | `api/_lib.js` |
| Routing lokal & server produksi | `dev.js` (`vercel.json` = peninggalan) |
| Semua UI dan logika klien | `public/__qa/index.html` — bagian diberi komentar `/* ---------- nama ---------- */` |
| Skrip yang jalan **di dalam halaman target** | `public/__qa/hook.js` (kecil; logika sebenarnya ada di `window.__qa.patch` di `index.html`) |
| Gaya UI | blok `<style>` di `index.html` (lihat DESIGN-SYSTEM.md) |
| Teks/format laporan | `I` (label), `D` (deskripsi langkah), `describe`, `model`, `toHtml`, `toMd`, `toDocx` |
| Tes | `test/proxy.test.js` |

## 4. Aturan yang tidak boleh dilanggar (invarian)

Setiap aturan lahir dari bug nyata. Melanggarnya hampir pasti merusak sesuatu.

1. **UI dan website target harus satu origin.** Jangan memuat URL target langsung di iframe atau `fetch` dari browser; semua lewat proxy (`/__qa/api/open` lalu jalur biasa). Hanya jalur `/__qa/…` milik aplikasi.
2. **Hook disisipkan di awal dokumen, tepat SESUDAH doctype** (atau di awal bila tak ada doctype). Jangan pernah sebelum doctype: itu memindahkan halaman ke mode quirks dan menggeser tata letak/posisi popup. Hook memakai **`window.top`**, bukan `window.parent` (di iframe bersarang `parent` bukan aplikasi).
3. **`add()` adalah satu-satunya cara menambah langkah rekaman** (reset hasil, render, dedupe). Langkah dari dokumen tab/frame harus membawa `tab`/`frame` (pakai `S()` di dalam `attach`).
4. **Skema langkah kompatibel mundur.** Skenario lama harus tetap berjalan. Field baru bersifat **opsional** dan punya perilaku bawaan.
5. **Replay tidak boleh bertindak sebelum halaman siap**: tunggu elemen **dan** penangkap terpasang (`document.__qa`), lalu `settle()` setelah aksi dan sebelum screenshot. Klik terlalu dini membuat link `_blank` membuka tab browser asli.
6. **Snapshot tidak boleh meninggalkan jejak di halaman target.** Ukur → `cloneNode` → kembalikan style/scroll dalam satu blok **sinkron** (tanpa `await` di antaranya). Sorotan digambar di salinan, bukan di halaman asli.
7. **Jangan memanggil `scrollIntoView`** pada elemen target (ikut menggeser halaman QA dan memindah posisi menu). Gunakan `reveal()` (hanya menggulir jendela iframe, hanya bila perlu).
8. **Jangan `return false` dari handler event properti** secara tak sengaja. `el.onkeydown = e => e.key === 'Enter' && go()` mengembalikan `false` untuk tombol lain dan **memblokir semua ketikan**. Pakai blok `{ if (…) … }`.
9. **`confirm()/alert()/prompt()` sinkron di dalam klik**, jadi jawaban dialog harus dipasang **sebelum** langkah pemicu (`dlgQueue`), bukan sesudahnya.
10. **Iframe ber-sandbox tidak boleh menavigasi iframe lain.** Navigasi tab baru dilakukan dari halaman induk (`openIn`, `submitInTab`), bukan dengan `target=` dari dalam iframe.
11. **Kegagalan pembantu tidak boleh menggagalkan skenario**: screenshot gagal → `{shotErr}`; hover tak ketemu → dilewati dengan catatan.
12. **Teks laporan dua bahasa** (Indonesia dan English) selalu bersamaan.
13. **Tanpa dependensi baru, tanpa framework, tanpa build step.** Satu-satunya pustaka: JSZip (di-vendor).
14. **Rahasia**: service key Supabase tidak pernah dikirim ke klien; nilai kolom password disamarkan di laporan; jangan mencatat rahasia ke log; `.env` jangan di-commit.

## 5. Keamanan

- Semua rute API (kecuali `login`) dan proxy wajib memeriksa `authed(req)` **lebih dulu**.
- Pertahankan `badHost()` pada `open` dan `fetch`. `ALLOW_PRIVATE_HOSTS` tidak boleh diaktifkan di server publik. Jangan menambah rute yang mengambil URL arbitrer tanpa validasi yang sama.
- Rute `fetch` hanya untuk gambar/font (≤ 5 MB, tanpa redirect); jangan melonggarkan.
- Cookie `qa_auth` harus tetap `HttpOnly; SameSite=Lax; Secure`.
- Supabase: key baru (`sb_secret_…`) **tidak** dikirim sebagai `Authorization: Bearer`; key `anon`/`publishable` harus ditolak; tabel perlu `grant … to service_role`.
- Pembatasan percobaan login belum ada; jangan mengklaim sebaliknya.

## 6. Standar kode

- **JavaScript murni** (ES2020+), tanpa TypeScript/transpiler. Indentasi 2 spasi, titik koma, kutip tunggal, `const`/`let` (tanpa `var`), fungsi panah untuk pembantu kecil, `camelCase`.
- **Komentar dalam Bahasa Indonesia, menjelaskan *mengapa*** (bukan apa). Jalan pintas yang disengaja ditandai `// shortcut: …` dengan catatan cara meningkatkannya.
- **Pesan untuk pengguna dalam Bahasa Indonesia**: singkat, menyebut penyebab dan tindakan (lihat DESIGN-SYSTEM.md §7).
- Fungsi server bergaya serverless: `module.exports = async (req, res) => {}`. **Jangan memakai `req.body`/helper framework**; baca stream lewat `readBody(req)` supaya jalan di `dev.js` dan di platform serverless.
- Respons API JSON lewat `send(res, status, objek)`; galat berbentuk `{ error: 'pesan' }`.
- Warna UI hanya lewat token `var(--…)`; gaya baru mengikuti DESIGN-SYSTEM.md.
- Tidak ada `console.log` tersisa di commit. Tidak ada kode mati atau fitur spekulatif.
- Ubahan **sekecil mungkin yang menyelesaikan masalah** (prinsip "ponytail"): jangan merombak yang tidak diminta, jangan menambah abstraksi tanpa kebutuhan nyata.

## 7. Cara bekerja

1. **Pahami dulu.** Baca bagian terkait di ARCHITECTURE.md dan bagian kode yang akan diubah; cari `grep` untuk pemakai fungsi/field yang akan diubah.
2. **Reproduksi sebelum memperbaiki** bila itu bug: buat situs palsu kecil yang meniru pola target, buktikan kegagalannya, baru perbaiki.
3. **Ubah sedikit, uji, ulangi.** Jalankan uji unit dan e2e fitur yang disentuh **serta area regresi** (bagian 10).
4. **Verifikasi hasil visual dengan melihatnya** (screenshot/laporan), jangan hanya menganggap benar dari angka.
5. **Perbarui dokumen** yang terdampak (PRD bila perilaku berubah, ARCHITECTURE bila struktur/skema berubah, DESIGN-SYSTEM bila tampilan berubah, README bila cara pakai berubah).

## 8. Resep perubahan umum

### 8.1 Menambah aksi langkah baru
1. Tambahkan nama ke `ACTIONS`.
2. Deskripsi laporan: entri di `D.id` dan `D.en` (atau cabang khusus di `describe` bila butuh format lain).
3. Perekam: pendengar di `attach` yang memanggil `add(S({ action: '…', selector, value }))`; hindari duplikat (lihat `dupType`, pola `dblclick`).
4. Replay: cabang di `exec`. Bila aksi berefek pada elemen, tambahkan ke daftar aksi yang mengambil **screenshot sebelum** (`click`, `dblclick`, `press`).
5. Placeholder baris di `render` bila arti kolom berbeda (contoh: `dialog`).
6. Pastikan `model/toHtml/toMd/toDocx` tidak perlu perubahan (biasanya otomatis lewat `describe`).
7. Uji e2e rekam **dan** replay; perbarui PRD (FR) dan tabel skema di ARCHITECTURE.md.

### 8.2 Menambah rute API
Tambahkan `if (r === 'nama') { … }` di `api/qa-app.js` **sesudah** pemeriksaan `authed`; validasi input; balas dengan `send`. `dev.js` dan rewrite sudah generik (`/__qa/api/:r`), tidak perlu diubah. Tambahkan baris ke tabel API di ARCHITECTURE.md.

### 8.3 Menambah format atau teks laporan
Gunakan `model(lang)` sebagai satu-satunya sumber; tulis `toX(m)`; tambahkan `<option>` di `#fmt` dan cabang di handler `#exp`. Teks baru → tambahkan di `I` untuk **kedua** bahasa. Gambar selalu data URI (laporan harus mandiri).

### 8.4 Mengubah proxy
Hati-hati dengan header yang dibuang/diteruskan, pengubahan `Location`, penyisipan hook, dan penulisan ulang teks. Tambahkan/perbarui `test/proxy.test.js`. Uji juga dengan halaman yang diawali `<?xml … ?>` + doctype XHTML (mode render harus tetap standar) dan jalur dengan garis miring akhir.

### 8.5 Mengubah screenshot
Uji dengan halaman yang (a) lebih lebar dari panel, (b) punya kotak ber-scroll, (c) punya iframe bersarang, (d) punya elemen `fixed`. Periksa: ukuran gambar, isi lengkap, sorotan sejajar (selisih ≤ 1–2 px), dan **halaman asli tidak berubah** (style dan `scrollTop` kotak scroll kembali sama).

### 8.6 Mengubah tampilan
Ikuti DESIGN-SYSTEM.md §9–10. Periksa tema terang dan gelap serta tinggi layar pendek.

## 9. Pengujian

### 9.1 Yang ada
`npm test` menjalankan uji unit proxy. **E2E belum ada di repo.** Selama pengembangan fitur diuji dengan Playwright terhadap situs palsu; **sangat disarankan** menambahkannya ke `test/e2e/` (satu skrip per area).

### 9.2 Pola e2e yang dipakai
1. Jalankan situs palsu yang meniru pola target (server HTTP kecil: menu `onmouseover`, popup, `<dialog>`+`<iframe>`, `confirm()`, login lambat, XHR menggantung, halaman lebar + scroller).
2. Jalankan `node dev.js` dengan `QA_PASSWORD=… ALLOW_PRIVATE_HOSTS=1`.
3. Kendalikan UI dengan Playwright: login, isi `#url`, **Buka**, klik `#rec`, lakukan aksi **dengan mouse/keyboard asli** lewat `frame_locator("iframe.act")` (bukan event sintetis), klik `#rec` lagi, baca `steps` dengan `page.evaluate("steps")`.
4. Replay: set `steps` lalu klik `#run`, tunggu `#run` aktif kembali, periksa `#msg` dan `res`.
5. Untuk screenshot: ambil `res[i].img` (data URI) → simpan ke berkas → lihat/analisis piksel.

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    pg = p.chromium.launch().new_page(viewport={'width': 1400, 'height': 800})
    pg.goto("http://localhost:3000/__qa/")
    pg.click("#pw"); pg.keyboard.type("password-uji"); pg.keyboard.press("Enter")
    pg.fill("#url", "http://127.0.0.1:8098/"); pg.keyboard.press("Enter")   # situs palsu
    pg.click("#rec")
    pg.frame_locator("iframe.act").locator("#tombol").click()                  # aksi asli
    pg.click("#rec")
    steps = pg.evaluate("steps")                                               # periksa hasil rekaman
    pg.evaluate("urlIn.value = base")
    pg.click("#run")
    pg.wait_for_function("document.querySelector('#run').disabled === false", timeout=90000)
    assert pg.inner_text("#msg").startswith("LULUS")
```

### 9.3 Area regresi (jalankan yang terkait)
Rekam+replay dasar · tab baru (`_blank`, `window.open`, `opener`, `close`) · menu hover (JS dan CSS `:hover`) · F2 + popup + klik dua kali · `<dialog>`+`<iframe>` · dialog bawaan (OK/Batal/prompt/tak terduga/teks beda) · tombol gambar · login lambat (race) · tunggu halaman siap (XHR/gambar lambat, XHR menggantung) · screenshot halaman penuh + sorotan · ekspor 4 format (Word harus terbuka di LibreOffice/python-docx).

### 9.4 Batas lingkungan uji
Playwright headless menyembunyikan scrollbar dan tidak mendukung tangkapan tab (`getDisplayMedia`); Supabase asli dan website CARE tidak tersedia — gunakan tiruan lokal dan **nyatakan jelas** apa yang belum teruji.

## 10. Jebakan yang pernah terjadi

| Gejala | Penyebab | Penanganan |
|---|---|---|
| Kolom tidak bisa diketik | Handler `onkeydown` mengembalikan `false` | Aturan #8 |
| Klik di iframe bersarang tak terekam | Hook memakai `window.parent` | Pakai `window.top` |
| Menu/popup bergeser, layout aneh | Hook disisipkan sebelum doctype → quirks mode | Aturan #2 |
| Replay membuka tab asli browser | Klik sebelum penangkap tab terpasang (halaman masih dimuat) | Aturan #5 |
| Hover liar terekam (mis. jam, spacer) | Perubahan dikaitkan ke hover yang salah; `mouseout` item sebelumnya; `mouseover` palsu dari render ulang | Jendela waktu per-hover, abaikan perubahan teks dan mutasi saat load, wajibkan gerakan kursor nyata (mouseover datang **sebelum** `mousemove`) |
| Panel QA bergeser saat hover/klik | `scrollIntoView` | `reveal()` |
| Screenshot kehilangan gambar/terpotong | Teknik lama tidak meng-inline aset; lebar terkunci; kotak scroll | Snapshot foreignObject penuh (ARCHITECTURE §7.6) |
| Sorotan meleset | Dipasang di halaman asli sebelum kotak scroll dibuka | Gambar di salinan setelah tata letak terbuka |
| Replay macet di halaman dengan long-poll | `settle` menunggu XHR yang tak selesai | Abaikan permintaan > 8 dtk |
| `confirm()` menahan replay | Dialog native menunggu jawaban manual | Bungkus dialog; jawaban dipasang sebelum klik |
| Tombol `<input type=image>` tak terekam | Dianggap field teks | `TEXTY` mengecualikan image/reset/file |
| Supabase 401/403 padahal env benar | Key baru dikirim sebagai Bearer; belum `grant` ke `service_role`; key `anon` terpakai | Bagian Keamanan di atas |
| 404 bawaan Vercel di panel | `:path*` membuang garis miring akhir | Tidak lagi relevan (Render); bila kembali ke Vercel pakai `/(.*)` |
| `CSSStyleRule` punya `cssRules` (CSS nesting) | Rekursi salah masuk ke aturan gaya | Periksa `selectorText` dulu (`injectHover`) |
| Keluaran shell rusak saat memeriksa file | `cut -c`/`head -c` memotong karakter UTF-8 | Gunakan Python untuk memeriksa teks |

## 11. Definition of Done

- [ ] Perubahan sekecil mungkin; tidak ada dependensi, build step, atau `console.log` baru
- [ ] `npm test` lulus; JS UI lolos `node --check`
- [ ] Fitur diuji **rekam dan replay** dengan aksi asli di situs palsu; area regresi terkait lulus
- [ ] Hasil visual (screenshot/laporan/UI) **dilihat**, tema terang dan gelap bila UI berubah
- [ ] Skenario lama tetap kompatibel; field baru opsional
- [ ] Pesan UI Indonesia; teks laporan dua bahasa
- [ ] Tidak ada rahasia di kode/log; `.env` tidak ikut
- [ ] PRD / ARCHITECTURE / DESIGN-SYSTEM / README diperbarui bila terdampak
- [ ] Laporan ke pengguna jujur: apa yang berubah, apa yang diuji, **apa yang belum teruji**

## 12. Komunikasi dengan pengguna

- Gunakan **Bahasa Indonesia**, ringkas dan langsung.
- Pengguna kadang memakai perintah gaya **`/ponytail`** (ubahan terkecil yang menyelesaikan masalah, balasan singkat) dan **`/caveman`** (balasan sangat ringkas). Hormati preferensi itu; kejujuran tentang risiko tetap wajib.
- Pengguna menerima hasil sebagai **zip proyek**; sebutkan berkas yang berubah dan cara menerapkannya (mis. timpa folder lalu `npm run dev`).
- Selalu pisahkan: **sudah dites** vs **belum dites** (terutama: website CARE asli, Supabase asli, hosting Render).
- Bila kegagalan hanya terlihat di lingkungan pengguna dan tidak bisa direproduksi, **minta data konkret** (JSON skenario, tangkapan layar, pesan galat) alih-alih menebak.

## 13. Hal yang tidak boleh dilakukan

- Memuat website target langsung (bukan lewat proxy), atau menambah jalur di luar `/__qa/`.
- Menyisipkan apa pun sebelum doctype halaman target.
- Menambah framework, pustaka ikon, web font, atau build step.
- Mengirim service key atau rahasia ke klien, atau menulisnya ke log.
- Menonaktifkan `badHost`, mengaktifkan `ALLOW_PRIVATE_HOSTS` di server publik, atau melonggarkan rute `fetch`.
- Mengubah skema langkah dengan cara yang merusak skenario lama.
- Mengklaim fitur "sudah teruji" bila hanya diuji di situs palsu tanpa menyebutnya.
- Menghapus atau menimpa data skenario pengguna di Supabase tanpa diminta.

## 14. Konvensi git (Usulan, belum ada kesepakatan)

Commit kecil dan fokus, pesan singkat dalam Bahasa Indonesia atau Inggris yang konsisten, mis. `fix: hover liar terekam saat halaman dimuat`. Satu perubahan perilaku = satu commit beserta tes dan pembaruan dokumen.
