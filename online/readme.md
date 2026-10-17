# Isekai Tactics — Versi Online (PHP + MySQL)

Versi awal permainan yang menyimpan data di **database MySQL** lewat **PDO**.
Ini aplikasi berdiri sendiri — tidak terkait dengan folder `offline/`.

---

## Kebutuhan

- PHP 7.4 atau lebih baru dengan ekstensi `pdo_mysql`
- MySQL / MariaDB
- Apache (atau server apa pun yang menjalankan PHP)

## Cara menjalankan

1. **Buat database dan impor datanya**

   ```bash
   mysql -u root -p < db.sql
   ```

   Ini membuat database `isekai_tactics` beserta tabel dan data awalnya.

2. **Sesuaikan koneksi** di bagian atas `api.php`:

   ```php
   const DB_DSN  = 'mysql:host=localhost;dbname=isekai_tactics;charset=utf8mb4';
   const DB_USER = 'root';
   const DB_PASS = '';
   ```

3. **Salin folder ini ke `htdocs/`** lalu buka:

   ```
   http://127.0.0.1/online/
   ```

4. **Masuk sebagai admin:** `admin` / `admin`.

---

## Isi folder

| Berkas | Tugas |
|---|---|
| `index.html` | Seluruh antarmuka dalam satu halaman |
| `style.css` | Gaya tampilan |
| `game.js` | Inti permainan: routing layar, tab bawah, statistik, roster, gudang |
| `battle.js` | Logika pertempuran |
| `studio.js` | Panel Studio untuk admin (mengedit bab, karakter, senjata, panji) |
| `api.php` | Seluruh endpoint API + lapisan basis data (PDO) |
| `db.sql` | Skema tabel + data awal |
| `art/` | 16 SVG (potret, senjata, panji, ikon) |
| `game2.js` | **Tidak dimuat** oleh `index.html` — berkas peninggalan yang dipertahankan |

Catatan: `game2.js` seharusnya dimuat setelah `game.js` sesuai catatan di baris pertamanya,
tetapi `index.html` saat ini hanya memuat `game.js`, `battle.js`, dan `studio.js`.

---

## Model database

Tabel yang dibuat oleh `db.sql`:

| Tabel | Isi |
|---|---|
| `users` | Akun pemain, mata uang, progres cerita, pity, peringkat |
| `owned_chars` | Karakter yang dimiliki tiap pemain |
| `owned_weapons` | Senjata yang dimiliki tiap pemain |
| `equips` | Senjata yang terpasang pada tiap karakter |
| `characters` | Katalog 25 karakter (bisa diedit admin) |
| `weapons` | Katalog senjata |
| `banners` | Panji gacha |
| `chapters` | Bab cerita, termasuk naskah yang bisa diedit admin |
| `settings` | Pengaturan permainan |

Endpoint `api.php` menangani antara lain: `profile`, `me`, `leaderboard`,
simpan milik karakter/senjata, `equips`, unggah gambar, dan pengaturan.

---

## Perbedaan utama dengan versi offline

| | `online/` | `offline/` |
|---|---|---|
| Penyimpanan | MySQL via PDO | `localStorage` |
| Server | Wajib PHP + MySQL | Tidak wajib (bisa dibuka langsung) |
| Katalog bab | Tabel `chapters` | Berkas `story.js` (205 bab) |
| Cocok untuk | Hosting web bersama | APK, demo, pengembangan |

**Folder `offline/` adalah versi yang aktif dikembangkan.** Seluruh fitur terbaru ada di sana.

---

## Kredit

Made by iwak team
