# Isekai Tactics

Game strategi tempur bergaya abad pertengahan dengan antarmuka berbahasa Indonesia.
Karakter dipanggil lewat gacha, formasi pasukan disusun sebelum bertempur, cerita dibagi
menjadi 5 bab besar berisi 40 tahap masing-masing.

Repo ini menyimpan **dua versi permainan yang berbeda** dan sudah dipisahkan ke dua folder:

| Folder | Versi | Data & penyimpanan | Cara menjalankan |
|---|---|---|---|
| [`offline/`](offline/) | **Offline** — HTML/CSS/JS murni, tanpa server, tanpa database | `localStorage` browser | Buka `offline/index.php` lewat server apa pun, atau `offline/index.html` langsung di browser |
| [`online/`](online/) | **Online** — PHP asli dengan PDO + MySQL | Tabel MySQL | Impor `online/db.sql`, jalankan dengan Apache/PHP + MySQL |

Baca [readme.md di dalam `offline/`](offline/readme.md) atau
[readme.md di dalam `online/`](online/readme.md) untuk penjelasan per folder.

---

## Yang penting untuk dibaca sekilas

- **Versi `offline/` adalah yang aktif dikembangkan.** Seluruh fitur terbaru (gacha pity,
  voice line karakter, MVP, zoom peta, filter editor cerita, event, dsb.) ada di folder ini.
- **Versi `online/` adalah versi awal** yang memakai database sungguhan. Isinya game yang sama
  dalam model lama (PDO/MySQL), dipertahankan sebagai arsip yang masih bisa dijalankan.
- **Keduanya adalah aplikasi terpisah**, bukan satu file besar. Tiap folder berdiri sendiri:
  bisa di-copy, di-zip, atau di-deploy tanpa folder lain.
- **Admin bawaan:** `admin` / `admin`.
- **Semua teks antarmuka berbahasa Indonesia.**
- **Tidak ada emoji** di mana pun; semua ikon dan potret memakai SVG buatan sendiri di folder `art/`.

---

## Ringkasan isi permainan

| Konten | Jumlah |
|---|---|
| Bab cerita utama | 5 bab × 40 tahap = **200** |
| Side story | **5** bab |
| Total bab cerita | **205** (yang memakai pertempuran: **72**) |
| Karakter | **25** |
| Senjata | **25** (senjata sejati maksimal **3** per karakter) |
| Panji / banner gacha | **10** |
| Event | **5** |
| Peta pertempuran | **29** |
| Rank leaderboard | 1000 peringkat, 10 ditampilkan, 990 pengisi |
| Tarikan pity | 5★ = **300** tarikan, 4★ = **10** tarikan |
| Batas komandan dalam satu pasukan | **10** |
| Level karakter | maksimal **100**, bintang maksimal **10** |
| Suara karakter | 25 karakter × 8 momen (teks, memakai SFX yang sudah ada) |

---

## Struktur repo

```
isekai-taktis/
├── readme.md                 ← file ini
├── offline/                  ← VERSI OFFLINE (yang aktif dikembangkan)
│   ├── readme.md
│   ├── index.html            ← seluruh antarmuka (satu halaman / SPA)
│   ├── index.php             ← pembungkus PHP untuk APK / PWA (menyuntik judul + konfigurasi)
│   ├── manifest.php          ← manifes PWA
│   ├── style.css
│   ├── art/                  ← 61 SVG (potret karakter, senjata, panji, ikon)
│   └── *.js                  ← 12 file: data + logika
│
└── online/                   ← VERSI ONLINE (PHP + MySQL)
    ├── readme.md
    ├── index.html
    ├── style.css
    ├── game.js / battle.js / game2.js / studio.js
    ├── api.php               ← seluruh endpoint API (PDO)
    ├── db.sql                ← skema + data awal database
    └── art/                  ← 16 SVG
```

---

## Cara menjalankan

### Versi offline (disarankan)

**Tanpa server** — cukup buka `offline/index.html` di browser. Semua data disimpan di
`localStorage` masing-masing browser.

**Dengan PHP** (dibutuhkan untuk membungkus APK, agar judul dan konfigurasi bisa diatur):

```bash
cd offline
php -S 127.0.0.1:8080 -t .
# lalu buka http://127.0.0.1:8080/index.php
```

Atau lewat XAMPP: salin folder `offline/` ke `htdocs/`, lalu buka
`http://127.0.0.1/offline/index.php`.

**Dengan container** (cara yang dipakai saat pengujian):

```bash
podman run -d --name phptest -p 8101:8101 \
  -v "$PWD/offline":/app:ro docker.io/library/php:8.2-cli \
  php -S 0.0.0.0:8101 -t /app
# buka http://127.0.0.1:8101/index.php
```

### Versi online

1. Impor `online/db.sql` ke MySQL/MariaDB.
2. Sesuaikan kredensial koneksi di bagian atas `online/api.php`.
3. Salin folder `online/` ke `htdocs/`, lalu buka `http://127.0.0.1/online/`.

---

## Peta file versi `offline/`

### Berkas data (isi permainan — ubah file ini untuk menambah konten)

| File | Isi |
|---|---|
| `story.js` | 205 bab cerita + definisi 10 arc (`ARCS`) |
| `chars.js` | 25 karakter: statistik awal, judul, latar belakang, `voice_*` |
| `weapons.js` | 25 senjata, termasuk senjata sejati (`true_for`) |
| `banners.js` | 10 panji gacha: jenis, isi, teks waktu, pity, tanggal berakhir |
| `events.js` | 5 event: syarat, skenario, hadiah, shop |
| `skills.js` | Skill bawaan: tipe, sasaran, rumus, status, kategori |

### Berkas logika

| File | Tugas |
|---|---|
| `game.js` | Tulang punggung: routing layar `go()`, tab bawah `mtab()`, statistik karakter, gudang senjata, roster, pemasangan senjata, `konfirmasi()` |
| `battle.js` | Seluruh pertempuran: pathfinding, giliran, status, fitur peta, moral, MVP |
| `server.js` | `SERVER()` — lapisan server lokal yang menyimpan data ke `localStorage`. Semua CRUD admin lewat file ini |
| `studio.js` | Antarmuka Studio (admin): editor karakter, senjata, cerita, event, skill, panji, pengaturan |
| `gacha_system.js` | Aturan gacha: pity, refund duplikat, konversi mata uang |
| `wish_ui.js` | Layar pemanggilan (wish): pilih panji, hitung mundur, hasil tarikan |

### Peta penting dalam kode

- **Routing layar:** `go('menu'|'login'|'story'|'event'|'scene'|'gacha'|'roster'|'armory'|'ranked'|'profil'|'setup'|'battle'|'studio')`
- **Tab bawah (3 buah):** `mtab('story'|'war'|'shop')`
- **Semua panggilan data:** `SERVER(nama_aksi, formData)` — **wajib `FormData`**, selalu `await`.
  Sukses mengembalikan objek; untuk simpan data biasanya `{ id: N }` (bukan `{ ok: 1 }`).
  Gagal mengembalikan `{ error: 'pesan' }`.
- **Konfirmasi:** `konfirmasi('pesan', { judul, ya, tidak })` — **tidak pernah** memakai
  `alert()`/`confirm()` bawaan browser.
- **Simpan gacha:** `GACHA` (aturan), `WISH.tiket()` / `WISH.tarik(n)` (pelaksanaan).
- **Bantuan:** konstanta `TAUTAN_BANTUAN` di baris pertama `server.js`. Semua pesan galat
  menautkannya; kosongkan untuk menyembunyikan.

---

## Aturan untuk AI / pengembang

Poin-poin ini wajib dijaga supaya aplikasi tetap jalan:

1. **Jangan pernah mendeklarasikan `const`/`let`/`function` tingkat atas dengan nama yang sama
   di dua file berbeda.** Ini langsung membuat seluruh aplikasi gagal (error fatal saat
   parsing). Pemeriksaan pemindaian tabrakan nama harus selalu menunjukkan **tabrakan: 0**.
2. **Tidak ada satu pun komentar** (`//`, `/* */`, `<!-- -->`) di dalam file `offline/`.
   File ini dikirim ke GitHub tanpa komentar.
3. **Semua karya seni adalah SVG buatan sendiri** — tanpa emoji, tanpa gambar eksternal,
   tanpa font dari internet selain yang sudah ada.
4. **Pertahankan kontras warna.** Latar gelap memakai teks terang, latar krem memakai teks
   hitam. Jangan menumpuk dua aturan `color` yang saling menimpa pada selektor berbeda.
5. **Teks tidak boleh bertumpuk atau terpotong** di lebar 390 px (ponsel) maupun 1366 px
   (desktop). Uji keduanya.
6. **Angka yang harus tetap benar:**
   - `story` = 205 bab, 72 di antaranya punya `battle: 1`
   - pity 5★ = 300 tarikan, pity 4★ = 10 tarikan
   - senjata sejati maksimal 3 per karakter (`MAKS_TRUE`)
   - batas komandan per pasukan = 10
   - level karakter ≤ 100, bintang ≤ 10
7. **Admin melihat semua konten terbuka**, termasuk bab yang belum diselesaikan pemain.
8. **Satu-satunya sumber kebenaran untuk versi offline adalah folder `offline/`.**
   Jangan membuat salinan kedua yang harus disinkronkan manual.

---

## Git

```bash
git remote add origin https://github.com/arsavinbintang/isekai-taktis.git
git push -u origin main
```
