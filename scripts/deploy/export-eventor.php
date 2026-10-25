<?php

// CLI-only read-only export. Private content stays in a protected server directory.
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
    // Same verified source owner as the completed equipment migration, not the test account.
    $previous = json_decode(file_get_contents('/var/www/zuratax/shared/imports/20261025-equip-v1/source-v2.json'), true, 512, JSON_THROW_ON_ERROR);
    $owner = App\Models\User::findOrFail($previous['owner_id']);
    if (! hash_equals($previous['owner_hash'], hash('sha256', mb_strtolower(trim((string) $owner->email))))) {
        throw new RuntimeException('Verified source owner changed.');
    }
    $events = App\Models\EvtEvent::where('user_id', $owner->id)->orderBy('id')->get();
    $ids = $events->modelKeys();
    $sections = App\Models\EvtSection::where('user_id', $owner->id)->orderBy('id')->get();
    $categories = App\Models\EvtCategory::where('user_id', $owner->id)->orderBy('id')->get();
    $types = App\Models\EvtType::where('user_id', $owner->id)->orWhere(fn ($q) => $q->where('user_id', 'SYSTEM00000000000000000000')->whereIn('id', $events->pluck('type_id')->filter()))->orderBy('id')->get();
    $contents = App\Models\CntContent::where('source_module', 'eventor')->whereIn('source_id', $ids)->orderBy('id')->get();
    $event_tags = $db->table('evt_event_tags')->whereIn('event_id', $ids)->orderBy('event_id')->orderBy('tag_id')->get();
    $tags = App\Models\EvtTag::whereIn('id', $event_tags->pluck('tag_id'))->orderBy('id')->get();
    $contacts = App\Models\EvtEventContact::whereIn('event_id', $ids)->orderBy('id')->get();
    $task_refs = App\Models\TskTask::whereIn('eventor_event_id', $ids)->orderBy('id')->get(['id', 'user_id', 'eventor_event_id', 'created_at', 'updated_at']);
    $media = App\Models\EvtMedia::whereIn('event_id', $ids)->orderBy('id')->get();
    $embeds = App\Models\EvtEmbed::whereIn('event_id', $ids)->orderBy('id')->get();
    $starred = $db->table('evt_starred')->whereIn('event_id', $ids)->orderBy('event_id')->get();
    $snapshot = ['schema' => 1, 'source' => 'home.zuratax.com', 'owner_id' => strtolower($owner->id), 'owner_hash' => $previous['owner_hash']];
    $counts = [];
    foreach (compact('sections', 'categories', 'types', 'events', 'contents', 'tags', 'event_tags', 'contacts', 'task_refs', 'media', 'embeds', 'starred') as $kind => $records) {
        if (! in_array($kind, ['event_tags', 'tags', 'types'], true) && $records->contains(fn ($r): bool => $r->user_id !== $owner->id)) {
            throw new RuntimeException('Mixed source owners in event data.');
        }
        if ($kind === 'tags' && $records->contains(fn ($r): bool => $r->user_id !== null && $r->user_id !== $owner->id)) {
            throw new RuntimeException('A tag belongs to another source owner.');
        }
        $snapshot[$kind] = $records->map(fn ($r): array => $r instanceof Illuminate\Database\Eloquent\Model ? $r->getAttributes() : (array) $r)->values()->all();
        $counts[$kind] = $records->count();
    }
    $bytes = json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (strlen($bytes) > 32 * 1024 * 1024) {
        throw new RuntimeException('Event snapshot exceeds import limit.');
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
