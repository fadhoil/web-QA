# QA Recorder

Rekam aksi di website target (login, buat/edit/hapus record), edit langkahnya, download sebagai JSON, upload lagi untuk replay otomatis.

## Dokumentasi

| Berkas | Isi |
|---|---|
| [PRODUCT-REQUIREMENTS.md](PRODUCT-REQUIREMENTS.md) | Tujuan, pengguna, fitur, dan kebutuhan fungsional/non-fungsional |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Warna, tipografi, komponen UI, dan aturan desain |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Struktur, teknologi, alur data, API, keamanan, deployment |
| [AI-AGENTS.md](AI-AGENTS.md) | Instruksi, standar kode, resep, dan cara menguji untuk AI coding agent |

## Jalankan lokal

Butuh Node 20+.

```
cp .env.example .env      # Windows: copy .env.example .env
# isi QA_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_KEY
npm run dev
```

Buka http://localhost:3000/__qa/. Safari menolak cookie Secure di http, pakai Chrome atau Firefox.

## Deploy

1. Supabase SQL editor:

   ```sql
   create table scenarios (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     data jsonb not null,
     created_at timestamptz default now()
   );
   alter table scenarios enable row level security; -- tanpa policy: hanya service key yang bisa akses

   -- Wajib di project Supabase baru: tabel buatan SQL tidak otomatis bisa diakses Data API
   grant usage on schema public to service_role;
   grant all on table public.scenarios to service_role;
   ```

   Error `403 permission denied for table scenarios` berarti dua `grant` ini belum dijalankan, atau `SUPABASE_SERVICE_KEY` berisi key anon/publishable (harus secret / service_role).

2. Vercel env vars: `QA_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. Supabase opsional: tanpa dua env terakhir, tombol DB tersembunyi dan download/upload JSON tetap jalan.
3. `vercel --prod` (atau import repo ke Vercel). Buka `https://<domain>/__qa/`.
4. Test lokal proxy: `npm test`.

## Fitur

Satu halaman (logo ADO di pojok kiri bawah, file `public/__qa/logo.png`, ganti file itu untuk mengubahnya): daftar skenario (kiri, ada pencarian), panel website dengan address bar dan tab (tengah), langkah skenario (kanan).

- **Rekam** aksi di panel, edit langkah (ubah, urut, hapus, tambah), download JSON.
- **Daftar skenario** di Supabase: klik nama untuk membuka, **+ Skenario baru** untuk mulai kosong. Upload satu atau beberapa file JSON (digabung sesuai urutan nama file), atau "Gabung file" untuk menambah ke skenario yang sedang dibuka. Simpan dengan nama; nama yang sama menimpa (ada konfirmasi).
- **Menu hover** (sub menu yang muncul saat kursor diarahkan, termasuk ASP.NET Menu `<td onmouseover="Menu_HoverStatic(this)">`): direkam otomatis sebagai langkah `hover` pada elemen ber-`onmouseover` (bukan link di dalamnya) sebelum klik berikutnya. Hanya hover yang benar-benar memunculkan elemen lain yang direkam: jam berjalan, item yang sekadar dilewati, efek `mouseout` item sebelumnya, dan `mouseover` palsu dari render ulang di bawah kursor yang diam tidak ikut. Saat replay, hover memicu event mouse JavaScript dan aturan CSS `:hover`. Langkah hover yang elemennya tidak ditemukan dilewati, tidak menggagalkan skenario.
- **Keyboard**: tombol F1–F12 (mis. F2 untuk daftar data), Escape, Enter di field, dan kombinasi Ctrl/Alt (mis. Ctrl+S) direkam sebagai langkah `press`. Saat replay, field difokus lalu dikirim keydown, keypress, keyup lengkap dengan `keyCode`/`which`, jadi handler lama seperti `ListData(event, ...)` yang mengecek `event.keyCode == 113` berjalan. Teks yang sedang diketik di field ikut tercatat sebelum tombol ditekan.
- **Dialog/iframe di dalam halaman** (mis. `<dialog><iframe id="dialog-body" src="WebList.aspx...">` untuk daftar data F2): aksi di dalam iframe direkam dengan jalur frame-nya (`"frame": "#dialog-body"`, iframe bersarang dipisah ` >> `) dan diputar ulang di dokumen iframe itu. Replay menunggu iframe selesai dimuat (sampai 15 detik). Screenshot merender isi iframe di dalam halaman, dan sorotan/kursor juga muncul di dalam iframe.
- **Dialog bawaan browser** (`alert`, `confirm`, `prompt`, mis. "Save policy data ?"): saat merekam dialog tetap muncul dan jawabanmu (OK/Batal, isian prompt) dicatat sebagai langkah `dialog` setelah langkah pemicunya. Saat replay dialog tidak muncul; dijawab otomatis sesuai rekaman, dan teks pesannya diverifikasi (kolom selector = teks pesan, kosong berarti tidak dicek; kolom nilai = `accept`, `dismiss`, atau `accept:teks`). Langkah `dialog` gagal bila dialog tidak muncul atau teksnya berbeda. Dialog yang tidak ada di rekaman dijawab OK otomatis dan dicatat di keterangan langkah.
- **Tombol bergambar** (`<input type="image">`, tombol reset, tombol ikon) direkam sebagai klik; klik di field teks tidak direkam karena hanya memberi fokus. Nama tombol diambil dari `title`/`alt`/`value` supaya laporan tertulis mis. `Klik elemen "Save Policy Data" (#...ImgBtnSave)`.
- **Klik dua kali** (mis. memilih baris di popup daftar data) direkam sebagai satu langkah `dblclick`, dan baris daftar dipilih lewat teks selnya (`cell=POL-B`), bukan urutan baris.
- **Jalankan** skenario langsung di panel. Sebelum setiap klik diambil screenshot dengan elemen yang akan diklik disorot (kotak merah); setelah klik diambil screenshot lagi.
- **Menunggu halaman siap**: setiap langkah dan screenshot menunggu sampai tidak ada navigasi berjalan, dokumen dan iframe `complete`, gambar selesai dimuat, dan tidak ada XHR/fetch yang jalan (postback AJAX ASP.NET ikut), lalu stabil 0,3 detik. Maksimal 15 detik per langkah; kalau lewat, replay lanjut dan keterangan langkah mencatatnya. Permintaan yang menggantung lebih dari 8 detik (long-poll) diabaikan, jadi halaman dengan long-poll menambah sekitar 8 detik sekali di awal.
- **Ekspor hasil**: HTML, Markdown, PDF, Word (.docx), bahasa Indonesia atau English: status lulus/gagal, langkah detail, durasi, screenshot per langkah, dan **tampilan akhir** (setelah semua langkah selesai, atau saat error).
- Nilai kolom password disamarkan di laporan, tapi tetap tersimpan polos di file JSON agar replay bisa jalan. Jangan pakai akun produksi.

## Tab baru di website target

Link `target=_blank`, `<form target=_blank>`, dan `window.open(...)` di website target dibuka sebagai tab baru di panel QA (tab bar muncul di atas panel). `window.opener` dan `window.close()` juga diarahkan ke tab panel, jadi pola popup ASPX lama (popup mengisi halaman induk lalu menutup diri) tetap jalan. Langkah di tab baru tersimpan dengan nomor tab (`"tab": 1` untuk Tab 2) dan tampil sebagai "(tab 2)" di laporan.

## Kalau Supabase tidak terbaca

Daftar skenario menampilkan pesan error aslinya. `.env` harus ada di folder yang sama dengan `dev.js`. Saat start, terminal mencetak status `QA_PASSWORD / SUPABASE_URL / SUPABASE_SERVICE_KEY`. Error 401 berarti key salah, 404 berarti URL salah atau tabel belum dibuat. Key baru (`sb_secret_...`) dan key lama (`eyJ...`) sama-sama didukung.

## Cara pakai

1. Masuk dengan password, isi URL, klik Buka.
2. Klik Rekam, lakukan tes di panel. Klik Assert lalu klik elemen untuk memverifikasi teks.
3. Edit langkah di panel kanan, lalu Download atau Simpan ke DB.
4. Untuk replay: Upload file (atau pilih dari DB), klik Jalankan.

## Batas

- Website dibuka lewat reverse proxy di domain yang sama, supaya UI bisa membaca dan mengendalikan DOM iframe. Satu target pada satu waktu, karena cookie dibagi di satu host.
- Tidak jalan baik untuk: login SSO/OAuth/captcha ke domain lain, WebSocket, URL yang dibangun runtime oleh JS ke origin target, respons di atas 4,5 MB (batas Vercel).
- Replay berjalan di browser kamu: tidak ada hover, drag, upload file, atau dialog native.
- Password tunggal tanpa rate limit.
- Screenshot: halaman penuh (lebar dan tinggi konten sebenarnya, bukan hanya yang terlihat di panel) dirender ulang oleh browser dengan resolusi 2x, dengan semua gambar, CSS, dan font di-inline, termasuk aset domain lain (diambil lewat server). Kotak yang punya scroll sendiri (mis. panel pohon menu) dibuka sementara pada salinan agar seluruh isinya ikut difoto; panel aslimu tidak berubah. Tidak butuh internet atau library luar. Batas: lebar 4000 px dan tinggi 10000 px (skala resolusi turun otomatis untuk halaman sangat besar); isi iframe ditampilkan sebesar iframe-nya dengan posisi scroll saat itu; video, dan font yang diblokir tidak tertangkap. Ini render ulang, bukan foto layar, jadi bisa sedikit beda dari tampilan asli.
- PDF dibuat lewat dialog cetak browser: pilih "Simpan sebagai PDF". Popup harus diizinkan.
- Mode render halaman (standar/quirks) dipertahankan: hook disisipkan sesudah doctype, termasuk untuk halaman yang diawali `<?xml ...?>`.
- Screenshot `<dialog>` modal tidak meniru lapisan teratas dan backdrop gelap browser; dialog tampil sebagai elemen biasa.
- Popup daftar data yang dibuka dengan `window.open` jadi tab panel (nilai dikembalikan lewat `window.opener`). Tidak didukung: `showModalDialog` dan iframe lintas domain. Dialog bawaan browser tidak bisa di-screenshot (teksnya tetap masuk laporan).
- Hover: menu yang hanya muncul lewat event yang tidak bisa ditiru skrip (mis. perlu gerakan mouse berkelanjutan) bisa gagal. Hover yang tidak mengubah apa pun di halaman tidak direkam.
- Tab baru: `form.submit()` lewat JavaScript dengan `target=_blank` (tanpa event submit), upload file di form tab baru, dan popup ke domain lain tidak ditangkap (yang domain lain terbuka sebagai tab browser asli). Nomor tab ditetapkan urut sesuai kemunculan, jadi replay harus membuka tab dengan urutan yang sama seperti saat rekam.
- Belum ada tombol hapus skenario: hapus lewat dashboard Supabase.
