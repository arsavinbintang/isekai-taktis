<?php
declare(strict_types=1);

header_remove('X-Powered-By');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$ada = is_readable(__DIR__ . DIRECTORY_SEPARATOR . 'app.html') || is_readable(__DIR__ . DIRECTORY_SEPARATOR . 'index.html');

echo json_encode(
    [
        'ok' => $ada,
        'aplikasi' => 'Isekai Tactics',
        'wrapper' => 'php',
        'php' => PHP_VERSION,
        'waktu' => date('c'),
    ],
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);
