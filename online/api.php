<?php
/* ==========================================================================
   ISEKAI TACTICS — API (PHP + PDO + MySQL, tanpa framework)

   Semua progres pemain disimpan di AKUN (tabel users / owned_* / equips),
   bukan di browser:
     - permata, pity gacha ( karakter & senjata terpisah )
     - koleksi karakter & senjata beserta perataan senjata (maks 3 per karakter)
     - poin peringkat, menang/kalah, progres cerita

   Endpoint (GET):  chars, weapons, story, banners, me, leaderboard
   Endpoint (POST): register, login, logout, pull, equip, battle_end
                    (admin) char_save, char_del, weapon_save, weapon_del,
                            chapter_save, chapter_del, banner_save, banner_del
   ========================================================================== */

/* ---- Konfigurasi (sesuaikan dengan XAMPP/hosting) ---- */
const DB_DSN  = 'mysql:host=localhost;dbname=isekai_tactics;charset=utf8mb4';
const DB_USER = 'root';
const DB_PASS = '';

header('Content-Type: application/json; charset=utf-8');
session_start();

function out($d) { echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function post($k, $d = null) { return isset($_POST[$k]) ? $_POST[$k] : $d; }
function clean($s) { return trim((string)$s); }
function num($k, $d = 0) { $v = post($k, $d); return is_numeric($v) ? (int)$v : (int)$d; }
function clamp($v, $a, $b) { return max($a, min($b, $v)); }

function rows($db, $sql, $arg = []) { $s = $db->prepare($sql); $s->execute($arg); return $s->fetchAll(); }
/* beri kepemilikan tanpa duplikat (portabel MySQL & SQLite) */
function grant($db, $table, $key, $uid, $item) {
    if (!val($db, "SELECT COUNT(*) FROM $table WHERE user_id=? AND $key=?", [$uid, $item]))
        $db->prepare("INSERT INTO $table (user_id,$key) VALUES (?,?)")->execute([$uid, $item]);
}
function one($db, $sql, $arg = []) { $s = $db->prepare($sql); $s->execute($arg); $r = $s->fetch(); return $r === false ? null : $r; }
function val($db, $sql, $arg = []) { $s = $db->prepare($sql); $s->execute($arg); return $s->fetchColumn(); }

try {
    $db = new PDO(DB_DSN, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    out(['error' => 'Koneksi database gagal. Pastikan db.sql sudah diimpor dan DB_DSN di api.php benar.']);
}

/* --------------------------------------------------------------------------
   Profil akun
   -------------------------------------------------------------------------- */
function equipsMap($db, $uid) {
    $eq = [];
    foreach (rows($db, 'SELECT char_id, slot, weapon_id FROM equips WHERE user_id=? ORDER BY slot', [$uid]) as $r) {
        $eq[(int)$r['char_id']][(int)$r['slot']] = (int)$r['weapon_id'];
    }
    $out = [];
    foreach ($eq as $cid => $slots) { $a = [0, 0, 0]; foreach ($slots as $s => $w) if ($s >= 1 && $s <= 3) $a[$s - 1] = (int)$w; $out[$cid] = $a; }
    return $out;
}
function profile($db, $u) {
    $uid = (int)$u['id'];
    $own = []; foreach (rows($db, 'SELECT char_id FROM owned_chars WHERE user_id=?', [$uid]) as $r) $own[] = (int)$r['char_id'];
    $wpn = []; foreach (rows($db, 'SELECT weapon_id FROM owned_weapons WHERE user_id=?', [$uid]) as $r) $wpn[] = (int)$r['weapon_id'];
    return [
        'gems'      => (int)$u['gems'],
        'pity_char' => (int)$u['pity_char'],
        'pity_weap' => (int)$u['pity_weap'],
        'rank_pts'  => (int)$u['rank_pts'],
        'wins'      => (int)$u['wins'],
        'losses'    => (int)$u['losses'],
        'story_done'=> (int)$u['story_done'],
        'owned'     => $own,
        'weapons'   => $wpn,
        'equips'    => equipsMap($db, $uid),
    ];
}
function me($db) {
    $uid = isset($_SESSION['uid']) ? (int)$_SESSION['uid'] : 0;
    if (!$uid) return ['admin' => false, 'user' => null, 'profile' => null];
    $u = one($db, 'SELECT * FROM users WHERE id=?', [$uid]);
    if (!$u) { unset($_SESSION['uid'], $_SESSION['admin']); return ['admin' => false, 'user' => null, 'profile' => null]; }
    return ['admin' => $u['role'] === 'admin', 'user' => $u['username'], 'profile' => profile($db, $u)];
}

/* Peringkat: gabungan pemain asli + saingan tetap agar tangga hidup sejak awal */
function leaderboard($db) {
    $npc = [
        ['Ravik Sang Penakluk', 1748, 51, 11],
        ['Widuri Mahkota Bara', 1665, 44, 13],
        ['Grimbold Tangan Besi', 1570, 39, 15],
        ['Sersan Luhur', 1486, 33, 16],
        ['Mira Penjaga Menara', 1402, 28, 17],
        ['Bayangan Senja', 1321, 24, 18],
        ['Oden Penjelajah Rimba', 1240, 21, 19],
        ['Kapten Rendra', 1168, 17, 20],
        ['Pemanah Muda Hana', 1094, 13, 21],
        ['Rekrut Baru Baskara', 1012, 8, 22],
    ];
    $list = [];
    foreach (rows($db, 'SELECT username, rank_pts, wins, losses FROM users') as $r) {
        $list[] = ['name' => $r['username'], 'pts' => (int)$r['rank_pts'], 'wins' => (int)$r['wins'], 'losses' => (int)$r['losses'], 'npc' => 0];
    }
    foreach ($npc as $n) $list[] = ['name' => $n[0], 'pts' => $n[1], 'wins' => $n[2], 'losses' => $n[3], 'npc' => 1];
    usort($list, function ($a, $b) { return $b['pts'] - $a['pts'] ?: $b['wins'] - $a['wins']; });
    $meName = null;
    if (isset($_SESSION['uid'])) { $m = me($db); $meName = isset($m['user']) ? $m['user'] : null; }
    $myRank = 0;
    foreach ($list as $i => $r) if ($meName !== null && $r['name'] === $meName && !$r['npc']) { $myRank = $i + 1; break; }
    return ['list' => array_slice($list, 0, 60), 'me' => $meName === null ? null : ['name' => $meName, 'rank' => $myRank], 'total' => count($list)];
}

/* --------------------------------------------------------------------------
   GET publik
   -------------------------------------------------------------------------- */
$a = isset($_GET['a']) ? (string)$_GET['a'] : '';
if ($a === 'chars')       out(rows($db, 'SELECT * FROM characters ORDER BY id'));
if ($a === 'weapons')     out(rows($db, 'SELECT * FROM weapons ORDER BY rarity DESC, id'));
if ($a === 'story')       out(rows($db, 'SELECT * FROM chapters ORDER BY sort_order, id'));
if ($a === 'banners')     out(rows($db, 'SELECT * FROM banners ORDER BY id'));
if ($a === 'leaderboard') out(leaderboard($db));
if ($a === 'me')          out(me($db));
/* pengaturan publik: musik, splash art, volume — siapa pun boleh membaca */
if ($a === 'settings') {
    $s = [];
    foreach (rows($db, 'SELECT k,v FROM settings') as $r) $s[$r['k']] = $r['v'];
    out($s);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['error' => 'Permintaan tidak valid']);

/* --------------------------------------------------------------------------
   Autentikasi
   -------------------------------------------------------------------------- */
if ($a === 'register') {
    $u = clean(post('username')); $p = (string)post('password', '');
    if (!preg_match('/^[A-Za-z0-9_]{3,30}$/', $u)) out(['error' => 'Username 3-30 huruf/angka/underscore']);
    if (strlen($p) < 6) out(['error' => 'Sandi minimal 6 karakter']);
    if (one($db, 'SELECT id FROM users WHERE username=?', [$u])) out(['error' => 'Username sudah dipakai']);
    // admin sudah disiapkan di db.sql; pendaftar baru jadi pemain biasa
    // (kepala kreator tetap bisa daftar dulu bila database benar-benar kosong)
    $role = val($db, 'SELECT COUNT(*) FROM users WHERE role=\'admin\'') ? 'player' : 'admin';
    $db->prepare('INSERT INTO users (username,pass,role) VALUES (?,?,?)')->execute([$u, password_hash($p, PASSWORD_DEFAULT), $role]);
    $uid = (int)$db->lastInsertId();

    // pemain baru langsung diberi pasukan awal + senjata biasa
    foreach (rows($db, 'SELECT id FROM characters ORDER BY id LIMIT 3') as $c)
        grant($db, 'owned_chars', 'char_id', $uid, (int)$c['id']);
    foreach (rows($db, 'SELECT id FROM weapons WHERE true_for=0 ORDER BY id LIMIT 2') as $w)
        grant($db, 'owned_weapons', 'weapon_id', $uid, (int)$w['id']);

    // migrasi progres tamu (permainan sebelum masuk akun) agar tidak hilang
    $g = post('guest');
    if (is_string($g) && $g !== '') {
        $s = json_decode($g, true);
        if (is_array($s)) {
            foreach (array_slice((array)($s['own'] ?? []), 0, 200) as $cid)
                grant($db, 'owned_chars', 'char_id', $uid, (int)$cid);
            foreach (array_slice((array)($s['ownW'] ?? []), 0, 200) as $wid)
                grant($db, 'owned_weapons', 'weapon_id', $uid, (int)$wid);
            if (!empty($s['eq']) && is_array($s['eq'])) {
                foreach ($s['eq'] as $cid => $slots) {
                    foreach ((array)$slots as $i => $wid) {
                        $wid = (int)$wid; if ($wid < 1) continue;
                        $own = val($db, 'SELECT COUNT(*) FROM owned_weapons WHERE user_id=? AND weapon_id=?', [$uid, $wid]);
                        $busy = val($db, 'SELECT COUNT(*) FROM equips WHERE user_id=? AND weapon_id=?', [$uid, $wid]);
                        if (!$own || $busy) continue;
                        $db->prepare('INSERT INTO equips (user_id,char_id,slot,weapon_id) VALUES (?,?,?,?)')
                           ->execute([$uid, (int)$cid, clamp((int)$i + 1, 1, 3), $wid]);
                    }
                }
            }
            $db->prepare('UPDATE users SET gems=?, story_done=? WHERE id=?')
               ->execute([clamp((int)($s['gem'] ?? 1200), 0, 999999), (int)($s['storyDone'] ?? 0), $uid]);
        }
    }

    session_regenerate_id(true);
    $_SESSION['uid'] = $uid; $_SESSION['admin'] = $role === 'admin';
    out(me($db));
}
if ($a === 'login') {
    $r = one($db, 'SELECT * FROM users WHERE username=?', [clean(post('username'))]);
    if (!$r || !password_verify((string)post('password', ''), $r['pass'])) out(['error' => 'Username atau sandi salah']);
    session_regenerate_id(true);
    $_SESSION['uid'] = (int)$r['id']; $_SESSION['admin'] = $r['role'] === 'admin';
    out(me($db));
}
if ($a === 'logout') { unset($_SESSION['uid'], $_SESSION['admin']); out(['ok' => 1]); }

$uid = isset($_SESSION['uid']) ? (int)$_SESSION['uid'] : 0;
if (!$uid) out(['error' => 'Silakan masuk dulu agar progres tersimpan di akun.']);
$user = one($db, 'SELECT * FROM users WHERE id=?', [$uid]);
if (!$user) out(['error' => 'Sesi berakhir, silakan masuk ulang.']);

/* --------------------------------------------------------------------------
   Gacha — dua jenis banner: karakter & senjata (RNG di server)
   -------------------------------------------------------------------------- */
function pickItem($items, $pool, $rar, $preferNew, $owned) {
    $in = [];
    foreach ($items as $it) if (!$pool || in_array((int)$it['id'], $pool, true)) $in[] = $it;
    if (!$in) $in = $items;
    if (!$in) return null;
    $cand = [];
    foreach ($in as $it) if ((int)$it['rarity'] === $rar) $cand[] = $it;
    if (!$cand) {
        $best = null; $bd = 99;
        foreach ($in as $it) { $d = abs((int)$it['rarity'] - $rar); if ($d < $bd) { $bd = $d; $best = (int)$it['rarity']; } }
        foreach ($in as $it) if ((int)$it['rarity'] === $best) $cand[] = $it;
    }
    if ($preferNew) {
        $fresh = [];
        foreach ($cand as $it) if (!in_array((int)$it['id'], $owned, true)) $fresh[] = $it;
        if ($fresh) $cand = $fresh;
    }
    return $cand[mt_rand(0, count($cand) - 1)];
}

if ($a === 'pull') {
    $n = clamp(num('n', 1), 1, 10);
    $b = one($db, 'SELECT * FROM banners WHERE id=?', [num('banner_id')]);
    if (!$b) out(['error' => 'Banner tidak ditemukan']);
    $cost = 100 * $n;
    if ((int)$user['gems'] < $cost) out(['error' => 'Permata tidak cukup']);

    $weapon = $b['kind'] === 'weapon';
    $pool = [];
    foreach (explode(',', (string)$b['pool']) as $x) if (trim($x) !== '') $pool[] = (int)$x;

    if ($weapon) {
        $items = rows($db, 'SELECT id,name,kind,rarity,w_atk,w_hp,w_crit,true_for,image FROM weapons');
        $owned = []; foreach (rows($db, 'SELECT weapon_id FROM owned_weapons WHERE user_id=?', [$uid]) as $r) $owned[] = (int)$r['weapon_id'];
        $pityCol = 'pity_weap'; $table = 'owned_weapons'; $key = 'weapon_id';
    } else {
        $items = rows($db, 'SELECT id,name,title,rarity,image FROM characters');
        $owned = []; foreach (rows($db, 'SELECT char_id FROM owned_chars WHERE user_id=?', [$uid]) as $r) $owned[] = (int)$r['char_id'];
        $pityCol = 'pity_char'; $table = 'owned_chars'; $key = 'char_id';
    }
    foreach ($items as $k => $it) $items[$k]['id'] = (int)$it['id'];
    if (!$items) out(['error' => 'Belum ada ' . ($weapon ? 'senjata' : 'karakter') . ' di database.']);

    $pity = (int)$user[$pityCol];
    $refund = 0; $results = [];
    for ($i = 0; $i < $n; $i++) {
        $pity++;
        $guaranteed = $pity >= 30;
        $r = mt_rand(0, 9999) / 10000;
        $rar = $guaranteed ? 5 : ($r < 0.04 ? 5 : ($r < 0.16 ? 4 : 3));
        if ($guaranteed) $pity = 0;
        $it = pickItem($items, $pool, $rar, $guaranteed, $owned);
        if (!$it) continue;
        $dup = in_array((int)$it['id'], $owned, true);
        // ganti senjata/karakter kembar: sesuai bintang, sengaja dibuat lebih murah
        // daripada biaya tarikan (100) supaya menarik kembar tak bisa jadi ladang permata
        if ($dup) $refund += [5 => 200, 4 => 80, 3 => 30][(int)$it['rarity']] ?? 30;
        else {
            $db->prepare("INSERT INTO $table (user_id,$key) VALUES (?,?)")->execute([$uid, (int)$it['id']]);
            $owned[] = (int)$it['id'];
        }
        $results[] = [
            'id' => (int)$it['id'], 'name' => $it['name'], 'rarity' => (int)$it['rarity'],
            'dup' => $dup ? 1 : 0, 'image' => (string)$it['image'],
            'weapon' => $weapon ? 1 : 0,
            'sub' => $weapon
                ? (strtoupper($it['kind']) . ' +ATK ' . (int)$it['w_atk'] . ' +HP ' . (int)$it['w_hp'])
                : (string)($it['title'] ?? ''),
            'guaranteed' => $guaranteed ? 1 : 0,
        ];
    }
    $db->prepare("UPDATE users SET gems = gems - ? + ?, $pityCol = ? WHERE id=?")->execute([$cost, $refund, $pity, $uid]);
    $user = one($db, 'SELECT * FROM users WHERE id=?', [$uid]);
    out(['results' => $results, 'cost' => $cost, 'refund' => $refund, 'profile' => profile($db, $user)]);
}

/* --------------------------------------------------------------------------
   Perataan senjata — maksimal 3 senjata per karakter
   -------------------------------------------------------------------------- */
if ($a === 'equip') {
    $cid = num('char_id');
    $has = val($db, 'SELECT COUNT(*) FROM owned_chars WHERE user_id=? AND char_id=?', [$uid, $cid]);
    if (!$has) out(['error' => 'Karakter itu belum kamu miliki.']);
    $slots = [num('s1'), num('s2'), num('s3')];
    $seen = [];
    foreach ($slots as $w) if ($w) {
        if (isset($seen[$w])) out(['error' => 'Senjata yang sama tidak boleh dipasang dua kali.']);
        $seen[$w] = 1;
        if (!val($db, 'SELECT COUNT(*) FROM owned_weapons WHERE user_id=? AND weapon_id=?', [$uid, $w]))
            out(['error' => 'Kamu belum memiliki senjata itu.']);
        $busy = one($db, 'SELECT char_id FROM equips WHERE user_id=? AND weapon_id=? AND char_id<>?', [$uid, $w, $cid]);
        if ($busy) out(['error' => 'Senjata itu sedang dipakai karakter lain. Lepas dulu di karakter tersebut.']);
    }
    $db->prepare('DELETE FROM equips WHERE user_id=? AND char_id=?')->execute([$uid, $cid]);
    foreach ($slots as $i => $w) if ($w)
        $db->prepare('INSERT INTO equips (user_id,char_id,slot,weapon_id) VALUES (?,?,?,?)')->execute([$uid, $cid, $i + 1, $w]);
    out(['ok' => 1, 'equips' => equipsMap($db, $uid)]);
}

/* --------------------------------------------------------------------------
   Hasil pertempuran → imbalan disimpan di akun
   -------------------------------------------------------------------------- */
if ($a === 'battle_end') {
    $mode = in_array(post('mode'), ['STORY', 'CLASSIC', 'RANKED', 'PVP'], true) ? post('mode') : 'CLASSIC';
    $win = num('win') ? 1 : 0;
    $g = 0; $pts = 0; $msg = 'Tidak ada hadiah pada mode ini.';

    if ($mode === 'PVP') {
        out(['msg' => $msg, 'gems_delta' => 0, 'pts_delta' => 0, 'profile' => profile($db, $user)]);
    }
    if ($mode === 'STORY') {
        $ch = one($db, 'SELECT * FROM chapters WHERE id=?', [num('chapter_id')]);
        if (!$ch) out(['error' => 'Bab cerita tidak ditemukan.']);
        if ($win) {
            $g = (int)$ch['reward'];
            $msg = 'Bab selesai. Hadiah ' . $g . ' permata.';
            if ((int)$ch['sort_order'] > (int)$user['story_done'])
                $db->prepare('UPDATE users SET story_done=? WHERE id=?')->execute([(int)$ch['sort_order'], $uid]);
        } else { $g = 50; $msg = 'Kekalahan. Hiburan ' . $g . ' permata.'; }
    } elseif ($mode === 'CLASSIC') {
        $g = $win ? 200 : 60;
        $msg = $win ? 'Kemenangan! +' . $g . ' permata.' : 'Kalah. +' . $g . ' permata hiburan.';
    } elseif ($mode === 'RANKED') {
        $oldPts = (int)$user['rank_pts'];
        $pts = $oldPts;
        $tierBonus = $pts >= 1750 ? 15 : ($pts >= 1500 ? 12 : ($pts >= 1300 ? 9 : ($pts >= 1150 ? 6 : 4)));
        if ($win) { $g = 250; $pts += 20 + $tierBonus; $msg = 'Menang ranked! +' . (20 + $tierBonus) . ' poin, +' . $g . ' permata.'; }
        else { $g = 80; $pts -= 18; $msg = 'Kalah ranked. Poin menjadi ' . $pts . ', +' . $g . ' permata.'; }
        $pts = clamp($pts, 500, 3000);
        $col = $win ? 'wins' : 'losses';
        $db->prepare("UPDATE users SET rank_pts=?, $col=$col+1 WHERE id=?")->execute([$pts, $uid]);
        $delta = $pts - $oldPts;
    }
    $db->prepare('UPDATE users SET gems = gems + ? WHERE id=?')->execute([max(0, $g), $uid]);
    $user = one($db, 'SELECT * FROM users WHERE id=?', [$uid]);
    out(['msg' => $msg, 'gems_delta' => $g, 'pts_delta' => $mode === 'RANKED' ? $delta : 0, 'profile' => profile($db, $user)]);
}

/* --------------------------------------------------------------------------
   ADMIN (Studio) — semuanya butuh akun admin
   -------------------------------------------------------------------------- */
if (empty($_SESSION['admin'])) out(['error' => 'Khusus admin. Silakan masuk dengan akun admin.']);

$id = num('id');

/* --------------------------------------------------------------------------
   PENERJEMAH KESALAHAN UNGGAHAN.
   Dulu $_FILES yang ditolak PHP (mis. melebihi upload_max_filesize) membuat
   tmp_name kosong, sehingga fungsi di bawah diam-dembalik mengembalikan gambar
   lama — "Simpan" terlihat berhasil tetapi foto tidak pernah tersimpan.
   Sekarang setiap penyebab dilaporkan apa adanya ke layar admin.
   -------------------------------------------------------------------------- */
function upErr($f, $what) {
    $e = (int)($f['error'] ?? UPLOAD_ERR_OK);
    if ($e === UPLOAD_ERR_NO_FILE) return null;          /* admin memang tidak memilih berkas */
    if ($e === UPLOAD_ERR_OK) return null;
    $max = (string)ini_get('upload_max_filesize') ?: '2M';
    $map = [
        UPLOAD_ERR_INI_SIZE   => "$what terlalu besar untuk batas PHP — <b>upload_max_filesize = $max</b>. "
                               . "Perbesar batas itu di php.ini (XAMPP: <code>C:\\xampp\\php\\php.ini</code>) lalu restart Apache, "
                               . "atau unggah berkas yang lebih kecil.",
        UPLOAD_ERR_FORM_SIZE  => "$what melebihi batas maksimum yang diizinkan form.",
        UPLOAD_ERR_PARTIAL    => "$what terpotong saat dikirim — coba unggah ulang.",
        UPLOAD_ERR_NO_TMP_DIR => "Folder sementara PHP tidak ditemukan — periksa <code>upload_tmp_dir</code> di php.ini.",
        UPLOAD_ERR_CANT_WRITE => "$what gagal ditulis ke disk — izin folder <code>uploads/</code> belum cukup.",
        UPLOAD_ERR_EXTENSION  => "$what ditolak oleh ekstensi PHP.",
    ];
    return $map[$e] ?? "$what gagal diunggah (kode galat PHP $e).";
}
/* seluruh isi $_POST & $_FILES bisa hilang bila melebihi post_max_size */
function postGuard($what) {
    if (empty($_POST) && empty($_FILES) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0)
        out(['error' => "Unggahan $what terlalu besar — seluruh isi permintaan dipotong oleh PHP "
            . "(<b>post_max_size = " . (string)ini_get('post_max_size') . "</b>). "
            . "Perbesar batas itu di php.ini lalu restart Apache."]);
}

function uploadImg($f, $old) {
    if (!$f) return (string)$old;                        /* baris berkas tidak ikut terkirim */
    $bad = upErr($f, 'Gambar'); if ($bad) out(['error' => $bad]);
    if (empty($f['tmp_name']) || !is_uploaded_file($f['tmp_name'])) return (string)$old;
    $info = @getimagesize($f['tmp_name']);
    $ext = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'][$info['mime'] ?? ''] ?? null;
    if (!$ext) out(['error' => 'Format gambar harus PNG, JPG, atau WEBP.']);
    if ($f['size'] > 2 * 1024 * 1024) out(['error' => 'Gambar lebih besar dari 2 MB setelah dibaca — biarkan pemrosesan otomatis di Studio memperkecilnya, atau unggah berkas lebih kecil.']);
    if (!is_dir(__DIR__ . '/uploads')) @mkdir(__DIR__ . '/uploads', 0755, true);
    if (!is_dir(__DIR__ . '/uploads') || !is_writable(__DIR__ . '/uploads'))
        out(['error' => 'Folder <code>uploads/</code> belum bisa ditulis. Buat folder itu di samping api.php lalu beri izin tulis.']);
    $img = 'uploads/' . bin2hex(random_bytes(8)) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], __DIR__ . '/' . $img)) out(['error' => 'Gagal menyimpan gambar ke folder uploads (izin ditolak).']);
    if ($old && strpos($old, 'uploads/') === 0) @unlink(__DIR__ . '/' . $old);
    return $img;
}
function idList($key) {
    $a = [];
    foreach ((array)post($key, []) as $x) if ((int)$x > 0) $a[] = (int)$x;
    return $a;
}
/* unggah berkas musik — format & batas berbeda dari gambar */
function uploadAudio($f, $old) {
    if (!$f) return (string)$old;
    $bad = upErr($f, 'Berkas musik'); if ($bad) out(['error' => $bad]);
    if (empty($f['tmp_name']) || !is_uploaded_file($f['tmp_name'])) return (string)$old;
    $mime = (string)($f['type'] ?? '');
    $ok = ['audio/mpeg' => 'mp3', 'audio/mp3' => 'mp3', 'audio/ogg' => 'ogg',
           'audio/ogg; codecs=opus' => 'ogg', 'audio/wav' => 'wav', 'audio/x-wav' => 'wav'];
    $ext = $ok[$mime] ?? null;
    if (!$ext) {
        $head = strtolower((string)@file_get_contents($f['tmp_name'], false, null, 0, 12));
        if (str_starts_with($head, 'id3') || (isset($head[0]) && ord($head[0]) === 0xff)) $ext = 'mp3';
        elseif (str_starts_with($head, 'ogg')) $ext = 'ogg';
        elseif (str_starts_with($head, 'riff') || str_starts_with($head, 'wav')) $ext = 'wav';
    }
    if (!$ext) out(['error' => 'Musik harus MP3, OGG, atau WAV — berkas ini tidak dikenali sebagai salah satunya.']);
    if ($f['size'] > 8 * 1024 * 1024) out(['error' => 'Musik lebih besar dari 8 MB. Potong audionya atau pakai MP3 yang dikompres.']);
    if (!is_dir(__DIR__ . '/uploads')) @mkdir(__DIR__ . '/uploads', 0755, true);
    if (!is_dir(__DIR__ . '/uploads') || !is_writable(__DIR__ . '/uploads'))
        out(['error' => 'Folder <code>uploads/</code> belum bisa ditulis. Buat folder itu di samping api.php lalu beri izin tulis.']);
    $audio = 'uploads/' . bin2hex(random_bytes(8)) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], __DIR__ . '/' . $audio)) out(['error' => 'Gagal menyimpan musik ke folder uploads (izin ditolak).']);
    if ($old && strpos($old, 'uploads/') === 0) @unlink(__DIR__ . '/' . $old);
    return $audio;
}
/* simpan / hapus satu kunci pengaturan */
function putSetting($db, $k, $v) {
    $k = substr(preg_replace('/[^a-z0-9_]/i', '', (string)$k), 0, 40);
    if ($k === '') return;
    $db->prepare('INSERT INTO settings (k,v) VALUES (?,?) ON DUPLICATE KEY UPDATE v=VALUES(v)')
        ->execute([$k, (string)$v]);
}

switch ($a) {
    case 'settings_save': {
        postGuard('pengaturan & musik');
        /* semua variabel yang boleh diatur admin — musik & splash termasuk di dalamnya */
        $map = [
            'music_mode'  => in_array(post('music_mode'), ['off', 'gen', 'file'], true) ? post('music_mode') : 'gen',
            'music_track' => in_array(post('music_track'), ['fajar', 'perang', 'senja', 'menara'], true) ? post('music_track') : 'fajar',
            'music_vol'   => (string)clamp(num('music_vol', 55), 0, 100),
            'music_file'  => uploadAudio($_FILES['music_file'] ?? [], clean(post('old_music'))),
            'splash_text' => mb_substr(clean(post('splash_text', 'Isekai Tactics')), 0, 70),
            'splash_sub'  => mb_substr(clean(post('splash_sub', '')), 0, 120),
            'splash_image' => uploadImg($_FILES['splash_image'] ?? [], clean(post('old_splash'))),
            'splash_on'   => post('splash_on') === '1' ? '1' : '0',
        ];
        foreach ($map as $k => $v) putSetting($db, $k, $v);
        $s = [];
        foreach (rows($db, 'SELECT k,v FROM settings') as $r) $s[$r['k']] = $r['v'];
        out(['ok' => 1, 'settings' => $s]);
    }
    case 'char_save': {
        postGuard('gambar karakter');
        $ults = ['AoE Heal', 'AoE Dmg', 'Warcry', 'Teleport'];
        $passes = ['', 'lifesteal', 'burn', 'guard', 'crit_up', 'inspire', 'fury', 'haste', 'first', 'vigor', 'regen'];
        $skills = ['', 'mend', 'pierce', 'dash', 'warbanner', 'bulwark', 'emberspark'];
        $v = [
            clean(post('name')), clean(post('title')), clean(post('faction')),
            clamp(num('rarity', 3), 1, 5),
            clamp(num('hp', 250), 50, 3000), clamp(num('atk', 50), 1, 400), clamp(num('ap', 4), 3, 8),
            in_array(post('ult'), $ults, true) ? post('ult') : 'AoE Dmg',
            in_array(post('passive'), $passes, true) ? post('passive') : '',
            in_array(post('skill'), $skills, true) ? post('skill') : '',
            clean(post('lore')), (string)post('backstory', ''),
            uploadImg($_FILES['image'] ?? [], clean(post('old_image'))),
        ];
        if ($v[0] === '') out(['error' => 'Nama wajib diisi']);
        if ($id) $db->prepare('UPDATE characters SET name=?,title=?,faction=?,rarity=?,hp=?,atk=?,ap=?,ult=?,passive=?,skill=?,lore=?,backstory=?,image=? WHERE id=?')->execute(array_merge($v, [$id]));
        else { $db->prepare('INSERT INTO characters (name,title,faction,rarity,hp,atk,ap,ult,passive,skill,lore,backstory,image) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute($v); $id = (int)$db->lastInsertId(); }
        out(['id' => $id]);
    }
    case 'char_del': {
        $img = val($db, 'SELECT image FROM characters WHERE id=?', [$id]);
        if ($img && strpos($img, 'uploads/') === 0) @unlink(__DIR__ . '/' . $img);
        $db->prepare('DELETE FROM characters WHERE id=?')->execute([$id]);
        $db->prepare('DELETE FROM owned_chars WHERE char_id=?')->execute([$id]);
        $db->prepare('DELETE FROM equips WHERE char_id=?')->execute([$id]);
        $db->prepare('UPDATE weapons SET true_for=0 WHERE true_for=?')->execute([$id]);
        foreach (rows($db, 'SELECT id,pool FROM banners') as $b) {
            $p = array_values(array_filter(array_map('intval', explode(',', $b['pool'])), fn($x) => $x !== $id));
            $db->prepare('UPDATE banners SET pool=? WHERE id=?')->execute([implode(',', $p), $b['id']]);
        }
        foreach (rows($db, 'SELECT id,enemies FROM chapters') as $c) {
            $p = array_values(array_filter(array_map('intval', explode(',', $c['enemies'])), fn($x) => $x !== $id));
            $db->prepare('UPDATE chapters SET enemies=? WHERE id=?')->execute([implode(',', $p), $c['id']]);
        }
        out(['ok' => 1]);
    }
    case 'weapon_save': {
        postGuard('gambar senjata');
        $kinds = ['sword', 'dagger', 'axe', 'spear', 'bow', 'staff', 'hammer', 'harp'];
        $passes = ['', 'lifesteal', 'burn', 'guard', 'crit_up', 'inspire', 'fury', 'haste', 'first'];
        $v = [
            clean(post('name')),
            in_array(post('kind'), $kinds, true) ? post('kind') : 'sword',
            clamp(num('rarity', 3), 1, 5),
            clamp(num('w_atk', 10), 0, 200), clamp(num('w_hp', 20), 0, 800), clamp(num('w_crit', 0), 0, 60),
            in_array(post('passive'), $passes, true) ? post('passive') : '',
            clamp(num('true_for'), 0, 999999),
            uploadImg($_FILES['image'] ?? [], clean(post('old_image'))),
        ];
        if ($v[0] === '') out(['error' => 'Nama senjata wajib diisi']);
        if ($v[6] !== '' && !$v[7]) out(['error' => 'Senjata dengan pasif harus punya pemilik senjata sejati (karakter).']);
        if ($v[7] && !val($db, 'SELECT COUNT(*) FROM characters WHERE id=?', [$v[7]])) out(['error' => 'Karakter pemilik senjata sejati tidak ditemukan.']);
        if ($id) $db->prepare('UPDATE weapons SET name=?,kind=?,rarity=?,w_atk=?,w_hp=?,w_crit=?,passive=?,true_for=?,image=? WHERE id=?')->execute(array_merge($v, [$id]));
        else { $db->prepare('INSERT INTO weapons (name,kind,rarity,w_atk,w_hp,w_crit,passive,true_for,image) VALUES (?,?,?,?,?,?,?,?,?)')->execute($v); $id = (int)$db->lastInsertId(); }
        out(['id' => $id]);
    }
    case 'weapon_del': {
        $img = val($db, 'SELECT image FROM weapons WHERE id=?', [$id]);
        if ($img && strpos($img, 'uploads/') === 0) @unlink(__DIR__ . '/' . $img);
        $db->prepare('DELETE FROM weapons WHERE id=?')->execute([$id]);
        $db->prepare('DELETE FROM owned_weapons WHERE weapon_id=?')->execute([$id]);
        $db->prepare('DELETE FROM equips WHERE weapon_id=?')->execute([$id]);
        out(['ok' => 1]);
    }
    case 'chapter_save': {
        $v = [
            clean(post('title')), clamp(num('sort_order', 1), 0, 9999),
            post('battle') ? 1 : 0, clamp(num('difficulty', 1), 1, 3), clamp(num('reward', 300), 0, 99999),
            implode(',', idList('enemies')), (string)post('script', ''),
        ];
        if ($v[0] === '' || $v[6] === '') out(['error' => 'Judul dan naskah wajib diisi']);
        if ($id) $db->prepare('UPDATE chapters SET title=?,sort_order=?,battle=?,difficulty=?,reward=?,enemies=?,script=? WHERE id=?')->execute(array_merge($v, [$id]));
        else { $db->prepare('INSERT INTO chapters (title,sort_order,battle,difficulty,reward,enemies,script) VALUES (?,?,?,?,?,?,?)')->execute($v); $id = (int)$db->lastInsertId(); }
        out(['id' => $id]);
    }
    case 'chapter_del':
        $db->prepare('DELETE FROM chapters WHERE id=?')->execute([$id]);
        out(['ok' => 1]);
    case 'banner_save': {
        postGuard('gambar panji');
        $kind = post('kind') === 'weapon' ? 'weapon' : 'char';
        $pool = implode(',', idList('pool'));
        $v = [clean(post('name')), clean(post('description')), $kind,
            uploadImg($_FILES['image'] ?? [], clean(post('old_image'))), $pool];
        if ($v[0] === '' || $pool === '') out(['error' => 'Nama dan minimal satu isi panji wajib diisi']);
        if ($id) $db->prepare('UPDATE banners SET name=?,description=?,kind=?,image=?,pool=? WHERE id=?')->execute(array_merge($v, [$id]));
        else { $db->prepare('INSERT INTO banners (name,description,kind,image,pool) VALUES (?,?,?,?,?)')->execute($v); $id = (int)$db->lastInsertId(); }
        out(['id' => $id]);
    }
    case 'banner_del': {
        $img = val($db, 'SELECT image FROM banners WHERE id=?', [$id]);
        if ($img && strpos($img, 'uploads/') === 0) @unlink(__DIR__ . '/' . $img);
        $db->prepare('DELETE FROM banners WHERE id=?')->execute([$id]);
        out(['ok' => 1]);
    }
}
out(['error' => 'Aksi tidak dikenal']);
