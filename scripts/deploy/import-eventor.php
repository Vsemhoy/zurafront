<?php

// CLI-only loader leaves the active release checkout untouched.
if (PHP_SAPI !== 'cli') {
    exit(2);
}
putenv('LARAVEL_STORAGE_PATH=/var/www/zuratax/shared/storage');
putenv('REPORTS_ROOT=/var/www/zuratax/shared/reports');
$root = realpath('/var/www/zuratax/current/backend');
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
require_once __DIR__.'/LegacyEventorImportService.php';
require_once __DIR__.'/ImportLegacyEventor.php';
$kernel->registerCommand($app->make(App\Console\Commands\ImportLegacyEventor::class));
$input = new Symfony\Component\Console\Input\ArgvInput([$argv[0], 'legacy:import-eventor', ...array_slice($argv, 1)]);
$output = new Symfony\Component\Console\Output\ConsoleOutput;
$status = $kernel->handle($input, $output);
$kernel->terminate($input, $status);
exit($status);
