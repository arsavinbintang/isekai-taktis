# Isekai Tactics — Versi Offline

Versi ini **murni HTML/CSS/JS**: tidak butuh database, tidak butuh server aplikasi,
tidak ada koneksi internet. Seluruh data disimpan di `localStorage` browser masing-masing.

Isi folder ini berdiri sendiri — bisa langsung di-copy ke mana pun.

---

## Cara menjalankan

### 1. Tanpa server (paling cepat)

Buka `index.html` langsung di browser (double-click). Seluruh game jalan.

### 2. Dengan PHP (untuk APK / PWA)

```bash
cd offline
php -S 127.0.0.1:8080 -t .
```

Lalu buka **`http://127.0.0.1:8080/index.php`**.

`index.php` menyuntikkan judul, warna, dan konfigurasi lain ke dalam `index.html`
kemudian menampilkannya. Bila `index.php` tidak tersedia, `index.html` tetap bisa
dibuka sendiri tanpa masalah.

### 3. Lewat container (dipakai saat pengujian)

```bash
podman run -d --name phptest -p 8101:8101 \
  -v "$PWD":/app:ro docker.io/library/php:8.2-cli \
  php -S 0.0.0.0:8101 -t /app
```

### Membungkus jadi APK

Folder ini adalah isi yang dibungkus. Yang dibutuhkan oleh pembungkus:
`index.php`, `index.html`, `style.css`, semua `*.js`, dan folder `art/`.

Konfigurasi pembungkus ada di variabel `$KONFIG` paling atas `index.php`
(`judul`, `sapaan`, `tautan_bantuan`, `warna`, `mulai`).

---

## Isi folder

```
offline/
├── index.html      ← seluruh antarmuka dalam satu halaman
├── index.php       ← pembungkus untuk APK/PWA
├── manifest.php    ← manifes PWA
├── ping.php        ← penanda kesiapan pembungkus
├── kill.php        ← berhenti paksa (hanya untuk lingkungan uji)
├── .htaccess       ← header keamanan + larangan akses file sensitif
├── style.css       ← seluruh gaya (termasuk mode desktop & ponsel)
├── art/            ← 61 SVG
├── readme.md       ← file ini
└── 12 file .js
```

### File data — ubah ini untuk menambah konten

| File | Isi |
|---|---|
| `story.js` | 205 bab cerita (200 utama dalam 5 arc × 40 tahap, + 5 side story) dan definisi `ARCS` |
| `chars.js` | 25 karakter: HP, ATK, AP, judul, latar belakang, baris suara `voice_*` |
| `weapons.js` | 25 senjata, termasuk senjata sejati (`true_for` menentukan pemilik) |
| `banners.js` | 10 panji gacha: jenis (karakter/senjata), isi, teks waktu, tanggal berakhir, pity |
| `events.js` | 5 event: syarat keterbukaan, skenario, daftar hadiah, shop |
| `skills.js` | Skill bawaan beserta tipe, sasaran, jangkauan, rumus, status, kategori |

### File logika

| File | Tugas |
|---|---|
| `game.js` | Routing layar `go()`, tab bawah `mtab()`, statistik karakter, gudang senjata, roster, pemasangan senjata, `konfirmasi()`, pencarian & pemilihan pasukan |
| `battle.js` | Pertempuran penuh: giliran, pathfinding, status, peti rampasan, garis pasukan, diserbu dari sisi, rantai serang, moral, zoom peta, MVP |
| `server.js` | `SERVER()` — lapisan data lokal di atas `localStorage`. Seluruh CRUD admin (karakter, senjata, bab, event, skill, panji, pengaturan) ada di sini |
| `studio.js` | Antarmuka Studio untuk admin: form editor, filter bab cerita, unggah gambar |
| `gacha_system.js` | Aturan gacha: pity 300/10, refund duplikat, konversi mata uang |
| `wish_ui.js` | Layar pemanggilan: pilih panji, hitung mundur, daftar hasil |

---

## Pemakaian API dalam kode

```js
const hasil = await SERVER('nama_aksi', formData);
```

- Argumen kedua **wajib `FormData`**.
- Sukses untuk aksi simpan umumnya `{ id: N }` — **bukan** `{ ok: 1 }`.
- Gagal mengembalikan `{ error: 'pesan' }`.
- Aksi utama: `login`, `register`, `profile`, `save`, `leaderboard`,
  `char_save`, `weapon_save`, `chapter_save`, `event_save`, `skill_save`,
  `banner_save`, `settings_save`, `event_claim`.

## Peta konstanta

- **Layar:** `menu, login, story, event, scene, gacha, roster, armory, ranked, profil, setup, battle, studio`
- **Tab bawah:** `mtab('story' | 'war' | 'shop')`
- **Tombol konfirmasi:** `konfirmasi(teks, { judul, ya, tidak })` — modal buatan sendiri,
  tidak pernah `alert()`/`confirm()`
- **Suara:** `sfx('back capture click die err hit horn level open pick ult unit wish')`
- **Bantuan:** `TAUTAN_BANTUAN` (baris pertama `server.js`) — dikaitkan ke semua pesan galat

## Admin

Masuk dengan `admin` / `admin`, lalu buka **Studio**.
Admin melihat seluruh bab cerita meski belum diselesaikan pemain.

## Batas yang harus dijaga

- Total bab cerita **205** (72 punya pertempuran)
- Pity 5★ **300** tarikan, pity 4★ **10** tarikan
- Senjata sejati maksimal **3** per karakter
- Komandan per pasukan maksimal **10**
- Level karakter ≤ **100**, bintang ≤ **10**
- Nama tingkat atas (`const`/`function`) **tidak boleh kembar** antar file
- **Tidak ada satu pun komentar** di file-file dalam folder ini
