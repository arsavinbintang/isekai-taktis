-- ============================================================
--  ISEKAI TACTICS  —  skema lengkap + data awal
--  Jalankan sekali lewat phpMyAdmin / mysql < db.sql
--  (Kalau sudah lama, hapus dulu database lama: DROP DATABASE isekai_tactics;)
-- ============================================================
CREATE DATABASE IF NOT EXISTS isekai_tactics CHARACTER SET utf8mb4;
USE isekai_tactics;

-- ---------- Akun & progres (semua progres disimpan di sini, bukan di browser) ----------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(30) NOT NULL UNIQUE,
  pass VARCHAR(255) NOT NULL,
  role ENUM('admin','player') NOT NULL DEFAULT 'player',
  gems INT NOT NULL DEFAULT 1200,
  pity_char INT NOT NULL DEFAULT 0,
  pity_weap INT NOT NULL DEFAULT 0,
  rank_pts INT NOT NULL DEFAULT 1000,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  story_done INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE owned_chars (
  user_id INT NOT NULL,
  char_id INT NOT NULL,
  PRIMARY KEY (user_id, char_id)
) ENGINE=InnoDB;

CREATE TABLE owned_weapons (
  user_id INT NOT NULL,
  weapon_id INT NOT NULL,
  PRIMARY KEY (user_id, weapon_id)
) ENGINE=InnoDB;

-- 3 slot senjata per karakter
CREATE TABLE equips (
  user_id INT NOT NULL,
  char_id INT NOT NULL,
  slot TINYINT NOT NULL,
  weapon_id INT NOT NULL,
  PRIMARY KEY (user_id, char_id, slot)
) ENGINE=InnoDB;

-- ---------- Konten ----------
CREATE TABLE characters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  title VARCHAR(80) DEFAULT '',
  faction VARCHAR(60) DEFAULT '',
  rarity TINYINT NOT NULL DEFAULT 3,
  hp INT NOT NULL DEFAULT 250,
  atk INT NOT NULL DEFAULT 50,
  ap TINYINT NOT NULL DEFAULT 4,
  ult ENUM('AoE Heal','AoE Dmg','Warcry','Teleport') NOT NULL DEFAULT 'AoE Dmg',
  passive VARCHAR(30) NOT NULL DEFAULT '',   -- pasif bawaan karakter (selalu aktif)
  skill VARCHAR(30) NOT NULL DEFAULT '',     -- skill aktif karakter (butuh AP + cooldown)
  lore VARCHAR(200) DEFAULT '',
  backstory TEXT,
  image VARCHAR(120) DEFAULT ''
) ENGINE=InnoDB;

CREATE TABLE weapons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  kind ENUM('sword','dagger','axe','spear','bow','staff','hammer','harp') NOT NULL DEFAULT 'sword',
  rarity TINYINT NOT NULL DEFAULT 3,
  w_atk INT NOT NULL DEFAULT 10,
  w_hp INT NOT NULL DEFAULT 20,
  w_crit TINYINT NOT NULL DEFAULT 0,
  passive VARCHAR(30) NOT NULL DEFAULT '',   -- '' = tanpa pasif
  true_for INT NOT NULL DEFAULT 0,           -- id karakter pemilik SENJATA SEJATI (0 = bukan senjata sejati siapa pun)
  image VARCHAR(120) DEFAULT ''
) ENGINE=InnoDB;

CREATE TABLE banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(200) DEFAULT '',
  kind ENUM('char','weapon') NOT NULL DEFAULT 'char',
  image VARCHAR(120) DEFAULT '',            -- gambar panji kustom (upload admin)
  pool VARCHAR(255) NOT NULL DEFAULT ''      -- daftar id (karakter / senjata) sesuai kind, dipisah koma
) ENGINE=InnoDB;

/* Preferensi & aset yang bisa diubah admin: musik, splash art, volume, dsb. */
CREATE TABLE settings (
  k VARCHAR(40) PRIMARY KEY,
  v TEXT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE chapters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  battle TINYINT NOT NULL DEFAULT 1,
  difficulty TINYINT NOT NULL DEFAULT 1,     -- 1 = mudah, 2 = sedang, 3 = sulit (mengatur kecerdasan AI)
  reward INT NOT NULL DEFAULT 300,           -- hadiah permata saat menang
  enemies VARCHAR(255) NOT NULL DEFAULT '',  -- SIAPA yang jadi lawan (id karakter, dipisah koma) — diatur admin
  script TEXT NOT NULL
) ENGINE=InnoDB;

-- ============================================================
--  DATA AWAL
-- ============================================================

-- Akun admin bawaan — USERNAME: admin   SANDI: admin
-- (Pendaftar berikutnya otomatis jadi pemain biasa, bukan admin.)
INSERT INTO users (username,pass,role,gems) VALUES
('admin','$2y$10$QTh61POeSZqmWSUugd0KbucBl20d1RC/6q3.W/T7gKGiD.EceWdfi','admin',1200);

INSERT INTO settings (k,v) VALUES
('music_mode','gen'),
('music_track','fajar'),
('music_vol','55'),
('music_file',''),
('splash_on','0'),
('splash_text','Isekai Tactics'),
('splash_sub','Perang taktik di tanah para raja'),
('splash_image','');
INSERT INTO characters (name,title,faction,rarity,hp,atk,ap,ult,passive,skill,lore,backstory,image) VALUES
('Valerius','Sang Fajar','Kerajaan Solaria',5,350,45,5,'AoE Heal','guard','mend','Ksatria agung yang pedangnya membawa fajar bagi sekutu.','Lahir di menara pos perbatasan, Valerius dijaga oleh penjaga tua yang tak pernah menyebut namanya. Pada malam pasukan bayangan membakar desanya, ia bersumpah pada puing-puing: selama napasnya masih ada, tak ada lagi yang kehilangan rumah karena lengannya lambat.\n\nSelama sepuluh tahun ia menolak takhta yang ditawarkan padanya. Baginya, mahkota hanya beban yang bisa dipegang dua tangan — dua tangan yang lebih baik digenggam pedang. Kini ia memimpin barisan depan Solaria, dan prajurit muda percaya: selama cahaya di bilahnya masih menyala, pagi masih akan datang.','art/char_valerius.svg'),
('Elysia','Penenun Hampa','Menara Kaca',5,200,65,4,'Teleport','haste','dash','Penyihir pengembara yang memanipulasi ruang antar jarak.','Elysia menghabiskan sembilan tahun di Menara Kaca mempelajari apa yang ada di antara dua titik. Ia menemukan bahwa ruang bukanlah tempat, melainkan perjanjian — dan perjanjian bisa dibatalkan.\n\nHarga pembatalannya besar. Setiap kali ia melipat jarak, sepotong ingatannya ikut terkoyak: wajah ibunya, nama kucing kecil, rasa roti hari pertama. Kini ia menjelajah perang bukan untuk kemuliaan, tapi karena kabar bahwa Kekaisaran Matahari sedang menenun ruang mereka sendiri. Ruang yang salah tenun bisa merobek seluruh dunia.','art/char_elysia.svg'),
('Kael','Taring Bayangan','Klan Malam',4,250,60,6,'Teleport','crit_up','pierce','Pembunuh klan malam yang lebih cepat dari bayangannya sendiri.','Kael dibesarkan di antara lorong-lorong kota tua, tempat anak-anak belajar bergerak tanpa suara sebelum belajar membaca. Klan Malam menamainya "taring" bukan karena ia ganas, tetapi karena ia selalu menggigit lebih dulu.\n\nNamun satu pesanan mengubah segalanya: target terakhirnya adalah tabib yang menolak bayinya. Kael membalikkan pisaunya sendiri pada malam itu, dan sejak itu ia berjalan di dua dunia — diburu oleh klan yang membesarkannya, dilindungi oleh mereka yang dulu ia intai. Ia berjuang untuk membuktikan bahwa bayangan pun bisa memilih untuk tidak membunuh.','art/char_kael.svg'),
('Aria','Nyanyian Keberanian','Gereja Fajar',3,220,30,5,'AoE Heal','inspire','warbanner','Penyanyi suci yang membangkitkan semangat prajurit sekarat.','Aria tidak pernah diajari berperang. Yang diajari padanya adalah cara bernapas tepat sebelum lagu dimulai, dan bagaimana satu nada yang jujur bisa membuat orang tetap berdiri ketika tubuhnya sudah meminta jatuh.\n\nIa berjalan di belakang barisan depan dengan harpa tua peninggalan ibunya, menyanyikan kisah-kisah yang tak pernah selesai. Prajurit bilang, mendengar suaranya di medan perang seperti mendengar rumah dari jauh. Itulah senjatanya: bukan yang mematikan, melainkan yang membuat orang menolak mati.','art/char_aria.svg'),
('Draken','Benteng Besi','Legiun Besi',4,450,35,4,'Warcry','vigor','bulwark','Jenderal lapis baja yang tak pernah gentar menghadapi gelombang musuh.','Draken pernah berdiri sendirian di Gerbang Utara selama tiga hari, tanpa pasukan, tanpa bekalan — hanya tameng yang retak dan tekad yang tidak. Ketika pasukan akhirnya tiba, mereka menemukan pintu gerbang masih berdiri dan tubuhnya masih bernapas.\n\nIa jarang bicara. Baginya, kata-kata adalah anak panah: lebih baik sedikit dan mengenai sasaran. Tetapi ketika ia akhirnya bersuara di medan perang, seluruh barisan mendengarkan, karena semua tahu suara itu hanya keluar ketika keadaan benar-benar gentar.','art/char_draken.svg'),
('Sylas','Pemanggil Api','Peneka Api',4,210,70,4,'AoE Dmg','burn','emberspark','Penyihir yang mengubah medan perang menjadi lautan abu.','Sylas belajar api dari gunung yang tak pernah tidur. Di kawahnya ia menulis mantra pertama, dan dengan ceroboh membakar dirinya sendiri sampai bekas luka membentuk pola yang menyerupai peta.\n\nKini ia diasingkan karena dianggap terlalu berbahaya bagi desa mana pun. Ia tidak menyalahkan siapa pun. Api memang tidak pernah bertanya izin sebelum menyala, dan Sylas sudah lama berhenti berpura-pura ia bisa mengendalikannya — ia hanya memilih dengan hati-hati ke mana nyala itu diarahkan.','art/char_sylas.svg');

INSERT INTO weapons (name,kind,rarity,w_atk,w_hp,w_crit,passive,true_for,image) VALUES
('Bilah Fajar','sword',5,35,80,8,'lifesteal',1,'art/wpn_bilahfajar.svg'),
('Tusuk Ruang','staff',5,40,40,6,'haste',2,'art/wpn_tusukruang.svg'),
('Taring Malam','dagger',5,32,30,20,'crit_up',3,'art/wpn_taringmalam.svg'),
('Harpa Senja','harp',5,25,90,5,'inspire',4,'art/wpn_harpasenja.svg'),
('Palu Bumi','hammer',5,30,140,4,'guard',5,'art/wpn_palubumi.svg'),
('Nadi Api','staff',5,42,50,8,'burn',6,'art/wpn_nadiapi.svg'),
('Bilah Perajam','sword',3,18,30,5,'',0,'art/wpn_bilahperajam.svg'),
('Kapak Rimba','axe',3,22,45,3,'',0,'art/wpn_kapakrimba.svg'),
('Busur Panjang','bow',4,26,35,10,'',0,'art/wpn_busurpanjang.svg'),
('Tombak Prajurit','spear',3,20,40,6,'',0,'art/wpn_tombakprajurit.svg');

-- Hadiah awal untuk akun admin (3 karakter + 2 senjata biasa, sama seperti pendaftar baru)
INSERT INTO owned_chars (user_id,char_id)
  SELECT u.id, c.cid FROM users u JOIN (SELECT 1 AS cid UNION SELECT 2 UNION SELECT 3) c
  WHERE u.username='admin';
INSERT INTO owned_weapons (user_id,weapon_id)
  SELECT u.id, w.wid FROM users u JOIN (SELECT id AS wid FROM weapons WHERE true_for=0 ORDER BY id LIMIT 2) w
  WHERE u.username='admin';

INSERT INTO banners (name,description,kind,pool) VALUES
('Panji Fajar','Karakter bintang 5 lebih sering muncul. Panji Kerajaan Solaria.','char','1,2,3,4,5,6'),
('Tangan Penempa','Senjata dari bengkel legendaris penempa benteng.','weapon','1,2,3,4,5,6,7,8,9,10');

INSERT INTO chapters (title,sort_order,battle,difficulty,reward,enemies,script) VALUES
('Bab 1: Pelatihan Perang (Tutorial)',1,1,1,300,'3,6','@bg field
Narator: Bab ini adalah pelatihan. Semua yang kau lihat di sini akan dipakai di perang berikutnya.
Pembimbing: Selamat datang, komandan. Sebelum berperang, pahami dulu empat hal berikut.
Pembimbing: SATU — Peta. Petak putih bisa kau injak. Petak gelap belum terlihat, jadi maju untuk membukanya lewat kabut perang.
Pembimbing: DUA — AP. Setiap pasukan punya AP. Bergerak memakai AP, menyerang memakai sisa AP. Titik kuning di atas kepala menunjukkan sisa AP-mu.
Pembimbing: TIGA — Koin. Bangunan yang kau kuasai memberi koin setiap awal giliran. Pilih bangunan, lalu tekan Rekrut untuk menambah pasukan.
Pembimbing: Empat — komandan. Pilih komandan, lalu tekan Naik level (20 koin) agar ia makin kuat, atau Ultimate (3 AP) untuk jurus andalan.
Pembimbing: Ingat pula: hutan dan reruntuhan memberi perlindungan, sungai hanya bisa dilewati lewat jembatan.
Pembimbing: Kalahkan semua musuh atau rebut Markas mereka. Ayo, coba sendiri!
Valerius: Panduannya sudah sekarang. Sekarang giliran kita angkat senjata.
Aria: Nadaku menyertai kalian. Jangan sampai jatuh, ya.
Kael: Latihan atau bukan, aku tidak akan menahan pisaunya.
Sylas: Asap pertama selalu paling tajam. Bersiaplah.'),
('Bab 2: Bayangan di Gerbang Utara',2,1,2,450,'5,3','@bg night
Narator: Malam menutupi Gerbang Utara. Obor-obor dipadamkan, dan hanya suara besi yang bicara.
Draken: Aku pernah berdiri di sini selama tiga hari tanpa siapa pun. Malam ini aku tidak sendirian.
Kael: Jenderal besi, kau menjaga gerbang yang salah. Yang kau jaga bukan kota, melainkan penjara.
Draken: Kalau begitu biar aku yang memutuskan penjara mana yang layak dijaga.
Valerius: Mereka sudah menguasai menara. Kita rebut balik sebelum fajar.
Aria: Bernapaslah. Nadaku akan menemani kalian sampai gerbang itu kembali milik kita.'),
('Bab 3: Lautan Abu',3,1,3,650,'6,2,5','@bg castle
Narator: Istana Solaria, bekas luka yang tak pernah benar-benar sembuh. Asap tipis menari di antara jendela kaca yang pecah.
Elysia: Ruang di istana ini sudah salah tenun. Setiap langkah bisa membawamu ke tempat yang bukan tempatmu.
Sylas: Cukup berdebat. Aku menawarkan satu hal terakhir: mundur, atau lihat kota ini jadi abu.
Draken: Kata-katanya sudah cukup. Biar besi yang menjawab.
Valerius: Solaria tidak pernah jatuh karena jumlah musuh. Berdiri bersamaku, satu barisan terakhir.
Aria: Ini lagu terakhir yang akan kubawakan malam ini. Buatlah ia sepadan.');

-- Beri 3 karakter pertama ke setiap akun baru tidak bisa diatur di sini (dilakukan server),
-- tetapi pemain yang belum punya apa-apa akan mendapatkan 3 karakter awal saat login pertama.
