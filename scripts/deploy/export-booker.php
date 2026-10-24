<?php

// CLI-only, read-only snapshot of non-deleted books and their reachable contents.
if (PHP_SAPI !== 'cli' || ! isset($argv[1])) {
    exit(2);
}
umask(0077);
$parent = realpath(dirname($argv[1]));
if ($parent === false || ! str_starts_with($parent.'/', '/var/www/zuratax/shared/imports/') || is_link($argv[1]) || file_exists($argv[1])) {
    throw new RuntimeException('A new private snapshot path is required.');
}
$root = '/var/www/homezuratax/backend';
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$db = Illuminate\Support\Facades\DB::connection();
$db->statement('SET TRANSACTION READ ONLY');
$db->beginTransaction();
try {
    $owners = App\Models\BkrBook::query()->distinct()->pluck('user_id');
    if ($owners->count() !== 1) {
        throw new RuntimeException('Source book ownership is ambiguous.');
    }
    $owner = App\Models\User::findOrFail($owners->sole());
    $books = App\Models\BkrBook::where('user_id', $owner->id)->orderBy('id')->get();
    $pages = App\Models\BkrPage::whereIn('book_id', $books->modelKeys())->orderBy('id')->get();
    $groups = App\Models\BkrBlockGroup::whereIn('page_id', $pages->modelKeys())->orderBy('id')->get();
    $blocks = App\Models\BkrBlock::whereIn('group_id', $groups->modelKeys())->orderBy('id')->get();
    $spaces = App\Models\BkrSpace::whereIn('id', $books->pluck('space_id')->filter())->orderBy('id')->get();
    $snapshot = ['schema' => 1, 'source' => 'home.zuratax.com', 'owner_id' => strtolower($owner->id),
        'owner_hash' => hash('sha256', mb_strtolower(trim((string) $owner->email)))];
    $counts = [];
    foreach (compact('books', 'pages', 'groups', 'blocks', 'spaces') as $kind => $records) {
        if ($records->contains(fn ($r): bool => $r->user_id !== $owner->id)) {
            throw new RuntimeException('Mixed source owners in a book tree.');
        }
        $snapshot[$kind] = $records->map(fn ($r): array => $r->getAttributes())->all();
        $counts[$kind] = $records->count();
    }
    $bytes = json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (strlen($bytes) > 32 * 1024 * 1024) {
        throw new RuntimeException('Book snapshot exceeds import limit.');
    }
    $stream = fopen($argv[1], 'x');
    if ($stream === false || fwrite($stream, $bytes) !== strlen($bytes)) {
        throw new RuntimeException('Cannot finish private snapshot.');
    }
    fclose($stream);
    chmod($argv[1], 0600);
    echo json_encode(['exported' => true, 'counts' => $counts, 'bytes' => strlen($bytes), 'sha256' => hash('sha256', $bytes)], JSON_THROW_ON_ERROR), PHP_EOL;
} finally {
    $db->rollBack();
}
