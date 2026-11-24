# PRODUCT-REQUIREMENTS.md — QA Recorder

> Dokumen kebutuhan produk. Menjelaskan **mengapa** aplikasi ini ada, **untuk siapa**, dan **apa** yang harus bisa dilakukannya.
> Dokumen terkait: [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [AI-AGENTS.md](AI-AGENTS.md)

Status isi: bagian **Kebutuhan fungsional** mencatat apa yang **sudah ada** di kode. Bagian bertanda **(Usulan)** belum dibangun.

---

## 1. Ringkasan produk

**QA Recorder** adalah aplikasi web untuk QC/QA fungsional sebuah website secara semi-otomatis, tanpa menulis kode tes.

Pengguna membuka website yang diuji di dalam panel aplikasi, lalu mengoperasikannya seperti biasa (login, buat, ubah, hapus data). Aplikasi **merekam** aktivitas itu menjadi **skenario** (file JSON), yang bisa diedit, disimpan, digabung, lalu **diputar ulang otomatis** langsung di panel. Hasil pemutaran bisa diekspor sebagai **laporan** berisi status lulus/gagal, langkah detail, dan screenshot.

Satu kalimat: *"Rekam sekali, putar ulang kapan saja, dan dapatkan laporan bukti pengujian."*

## 2. Latar belakang dan masalah

| Masalah | Dampak |
|---|---|
| Pengujian fungsional aplikasi bisnis (contoh target: CARE Web Application V5, ASP.NET WebForms) dilakukan manual dan berulang setiap rilis. | Waktu QA besar, hasil bergantung pada ketelitian orang. |
| Bukti pengujian (screenshot, langkah) dikumpulkan manual ke dokumen. | Lambat, tidak konsisten, sulit diaudit. |
| Alat otomasi umum (Selenium, Playwright) menuntut keahlian pemrograman dan instalasi. | QA non-programmer tidak bisa memakainya. |
| Aplikasi legacy memakai pola yang sulit direkam alat biasa: menu hover `onmouseover`, popup `window.open`, `<dialog>` + `<iframe>`, tombol F2 untuk daftar data, `confirm()` bawaan browser, postback lambat. | Perekam generik gagal atau menghasilkan skenario rapuh. |

## 3. Tujuan dan non-tujuan

### Tujuan
1. QA **non-programmer** dapat membuat skenario uji hanya dengan memakai website target.
2. Skenario dapat **diputar ulang** secara andal pada aplikasi legacy (menu, popup, dialog, iframe, postback lambat).
3. Hasil pengujian menghasilkan **bukti** yang rapi dan bisa dibagikan (HTML, Markdown, PDF, Word; Indonesia/English).
4. Skenario **disimpan terpusat** dan dapat dipakai bersama tim.
5. Mudah dijalankan: lokal atau di hosting Node biasa (saat ini Render), tanpa build step.

### Non-tujuan
- Bukan pengganti uji unit/integrasi/beban/keamanan.
- Bukan penguji tampilan piksel-demi-piksel (screenshot adalah bukti, bukan pembanding otomatis).
- Bukan runner CI headless pada versi ini (lihat Roadmap).

## 4. Pengguna

| Persona | Kebutuhan | Cara memakai |
|---|---|---|
| **QA analyst** (utama) | Membuat dan menjalankan skenario regresi tanpa kode; laporan untuk tim dan auditor. | Rekam di panel, edit langkah, simpan, putar ulang, ekspor laporan. |
| **QA lead / reviewer** | Memeriksa hasil dan bukti. | Membuka laporan HTML/PDF/Word, membuka skenario tersimpan. |
| **Developer / admin** | Men-deploy dan menjaga aplikasi. | Mengatur env, Supabase, hosting; membaca ARCHITECTURE.md. |

Bahasa antarmuka: **Indonesia**. Bahasa laporan: **Indonesia atau English** (dipilih saat ekspor).

## 5. Alur penggunaan utama

**A. Membuat skenario**
1. Login dengan password aplikasi.
2. Isi URL website target pada address bar, klik **Buka**.
3. Klik **● Rekam**, lalu operasikan website di panel. Gunakan **✓ Assert** lalu klik elemen untuk memverifikasi teks.
4. Klik **■ Stop**. Periksa dan edit langkah di panel kanan.
5. Isi nama skenario, klik **Simpan ke DB** (atau **⬇ JSON** untuk file).

**B. Menjalankan skenario**
1. Pilih skenario dari daftar di kiri (atau **⬆ Upload**/**⊕ Gabung file**).
2. Klik **▶ Jalankan** dan amati pemutaran langsung di panel.
3. Setiap langkah ditandai hijau (lulus) atau merah (gagal); pemutaran berhenti pada langkah gagal.

**C. Membuat laporan**
1. Setelah pemutaran selesai, pilih bahasa dan format, klik **Ekspor hasil**.
2. Laporan memuat ringkasan, deskripsi tiap langkah, durasi, pesan error, screenshot, dan **tampilan akhir**.

## 6. Kebutuhan fungsional

Prioritas: **M** = wajib, **S** = sebaiknya. Semua baris di bawah berstatus **✅ ada** kecuali disebut lain.

### 6.1 Akses dan keamanan
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-01 | Seluruh fitur dilindungi satu password aplikasi (`QA_PASSWORD`). Tanpa login, API dan proxy menolak permintaan. | M |
| FR-02 | Target ke alamat privat (`localhost`, `10.*`, `192.168.*`, `172.16–31.*`, `169.254.*`, `*.local`, `*.internal`) ditolak, kecuali `ALLOW_PRIVATE_HOSTS=1` (khusus lokal). | M |
| FR-03 | Nilai kolom password disamarkan di laporan dan di daftar langkah. | M |

### 6.2 Panel website
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-10 | Address bar + **Buka** memuat website target di dalam panel, sehingga aplikasi bisa membaca dan mengendalikan halaman itu. | M |
| FR-11 | Address bar menampilkan URL halaman aktif; navigasi di dalam target memperbarui URL. | M |
| FR-12 | Link `target=_blank`, form `target=_blank`, dan `window.open()` di target dibuka sebagai **tab di panel**; `window.opener` dan `window.close()` tetap bekerja. | M |
| FR-13 | `<dialog>` yang memuat `<iframe>` (mis. daftar data F2) dan iframe bersarang dapat direkam, diputar ulang, dan difoto. | M |

### 6.3 Perekaman
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-20 | Merekam: klik, klik dua kali, isi field (`type`), pilih opsi (`select`), Enter di field, tombol F1–F12, Escape, kombinasi Ctrl/Alt (mis. Ctrl+S), hover menu, dialog bawaan browser (`alert`/`confirm`/`prompt`), dan assertion teks. | M |
| FR-21 | Selector dibuat stabil, urutan prioritas: `#id` → atribut (`data-testid`, `name`, `aria-label`) → `text=` (tombol/tautan) → `cell=` (sel/baris daftar) → path CSS. | M |
| FR-22 | **Hover** hanya direkam bila benar-benar memunculkan elemen lain (sub menu). Jam berjalan, item yang sekadar dilewati, dan `mouseover` palsu tidak ikut. Target hover adalah elemen ber-`onmouseover` (mis. menu ASP.NET). | M |
| FR-23 | Klik pada field teks tidak direkam (hanya fokus); klik pada tombol gambar (`input type=image`), reset, dan tombol ikon direkam. | M |
| FR-24 | Tombol ikon diberi label yang terbaca manusia dari `title`/`alt`/`value`. | S |
| FR-25 | Aksi di tab baru, di iframe bersarang, dan di popup direkam bersama nomor tab (`tab`) dan jalur frame (`frame`). | M |

### 6.4 Pengeditan langkah
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-30 | Setiap langkah dapat diubah (aksi, selector, nilai), dinaikkan/diturunkan, dihapus; langkah baru dapat ditambah. | M |
| FR-31 | Langkah menampilkan status hasil (hijau/merah) setelah pemutaran, dan petunjuk tab/frame. | S |

### 6.5 Skenario
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-40 | Skenario disimpan di Supabase dengan nama; daftar skenario dengan **pencarian**; klik untuk membuka; **+ Skenario baru** untuk mulai kosong. | M |
| FR-41 | Menyimpan dengan nama yang sudah ada **menimpa** skenario lama setelah konfirmasi. | M |
| FR-42 | Skenario dapat diunduh/diunggah sebagai JSON; beberapa file dapat **digabung** (urut nama file) atau ditambahkan ke skenario yang sedang dibuka. | M |
| FR-43 | Tanpa Supabase, unduh/unggah JSON tetap berfungsi; pesan error DB menunjukkan penyebab nyata (401 key salah, 403 izin tabel, 404 URL/tabel). | S |

### 6.6 Pemutaran ulang
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-50 | Menjalankan skenario langsung di panel; berhenti pada langkah gagal; status per langkah. | M |
| FR-51 | Setiap langkah dan screenshot **menunggu halaman siap**: tidak ada navigasi berjalan, dokumen dan iframe `complete`, gambar selesai, tidak ada XHR/fetch aktif, stabil 0,3 dtk (maks 15 dtk). | M |
| FR-52 | Dialog bawaan browser dijawab **otomatis** sesuai rekaman dan teksnya diverifikasi; dialog tak terduga dijawab OK dan dicatat. | M |
| FR-53 | Replay menyalakan event mouse JavaScript dan aturan CSS `:hover`; event keyboard memakai `keyCode`/`which` agar handler legacy (mis. F2 = 113) berjalan. | M |
| FR-54 | Langkah `hover` yang elemennya tidak ditemukan dilewati (tidak menggagalkan skenario). | S |

### 6.7 Screenshot dan laporan
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-60 | Screenshot **halaman penuh**, resolusi tinggi (2×), semua gambar/CSS/font termasuk aset domain lain; kotak berscroll dibuka agar seluruh isinya terfoto. | M |
| FR-61 | Sebelum **klik**/klik dua kali/tekan tombol: screenshot dengan elemen target **disorot** (kotak merah). Sesudah langkah: screenshot hasil. Di akhir: **tampilan akhir** (atau keadaan saat error). | M |
| FR-62 | Ekspor laporan: **HTML, Markdown, PDF (dialog cetak), Word (.docx)**, bahasa **Indonesia/English**. Isi: ringkasan, status akhir, tiap langkah (deskripsi, durasi, error, catatan, screenshot), tampilan akhir. | M |
| FR-63 | Screenshot dapat dimatikan (kotak **Screenshot**). | S |

### 6.8 Operasional
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-70 | Berjalan lokal dengan `npm run dev` dan di hosting Node (saat ini **Render**) tanpa build step. | M |
| FR-71 | Logo ADO ditampilkan di pojok kiri bawah panel daftar skenario (`public/__qa/logo.png`). | S |

### Contoh kriteria penerimaan
- **FR-52 (dialog).** *Given* skenario berisi `click #save` lalu `dialog confirm "Save policy data ?" accept`. *When* skenario diputar. *Then* kotak dialog asli **tidak** muncul, halaman menerima jawaban OK, langkah `dialog` lulus; jika teks dialog berbeda, langkah gagal dengan pesan yang menyebut kedua teks.
- **FR-60 (halaman penuh).** *Given* halaman 1500 px lebar dengan kotak berscroll berisi 40 baris. *When* screenshot diambil di panel 700 px. *Then* gambar selebar ±1500 px dan memuat seluruh 40 baris serta elemen di ujung kanan.
- **FR-22 (hover).** *Given* menu `<td onmouseover>` yang membuka sub menu di kontainer terpisah. *When* user mengarahkan kursor lalu mengklik item sub menu. *Then* rekaman berisi tepat `hover` pada td menu dan `click` pada item (tanpa hover sisipan).

## 7. Kebutuhan non-fungsional

| Area | Kebutuhan |
|---|---|
| **Kompatibilitas** | Chrome/Edge (utama), Firefox. Safari tidak menerima cookie `Secure` pada http lokal; pakai Chrome/Firefox untuk lokal. Butuh Node ≥ 20.12 di server. |
| **Kinerja** | Replay menambah ±0,3 dtk per langkah untuk memastikan halaman stabil. Batas tunggu 15 dtk per langkah; permintaan menggantung > 8 dtk (long-poll) diabaikan. Respons per permintaan di hosting tertentu dapat dibatasi (mis. 4,5 MB di Vercel). |
| **Keamanan** | Satu password, cookie `HttpOnly`, `SameSite=Lax`, `Secure`. Proxy hanya untuk sesi login. Tidak ada rate limit login (lihat risiko). File JSON menyimpan nilai password polos agar replay bisa jalan — jangan pakai akun produksi. |
| **Keandalan** | Kegagalan screenshot tidak menggagalkan langkah (laporan mencatat "Screenshot tidak tersedia"). Hover yang hilang dilewati. |
| **Kemudahan pakai** | Satu halaman, tanpa instalasi di sisi pengguna; antarmuka berbahasa Indonesia; tema terang/gelap mengikuti sistem. |
| **Keterpeliharaan** | Tanpa framework dan tanpa build step; satu berkas UI; satu dependensi pihak ketiga (JSZip, di-vendor). |
| **Data** | Hanya tabel `scenarios` (nama, JSON langkah). Screenshot dan hasil **tidak** disimpan di server; hanya ada di laporan yang diekspor. |

## 8. Batasan dan asumsi

- Website target harus **dapat dijangkau dari server aplikasi**. Jika target hanya bisa dibuka lewat VPN/jaringan kantor, aplikasi harus dijalankan di dalam jaringan itu.
- Proxy menulis ulang alamat target pada HTML/JS/CSS dengan penggantian teks; URL yang dibangun saat runtime oleh JavaScript target tidak ikut ditulis ulang.
- Satu target per browser pada satu waktu (cookie sesi target dibagi di satu domain).
- Replay berjalan **di browser pengguna**, bukan server: tidak ada hover/drag sungguhan, upload file, atau dialog `showModalDialog`.
- Screenshot adalah **render ulang DOM**, bukan foto layar; dapat sedikit berbeda dari tampilan asli. Tidak menangkap isi iframe lintas domain, video, dan stylesheet lintas domain yang tidak terbaca.
- Konfigurasi Render yang dipakai (perintah start, `PORT`) belum didokumentasikan pengguna; lihat ARCHITECTURE.md bagian Deployment.

## 9. Di luar cakupan (saat ini)

Runner headless/CI, penjadwalan, multi-user dengan peran, hapus skenario dari UI, iframe lintas domain, `showModalDialog`, `beforeunload`, upload file, drag-and-drop, WebSocket, aplikasi mobile.

## 10. Risiko

| Risiko | Tingkat | Mitigasi / catatan |
|---|---|---|
| Skenario rapuh bila UI target berubah (selector, urutan baris). | Sedang | Selector berbasis id/teks; langkah dapat diedit manual. |
| Proxy dapat disalahgunakan bila password lemah (tanpa rate limit). | Sedang | Password panjang; **(Usulan)** rate limit + perlindungan di hosting. |
| Aplikasi target punya pola yang belum didukung (modal buatan sendiri, iframe lintas domain). | Sedang | Dilaporkan sebagai batasan; tambah dukungan sesuai kasus nyata. |
| Perubahan `sec-fetch-dest`/kebijakan browser memengaruhi penyisipan hook. | Rendah | Uji di Chrome/Edge/Firefox saat upgrade. |
| Kredensial uji tersimpan polos di JSON/DB. | Sedang | Pakai akun uji khusus; **(Usulan)** variabel/rahasia terpisah. |

## 11. Metrik keberhasilan (Usulan)

- ≥ 80% langkah hasil rekaman lulus pada replay pertama tanpa edit manual.
- Waktu menyiapkan satu skenario regresi < 15 menit (dibanding manual).
- 0 kasus password/target internal bocor lewat laporan.
- Laporan dapat diterima sebagai bukti uji oleh reviewer tanpa dokumen tambahan.

## 12. Roadmap / backlog (Usulan, belum dibangun)

1. Tombol **hapus** skenario di UI (saat ini lewat dashboard Supabase).
2. Pembatasan percobaan login dan dukungan variabel lingkungan `PORT`.
3. **Variabel/data-driven**: nilai input dari tabel/variabel, rahasia terpisah dari JSON.
4. Assertion tambahan: URL, elemen ada/tidak ada, nilai field, jumlah baris.
5. Edit nomor tab dan jalur frame langsung di daftar langkah.
6. Ekspor laporan sebagai satu paket ZIP (gambar terpisah) dan riwayat hasil per skenario.
7. Runner headless (Playwright) yang memutar JSON yang sama untuk CI.
8. Folder/tag skenario, pencarian lanjutan, berbagi per tim.

## 13. Pertanyaan terbuka

- Apakah laporan perlu disimpan di server (riwayat), atau cukup diekspor?
- Apakah dibutuhkan lebih dari satu pengguna dengan hak berbeda?
- Apakah target lain selain CARE (selain ASP.NET WebForms) akan diuji? Itu menentukan prioritas dukungan pola baru.
- Batas tunggu halaman (15 dtk) dan abaikan long-poll (8 dtk) cukup untuk proses berat di target?

## 14. Glosarium

| Istilah | Arti |
|---|---|
| **Skenario** | Daftar langkah hasil rekaman, disimpan sebagai JSON `{name, baseUrl, steps}`. |
| **Langkah (step)** | Satu aksi: `goto`, `click`, `dblclick`, `hover`, `dialog`, `type`, `select`, `press`, `assertText`. |
| **Panel** | Area iframe tempat website target dijalankan, dengan tab. |
| **Proxy** | Server yang meneruskan permintaan ke website target agar panel dan target satu origin. |
| **Hook** | Skrip kecil yang disisipkan ke halaman target untuk menangkap popup, dialog, dan event. |
| **Settle** | Menunggu halaman benar-benar siap sebelum lanjut atau memotret. |
| **Tampilan akhir** | Screenshot setelah semua langkah selesai (atau saat error). |
