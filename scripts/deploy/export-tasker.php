<?php

// CLI-only, runs in the old application with a read-only database transaction.
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
    $owners = App\Models\PrjProject::query()->distinct()->pluck('user_id');
    if ($owners->count() !== 1) {
        throw new RuntimeException('Source project ownership is ambiguous.');
    }
    $owner = App\Models\User::query()->findOrFail($owners->sole());
    $snapshot = ['schema' => 1, 'source' => 'home.zuratax.com', 'owner_id' => strtolower($owner->id),
        'owner_hash' => hash('sha256', mb_strtolower(trim((string) $owner->email)))];
    $counts = [];
    foreach (['projects' => App\Models\PrjProject::class, 'tasks' => App\Models\TskTask::class,
        'checklist_items' => App\Models\TskChecklistItem::class, 'logs' => App\Models\TskLog::class,
        'spans' => App\Models\TskSpan::class, 'blockers' => App\Models\TskBlocker::class] as $kind => $model) {
        if ($model::query()->where('user_id', '<>', $owner->id)->exists()) {
            throw new RuntimeException('Source contains another owner.');
        }
        $snapshot[$kind] = $model::query()->where('user_id', $owner->id)->orderBy('id')->get()->map(fn ($r): array => $r->getAttributes())->all();
        $counts[$kind] = count($snapshot[$kind]);
    }
    $bytes = json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (strlen($bytes) > 10 * 1024 * 1024) {
        throw new RuntimeException('Snapshot exceeds import limit.');
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
