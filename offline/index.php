<?php
declare(strict_types=1);

$KONFIG = [
    'judul' => 'Isekai Tactics',
    'sapaan' => 'Perang taktik di tanah para raja',
    'tautan_bantuan' => '',
    'warna' => '#3a2a1c',
    'mulai' => './index.php',
];

header_remove('X-Powered-By');
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$bekas = '';
foreach (['app.html', 'index.html'] as $namaBerkas) {
    $coba = __DIR__ . DIRECTORY_SEPARATOR . $namaBerkas;
    if (is_readable($coba)) {
        $bekas = $coba;
        break;
    }
}

if ($bekas === '') {
    http_response_code(500);
    echo '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Pemasangan Isekai Tactics</title></head>'
        . '<body style="font-family:system-ui;background:#1c1410;color:#e6d3a3;padding:32px;max-width:660px;margin:0 auto;line-height:1.6">'
        . '<h1>Berkas aplikasi belum ada</h1>'
        . '<p>Salin seluruh isi folder <code>apkoffline</code> ke folder ini, lalu ganti nama <code>index.html</code> menjadi <code>app.html</code>, '
        . 'atau jalankan <code>bash sinkron.sh</code> dari terminal.</p>'
        . '<p>Minimal yang dibutuhkan: <code>app.html</code>, <code>style.css</code>, semua berkas <code>*.js</code>, dan folder <code>art/</code>.</p>'
        . '</body></html>';
    exit;
}

$html = file_get_contents($bekas);
if ($html === false) {
    http_response_code(500);
    echo 'Gagal membaca berkas aplikasi.';
    exit;
}

$bersih = static fn (string $teks): string => htmlspecialchars($teks, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

$judul = $bersih((string) $KONFIG['judul']);
$awal = strpos($html, '<title>');
$akhir = strpos($html, '</title>');
if ($awal !== false && $akhir !== false) {
    $html = substr($html, 0, $awal)
        . '<title>' . $judul . '</title>'
        . substr($html, $akhir + strlen('</title>'));
}

$payload = [
    'judul' => (string) $KONFIG['judul'],
    'sapaan' => (string) $KONFIG['sapaan'],
    'tautan_bantuan' => (string) $KONFIG['tautan_bantuan'],
    'warna' => (string) $KONFIG['warna'],
    'mulai' => (string) $KONFIG['mulai'],
    'waktu' => date('c'),
    'php' => PHP_VERSION,
    'wrapper' => 'php',
];

$sisipan = '<script>window.KONFIG_PHP='
    . json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP)
    . ';</script>' . "\n"
    . '<link rel="manifest" href="manifest.php">' . "\n";

$titik = strrpos($html, '</head>');
if ($titik !== false) {
    $html = substr($html, 0, $titik) . $sisipan . substr($html, $titik);
}

echo $html;
