<?php

// Operational integrity receipt: only identities and hashes, never record contents.
if (PHP_SAPI !== 'cli' || ! isset($argv[1], $argv[2])) {
    exit(2);
}
umask(0077);
$mode = $argv[1];
$file = $argv[2];
$parent = realpath(dirname($file));
if (! in_array($mode, ['before', 'after'], true) || $parent === false || ! str_starts_with($parent.'/', '/var/www/zuratax/shared/imports/') || is_link($file)) {
    throw new RuntimeException('A protected import audit path is required.');
}
putenv('LARAVEL_STORAGE_PATH=/var/www/zuratax/shared/storage');
putenv('REPORTS_ROOT=/var/www/zuratax/shared/reports');
$root = realpath('/var/www/zuratax/current/backend');
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$models = [App\Models\Event::class, App\Models\EventSection::class, App\Models\EventType::class, App\Models\ContentCategory::class,
    App\Models\EntityLink::class, App\Models\LegacyImportRecord::class, App\Models\ActivityLog::class, App\Models\Project::class,
    App\Models\Task::class, App\Models\Book::class, App\Models\BookPage::class, App\Models\BookBlockGroup::class, App\Models\BookBlock::class,
    App\Models\Contact::class, App\Models\ContactNote::class, App\Models\Fact::class, App\Models\Thing::class, App\Models\ThingComposition::class,
    App\Models\ExploitationEntry::class, App\Models\LedgerTransaction::class];
$state = [];
foreach ($models as $class) {
    $table = (new $class)->getTable();
    $state[$table] = [];
    foreach (Illuminate\Support\Facades\DB::table($table)->orderBy('id')->cursor() as $row) {
        $state[$table][$row->id] = hash('sha256', json_encode($row, JSON_THROW_ON_ERROR));
    }
}
if ($mode === 'before') {
    $stream = fopen($file, 'x');
    $bytes = json_encode($state, JSON_THROW_ON_ERROR);
    if ($stream === false || fwrite($stream, $bytes) !== strlen($bytes)) {
        throw new RuntimeException('Cannot finish protected baseline.');
    }
    fclose($stream);
    chmod($file, 0600);
    echo json_encode(['baseline_records' => array_sum(array_map('count', $state)), 'tables' => array_map('count', $state)], JSON_THROW_ON_ERROR), PHP_EOL;
} else {
    $before = json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
    $changed = $missing = $same = 0;
    $added = [];
    foreach ($before as $table => $rows) {
        foreach ($rows as $id => $hash) {
            if (! isset($state[$table][$id])) {
                $missing++;
            } elseif (! hash_equals($hash, $state[$table][$id])) {
                $changed++;
            } else {
                $same++;
            }
        }
        $added[$table] = count(array_diff_key($state[$table], $rows));
    }
    echo json_encode(['unchanged' => $same, 'changed' => $changed, 'missing' => $missing, 'added' => $added], JSON_THROW_ON_ERROR), PHP_EOL;
    if ($changed || $missing) {
        exit(1);
    }
}
