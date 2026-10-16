<?php
// CLI-only health checks. Never prints keys, credentials, record titles or user data.
$root = $argv[1];
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$storage = '/var/www/zuratax/shared/storage';
if (storage_path() !== $storage || ! is_writable($storage.'/logs')) {
    throw new RuntimeException('Persistent storage is not configured or writable.');
}
foreach (['filer' => '/var/www/zuratax/shared/filer', 'reports' => '/var/www/zuratax/shared/reports'] as $disk => $path) {
    if (realpath(config('filesystems.disks.'.$disk.'.root')) !== realpath($path) || ! is_dir($path)) {
        throw new RuntimeException('Unexpected persistent disk: '.$disk);
    }
}
$db = config('database.default');
$session = config('session');
unset($session['files']);
$stable = ['key' => config('app.key'), 'database' => config('database.connections.'.$db), 'session' => $session, 'cache' => config('cache.default'), 'queue' => config('queue.default')];
$pending = array_values(array_diff(array_keys(app('migrator')->getMigrationFiles(database_path('migrations'))), app('migration.repository')->getRan()));
echo json_encode(['framework' => app()->version(), 'storage' => storage_path(), 'pending_migrations' => $pending,
    'stable_fingerprint' => hash('sha256', json_encode($stable))]).PHP_EOL;
if (in_array('--no-pending', $argv, true) && $pending !== []) {
    exit(3);
}
