<?php
declare(strict_types=1);

header_remove('X-Powered-By');
header('Content-Type: application/manifest+json; charset=utf-8');
header('Cache-Control: public, max-age=3600');
header('X-Content-Type-Options: nosniff');

echo json_encode(
    [
        'name' => 'Isekai Tactics',
        'short_name' => 'Isekai',
        'description' => 'Perang taktik di tanah para raja.',
        'lang' => 'id',
        'dir' => 'ltr',
        'start_url' => './index.php',
        'scope' => './',
        'display' => 'standalone',
        'orientation' => 'any',
        'background_color' => '#1c1410',
        'theme_color' => '#3a2a1c',
        'icons' => [
            ['src' => 'art/icon.svg', 'sizes' => 'any', 'type' => 'image/svg+xml', 'purpose' => 'any'],
            ['src' => 'art/icon.svg', 'sizes' => 'any', 'type' => 'image/svg+xml', 'purpose' => 'maskable'],
        ],
    ],
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
);
