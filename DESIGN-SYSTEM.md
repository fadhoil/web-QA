# DESIGN-SYSTEM.md — QA Recorder

> Warna, tipografi, komponen UI, dan aturan desain agar tampilan konsisten.
> Dokumen terkait: [PRODUCT-REQUIREMENTS.md](PRODUCT-REQUIREMENTS.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [AI-AGENTS.md](AI-AGENTS.md)

Semua nilai di sini diambil dari kode (`public/__qa/index.html`, bagian `<style>`, dan pembuat laporan). Bila kode dan dokumen berbeda, **kode yang benar** — perbarui dokumen ini.

---

## 1. Prinsip desain

1. **Alat kerja, bukan etalase.** Antarmuka padat, datar, dan fungsional; fokus pada panel website dan daftar langkah.
2. **Konten target adalah bintangnya.** Panel website mengambil ruang terbesar; kromium UI tipis dan netral.
3. **Status harus terbaca sekilas.** Hijau = lulus, merah = gagal/rekaman aktif, biru = fokus/pilihan aktif. Warna tidak pernah satu-satunya penanda (selalu ada teks, ikon, atau pesan).
4. **Tanpa kejutan.** Satu halaman, tanpa modal, tanpa animasi; tombol berperilaku sama di mana pun.
5. **Terang dan gelap otomatis** mengikuti sistem, tanpa pengaturan.
6. **Bahasa Indonesia, singkat, kalimat perintah.**

## 2. Token desain

Seluruh warna UI berasal dari variabel CSS pada `:root`. **Jangan menulis warna mentah di komponen UI.**

### 2.1 Warna

| Token | Terang | Gelap | Kegunaan |
|---|---|---|---|
| `--bg` | `#ffffff` | `#161616` | Latar halaman, tombol, input |
| `--fg` | `#1a1a1a` | `#eeeeee` | Teks utama |
| `--bd` | `#d0d0d0` | `#3a3a3a` | Garis pemisah, border kontrol |
| `--mut` | `#666666` | `#999999` | Teks sekunder (placeholder, status, nomor langkah) |
| `--acc` | `#2563eb` | `#60a5fa` | Aksen: hover/fokus, pilihan aktif |
| `--ok` | `#1a7f37` | `#4ade80` | Langkah lulus |
| `--bad` | `#c62828` | `#f87171` | Langkah gagal, rekaman aktif, galat |
| `--row` | `#f6f6f6` | `#202020` | Latar baris langkah |

Warna di luar token (sengaja tetap, bukan bagian tema):

| Nilai | Dipakai untuk |
|---|---|
| `#ffffff` | Latar iframe panel (agar website target tampil seperti aslinya, termasuk di tema gelap) |
| `#e11d48` + `rgba(225,29,72,.14)` | **Sorotan elemen** pada screenshot (border 3 px + isi transparan) |
| `#1a7f37` / `#c62828` / `#777777` | Status **lulus / gagal / dilewati** di laporan HTML (Word: `1A7F37` / `C62828` / `777777`) |
| `#fbeaea` + `#8a1c1c` | Kotak pesan error di laporan HTML |

### 2.2 Tipografi

| Konteks | Aturan |
|---|---|
| UI | `font: 14px system-ui, sans-serif` (tanpa web font; ikut font sistem) |
| Kontrol | `font: inherit` (input, select, button) |
| Laporan HTML | `14px/1.5 system-ui, sans-serif`; `h1` dan `h2` default browser; judul langkah `h3` 15 px; durasi/keterangan `small` (abu-abu `#666`) |
| Laporan Word | Judul 20 pt tebal; subjudul "Langkah-langkah" dan "Tampilan akhir" 16 pt tebal; judul langkah tebal berwarna status; durasi 9 pt |
| Penebalan UI | `font-weight: 600` hanya untuk item terpilih (daftar skenario, tab aktif) |

Tidak ada skala heading di UI aplikasi; hierarki dibentuk lewat posisi, garis, dan bobot.

### 2.3 Jarak, bentuk, lapisan

| Hal | Nilai |
|---|---|
| Padding header/sidebar | `8px`; jarak antar kontrol `6px` (header), `4px` (daftar, baris langkah) |
| Padding kontrol | `6px 8px` (baris langkah: `3px 2px`; tab panel: `3px 8px`) |
| Border | `1px solid var(--bd)`; penanda status baris `4px` di kiri |
| Radius | `6px` (kontrol, baris langkah), `4px` (sorotan screenshot) |
| `box-sizing` | `border-box` untuk semua elemen |
| z-index | overlay login `9`; penanda sorotan screenshot `2147483647` (hanya di salinan halaman target) |
| Mode tampilan | `prefers-color-scheme` (tanpa tombol ganti tema) |

### 2.4 Ukuran tata letak

| Area | Lebar |
|---|---|
| Daftar skenario (kiri) | `220px` tetap |
| Panel website (tengah) | sisa ruang (`flex: 1`, `min-width: 0`) |
| Langkah & ekspor (kanan) | `480px` tetap |
| Address bar | `flex: 1`, minimal `220px` |

Tidak ada breakpoint responsif: aplikasi dirancang untuk **layar desktop**. Pada layar sempit, panel website mengecil terlebih dahulu; ini memengaruhi tata letak website target (lihat ARCHITECTURE.md).

## 3. Tata letak halaman

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [ address bar .................................. ] Buka ● Rekam ✓ Assert │
│                                         ▶ Jalankan  ☑ Screenshot         │ ← header (wrap)
├───────────────┬──────────────────────────────────────┬───────────────────┤
│ + Skenario baru│ [Tab 1][Tab 2 ×] …  (muncul bila >1) │ [nama][Simpan][JSON]│
│ [cari…]    ⟳  │ ┌──────────────────────────────────┐ │ ⬆ Upload ⊕ Gabung  │
│ ▸ Skenario A  │ │                                  │ │ ┌───────────────┐ │
│ ▸ Skenario B  │ │   iframe website target          │ │ │ baris langkah │ │
│               │ │   (putih, penuh)                 │ │ │ baris langkah │ │
│               │ │                                  │ │ └───────────────┘ │
│   [ logo ADO ]│ └──────────────────────────────────┘ │ + Langkah          │
│               │                                      │ [Laporan][Format][Ekspor]│
│               │                                      │ status / pesan     │
└───────────────┴──────────────────────────────────────┴───────────────────┘
```

Urutan DOM: `header` → `main` (`#list`, `#panel`, `aside`). Body: `height:100vh; display:flex; flex-direction:column`. Setiap kolom boleh scroll sendiri (`min-height:0` + `overflow:auto` pada `#items` dan `#steps`).

## 4. Komponen

### 4.1 Toolbar (header)
Baris fleksibel (`flex-wrap`), `gap 6px`, garis bawah `--bd`. Urutan: address bar, **Buka**, grup rekam (**● Rekam**, **✓ Assert**), **▶ Jalankan**, kotak **Screenshot**. Header serupa dipakai di kolom kanan (nama skenario + aksi, aksi file, ekspor).

### 4.2 Tombol
```css
input,select,button{font:inherit;color:inherit;background:var(--bg);
  border:1px solid var(--bd);border-radius:6px;padding:6px 8px}
button{cursor:pointer}
button:hover:not(:disabled){border-color:var(--acc)}
button:disabled{opacity:.45;cursor:default}
```
| Varian | Tampilan | Dipakai |
|---|---|---|
| Default | Latar `--bg`, border `--bd` | Hampir semua tombol |
| Aktif-bahaya (`.on`) | Latar dan border `--bad`, teks putih | **● Rekam** saat merekam (berubah jadi **■ Stop**); **✓ Assert** saat mode assert aktif |
| Dinonaktifkan | Opasitas 45%, kursor default | **Ekspor hasil** sebelum ada hasil; **▶ Jalankan** saat berjalan |

Tidak ada tombol "primer" berwarna penuh; satu-satunya warna penuh adalah status rekaman.

### 4.3 Input, select, kotak centang
Gaya sama dengan tombol (border, radius, padding). `input[type=password]` pada overlay login; `placeholder` memakai warna bawaan browser. Kotak **Screenshot** berada di dalam `<label>` dengan `title` penjelasan.

### 4.4 Tab panel (`#tabs`)
Muncul hanya bila tab > 1. Tombol tab: radius bawah 0, `max-width:160px`, teks dipotong elipsis; tab aktif `.cur` → border `--acc` dan tebal 600. Tombol **×** terpisah menutup tab (tidak untuk tab utama). Label tab = judul halaman (maks 18 karakter) atau jalur.

### 4.5 Daftar skenario (`#list`)
- Tombol **+ Skenario baru** di atas, lalu baris pencarian (`input` + tombol **⟳**).
- Item: tombol rata kiri, satu baris, elipsis; `title` berisi waktu pembuatan. Item terpilih `.cur`: border `--acc`, tebal 600.
- Keadaan kosong: teks `--mut` ("Tidak ada skenario."); galat DB: teks `--mut` diawali "Supabase error: …" disertai penyebab.
- **Logo** (`#brand`): di dasar kolom, tengah, `max-width:100%`, `max-height:min(180px,22vh)`, latar transparan (aman di terang/gelap).

### 4.6 Baris langkah (`.step`)
Grid 7 kolom: `40px 92px 1fr 1fr 22px 22px 22px` → [nomor] [aksi] [selector] [nilai] [↑] [↓] [✕].

| Bagian | Spesifikasi |
|---|---|
| Latar | `--row`, radius 6, padding 4, jarak antar baris 4 |
| Nomor | Teks `--mut`, tengah. Format `N`, ditambah `·T2` (tab ke-2) dan `·F` (di dalam frame). `title` menjelaskan tab/frame |
| Aksi | `<select>` berisi: goto, click, dblclick, hover, dialog, type, select, press, assertText |
| Selector / Nilai | `<input>`; untuk langkah `dialog` placeholder berganti menjadi "teks pesan (kosong = tak dicek)" dan "accept / dismiss"; untuk nilai sensitif tipe `password` |
| Status | Garis kiri 4 px: transparan (belum jalan), `--ok` (lulus), `--bad` (gagal; `title` = pesan galat) |

### 4.7 Baris status (`#msg`)
Di dasar kolom kanan: padding 8, teks `--mut`, tinggi minimal 36, `white-space:pre-wrap`, garis atas. Satu-satunya tempat umpan balik teks (tanpa toast/modal).

### 4.8 Overlay login (`#login`)
`position:fixed; inset:0`, latar `--bg`, `z-index:9`, isi dipusatkan: kolom password (autofokus), tombol **Masuk**, pesan galat `--bad` ("password salah").

### 4.9 Panel website (`#frames iframe`)
Iframe memenuhi area, tanpa border, latar putih. Hanya satu iframe tampil (kelas `.act`); tab lain disembunyikan, bukan dibongkar.

### 4.10 Anotasi screenshot
Sorotan elemen pada screenshot sebelum aksi: kotak dengan border `3px solid #e11d48`, radius 4, isi `rgba(225,29,72,.14)`, melebar 3 px ke tiap sisi. **Tidak ada kursor** (sudah dihapus atas permintaan pengguna). Anotasi digambar pada salinan halaman, bukan pada halaman asli.

### 4.11 Laporan
Struktur sama untuk HTML, Markdown, PDF, dan Word:

1. Judul laporan → tabel meta (Skenario, Website target, Waktu uji + durasi, Hasil akhir sebagai **lencana**, Total langkah).
2. "Langkah-langkah": satu blok per langkah — nomor + deskripsi + lencana status, pesan error (jika ada), catatan, durasi, gambar (**"Sebelum klik"** lalu **"Sesudah langkah"** bila ada, selain itu satu gambar).
3. "Tampilan akhir": keterangan (lulus/gagal) + gambar.

HTML: lebar maks 960 px, tengah; blok langkah border `#ddd` dengan garis kiri 6 px warna status; lencana pil (radius 10, teks putih 12 px); `page-break-inside:avoid` agar PDF tidak memotong blok; gambar `max-width:100%` dengan border `#ccc`. Teks nilai sensitif ditulis `••••••`.

## 5. Keadaan dan interaksi

| Situasi | Perilaku visual |
|---|---|
| Hover tombol | Border menjadi `--acc` |
| Merekam | **● Rekam** → **■ Stop** merah; pesan "Merekam. Lakukan tes di panel website." |
| Mode assert | Tombol Assert merah; pesan petunjuk; otomatis keluar setelah satu klik |
| Menjalankan | **▶ Jalankan** nonaktif; baris langkah berubah hijau/merah satu per satu; berhenti di langkah gagal |
| Selesai | Pesan "LULUS: N langkah." atau "GAGAL di langkah N: …"; **Ekspor hasil** aktif |
| Hasil kedaluwarsa | Menambah, menghapus, atau memindah langkah (dan merekam langkah baru) mengosongkan warna hasil dan menonaktifkan ekspor; mengedit teks langkah tidak |
| Tab baru target | Tab bar muncul; tab baru langsung aktif |

Tidak ada animasi atau transisi.

## 6. Ikon

Hanya karakter Unicode (tanpa pustaka ikon, aman di terang/gelap karena mewarisi `color`):

`●` rekam · `■` berhenti · `✓` assert · `▶` jalankan · `⬇` unduh · `⬆` unggah · `⊕` gabung · `⟳` muat ulang · `×` tutup tab · `↑` `↓` pindah langkah · `✕` hapus langkah · `+` tambah.

Aturan: ikon selalu disertai teks atau `title`; jangan memakai emoji berwarna di UI aplikasi (emoji hanya muncul di laporan Markdown: ✅ ❌ ⏭️).

## 7. Konten dan microcopy

- Bahasa Indonesia, kalimat perintah singkat: "Buka URL dulu.", "Mulai rekam dulu.", "Isi nama skenario dan langkah dulu."
- Hasil: `LULUS: N langkah.` · `GAGAL di langkah N: <pesan>`.
- Kegagalan menyebut **penyebab dan tindakan**: "Popup diblokir. Izinkan popup, lalu coba lagi."; "File \"x.json\" bukan skenario valid."
- Galat server ditampilkan apa adanya beserta petunjuk (mis. "HTTP 403: … role key belum punya izin ke tabel: jalankan perintah GRANT di README").
- Istilah tetap: **skenario**, **langkah**, **rekam**, **jalankan**, **ekspor hasil**, **tampilan akhir**. Jangan campur dengan "test case", "script", "run".
- Laporan mengikuti bahasa yang dipilih (Indonesia/English) lewat kamus `I` dan `D` di kode; menambah teks laporan berarti menambah **kedua** bahasa.

## 8. Aksesibilitas

**Sudah ada:** `aria-label` pada address bar, kolom cari, pemilih bahasa/format laporan; `title` pada tombol ikon; atribut `hidden` untuk elemen tersembunyi; urutan DOM = urutan fokus; kontrol native (bisa difokus keyboard).

**Kontras (WCAG, rasio dihitung dari nilai token):**

| Pasangan | Terang | Gelap |
|---|---|---|
| Teks `--fg` / `--bg` | 17,4 | 15,6 |
| Teks sekunder `--mut` / `--bg` | 5,74 | 6,35 |
| Aksen `--acc` / `--bg` | 5,17 | 7,12 |
| `--ok` / `--bg` | 5,08 | 10,38 |
| `--bad` / `--bg` | 5,62 | 6,54 |
| Teks / `--row` | 16,1 | 14,04 |
| Putih di atas `--bad` (tombol rekam aktif) | 5,62 | **2,77** |

**Masalah yang diketahui (belum diperbaiki):**
1. **Tema gelap:** teks putih pada tombol `.on` berlatar `#f87171` hanya **2,77:1** (di bawah 4,5:1). Saran: gunakan teks `#161616` pada latar `--bad` gelap, atau latar `#c62828` di kedua tema.
2. **Laporan:** lencana "Dilewati" putih di atas `#777777` = **4,48:1** (sedikit di bawah 4,5:1 untuk teks 12 px). Saran: pakai `#6b6b6b` atau lebih gelap.
3. Tidak ada indikator fokus kustom (mengandalkan default browser) dan tidak ada pengumuman `aria-live` untuk `#msg`. Saran: tambahkan `role="status"` pada `#msg`.
4. Warna status baris langkah (garis kiri 4 px) tidak punya teks pendamping selain `title`; saran: tambahkan ikon ✓/✗ pada nomor langkah.

## 9. Aturan penerapan

**Lakukan**
- Pakai token (`var(--…)`) untuk semua warna UI baru; tambahkan token baru **di kedua tema** sekaligus.
- Pertahankan kepadatan: padding 3–8 px, tanpa bayangan, tanpa gradasi.
- Gunakan `hidden` (bukan `display:none` inline) untuk menyembunyikan elemen; aturan `[hidden]{display:none!important}` sudah ada.
- Verifikasi tampilan di **terang dan gelap** (Playwright: `color_scheme`) dan pada tinggi layar pendek (±620 px).
- Teks UI baru dalam Bahasa Indonesia; dua bahasa untuk teks laporan.

**Jangan**
- Menambah framework CSS/komponen, web font, pustaka ikon, atau animasi.
- Memakai warna mentah di UI (kecuali anotasi screenshot dan warna status laporan yang memang tetap).
- Mengandalkan warna saja untuk menyampaikan status.
- Menambah modal/toast; umpan balik lewat `#msg`.
- Mengubah gaya halaman **target** dari aplikasi; satu-satunya modifikasi pada halaman target adalah penyisipan hook dan perubahan sementara saat snapshot (dikembalikan seketika).

## 10. Checklist komponen baru

- [ ] Memakai token, tampil benar di terang dan gelap
- [ ] Ada keadaan hover, nonaktif, dan kosong bila relevan
- [ ] Punya `title`/`aria-label` bila hanya ikon
- [ ] Teks Bahasa Indonesia, istilah sesuai bagian 7
- [ ] Tidak memecah tata letak pada tinggi layar ±620 px
- [ ] Bagian ini (DESIGN-SYSTEM.md) diperbarui
