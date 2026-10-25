<?php

// Read-only source export. Financial contents never go to stdout or into the repository.
if (PHP_SAPI !== 'cli' || ! isset($argv[1])) {
    exit(2);
}
umask(0077);
$parent = realpath(dirname($argv[1]));
if ($parent === false || ! str_starts_with($parent.'/', '/var/www/zuratax/shared/imports/') || is_link($argv[1]) || file_exists($argv[1])) {
    throw new RuntimeException('A new protected snapshot path is required.');
}
$root = '/var/www/homezuratax/backend';
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$db = Illuminate\Support\Facades\DB::connection();
$db->statement('SET TRANSACTION READ ONLY');
$db->beginTransaction();
try {
    $previous = json_decode(file_get_contents('/var/www/zuratax/shared/imports/20261025-equip-v1/source-v2.json'), true, 512, JSON_THROW_ON_ERROR);
    $owner = App\Models\User::findOrFail($previous['owner_id']);
    if (! hash_equals($previous['owner_hash'], hash('sha256', mb_strtolower(trim((string) $owner->email))))) {
        throw new RuntimeException('Verified source owner changed.');
    }
    $snapshot = ['schema' => 1, 'source' => 'home.zuratax.com', 'owner_id' => strtolower($owner->id), 'owner_hash' => $previous['owner_hash']];
    $counts = [];
    $tables = ['layers' => 'led_layers', 'accounts' => 'led_accounts', 'categories' => 'led_categories', 'groups' => 'led_transaction_groups',
        'transactions' => 'led_transactions', 'month_totals' => 'led_month_totals'];
    foreach ($tables as $kind => $table) {
        $rows = $db->table($table)->where('user_id', $owner->id)->orderBy('id')->get();
        $snapshot[$kind] = $rows->map(fn ($row): array => (array) $row)->all();
        $counts[$kind] = $rows->count();
    }
    $ids = array_column($snapshot['transactions'], 'id');
    $snapshot['contents'] = $db->table('cnt_contents')->where('source_module', 'ledger.transaction')->whereIn('source_id', $ids)->orderBy('id')->get()->map(fn ($row): array => (array) $row)->all();
    $refs = $db->table('led_transaction_tags')->whereIn('transaction_id', $ids)->orderBy('transaction_id')->orderBy('tag_id')->get();
    $snapshot['transaction_tags'] = $refs->map(fn ($row): array => (array) $row)->all();
    $snapshot['tags'] = $db->table('evt_tags')->whereIn('id', $refs->pluck('tag_id'))->orderBy('id')->get()->map(fn ($row): array => (array) $row)->all();
    foreach ($snapshot['tags'] as $tag) {
        if ($tag['user_id'] !== null && $tag['user_id'] !== $owner->id) {
            throw new RuntimeException('A Ledger tag belongs to another source owner.');
        }
    }
    foreach (['contents', 'transaction_tags', 'tags'] as $kind) {
        $counts[$kind] = count($snapshot[$kind]);
    }
    $bytes = json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (strlen($bytes) > 16 * 1024 * 1024) {
        throw new RuntimeException('Ledger source snapshot exceeds the export limit.');
    }
    $stream = fopen($argv[1], 'x');
    if ($stream === false || fwrite($stream, $bytes) !== strlen($bytes)) {
        throw new RuntimeException('Cannot finish the protected snapshot.');
    }
    fclose($stream);
    chmod($argv[1], 0600);
    echo json_encode(['exported' => true, 'counts' => $counts, 'bytes' => strlen($bytes), 'sha256' => hash('sha256', $bytes)], JSON_THROW_ON_ERROR), PHP_EOL;
} finally {
    $db->rollBack();
}
