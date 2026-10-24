<?php

// CLI-only read-only export. Private payloads never leave the protected server directory.
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
    $owners = App\Models\StfThing::query()->distinct()->pluck('user_id');
    if ($owners->count() !== 1) {
        throw new RuntimeException('Source equipment ownership is ambiguous.');
    }
    $owner = App\Models\User::findOrFail($owners->sole());
    $things = App\Models\StfThing::where('user_id', $owner->id)->orderBy('id')->get();
    $locations = App\Models\StfLocation::where('user_id', $owner->id)->orderBy('id')->get();
    $registers = App\Models\StfRegister::where('user_id', $owner->id)->orderBy('id')->get();
    if ($registers->contains(fn ($row): bool => ! $things->contains('id', $row->thing_id))) {
        throw new RuntimeException('An exploitation references an excluded thing.');
    }
    $categories = collect();
    $missing_category_ids = [];
    $pending = $things->pluck('category_id')->merge($things->pluck('last_category_id'))->filter()->map(fn ($id): string => strtolower($id))->unique();
    while ($pending->isNotEmpty()) {
        $batch = App\Models\LedCategory::whereIn('id', $pending)->orderBy('id')->get();
        $missing_category_ids = [...$missing_category_ids, ...$pending->diff($batch->pluck('id')->map(fn ($id): string => strtolower($id)))->values()->all()];
        $categories = $categories->merge($batch)->unique('id');
        $pending = $batch->pluck('parent_id')->filter()->map(fn ($id): string => strtolower($id))->unique()->diff($categories->pluck('id')->map(fn ($id): string => strtolower($id)))->diff($missing_category_ids);
        if ($categories->count() > 1000) {
            throw new RuntimeException('Equipment category tree exceeds the import limit.');
        }
    }
    $contents = App\Models\CntContent::where(fn ($q) => $q
        ->where(fn ($q) => $q->where('source_module', 'exploiter')->whereIn('source_id', $registers->modelKeys()))
        ->orWhere(fn ($q) => $q->where('source_module', 'stuffer.thing')->whereIn('source_id', $things->modelKeys())))
        ->orderBy('id')->get();
    $timer_entries = App\Models\SysTimerEntry::where('source_module', 'exploiter')->whereIn('source_id', $registers->modelKeys())->orderBy('id')->get();
    // Finance is deferred: retain identities for a later join, not live transactions or balances.
    $ledger_refs = App\Models\LedTransaction::withTrashed()->whereIn('exploiter_event_id', $registers->modelKeys())
        ->orderBy('id')->get(['id', 'user_id', 'exploiter_event_id', 'cost_type', 'created_at', 'updated_at', 'deleted_at']);
    $expenses = App\Models\StfExpense::whereIn('thing_id', $things->modelKeys())->orderBy('id')->get();
    $event_refs = App\Models\EvtEvent::where(fn ($q) => $q->whereIn('thing_id', $things->modelKeys())->orWhereIn('exploiter_event_id', $registers->modelKeys()))
        ->orderBy('id')->get(['id', 'user_id', 'thing_id', 'exploiter_event_id', 'section_id', 'project_id', 'category_id', 'created_at', 'updated_at']);
    $snapshot = ['schema' => 1, 'source' => 'home.zuratax.com', 'owner_id' => strtolower($owner->id),
        'owner_hash' => hash('sha256', mb_strtolower(trim((string) $owner->email))), 'missing_category_ids' => $missing_category_ids];
    $counts = [];
    foreach (compact('things', 'locations', 'registers', 'categories', 'contents', 'timer_entries', 'ledger_refs', 'expenses', 'event_refs') as $kind => $records) {
        if ($records->contains(fn ($row): bool => $row->user_id !== $owner->id)) {
            throw new RuntimeException('Mixed source owners in equipment data.');
        }
        $snapshot[$kind] = $records->map(fn ($row): array => $row->getAttributes())->values()->all();
        $counts[$kind] = $records->count();
    }
    $bytes = json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (strlen($bytes) > 16 * 1024 * 1024) {
        throw new RuntimeException('Equipment snapshot exceeds import limit.');
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
