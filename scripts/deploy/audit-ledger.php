<?php

// Operational source-integrity receipt. No application bootstrap or database writes.
if (PHP_SAPI !== 'cli' || ! isset($argv[1], $argv[2])) {
    exit(2);
}
umask(0077);
$source = realpath($argv[1]);
$parent = realpath(dirname($argv[2]));
if ($source === false || $parent === false || ! str_starts_with($source, '/var/www/zuratax/shared/imports/')
    || ! str_starts_with($parent.'/', '/var/www/zuratax/shared/imports/') || is_link($argv[1]) || is_link($argv[2])
    || file_exists($argv[2]) || (fileperms($source) & 0077) !== 0 || filesize($source) > 16 * 1024 * 1024) {
    throw new RuntimeException('Protected source and a new private report path are required.');
}
$bytes = file_get_contents($source);
$snapshot = json_decode($bytes, true, 512, JSON_THROW_ON_ERROR);
if (($snapshot['schema'] ?? null) !== 1 || ($snapshot['source'] ?? null) !== 'home.zuratax.com') {
    throw new RuntimeException('Unexpected Ledger source snapshot.');
}
$accounts = [];
foreach ($snapshot['accounts'] as $row) {
    $accounts[strtolower($row['id'])] = $row;
}
$transactions = [];
foreach ($snapshot['transactions'] as $row) {
    $transactions[strtolower($row['id'])] = $row;
}
$months = $snapshot['month_totals'];
usort($months, fn ($left, $right): int => strcmp($left['month_key'], $right['month_key']));
$report = ['source_sha256' => hash('sha256', $bytes), 'chain_breaks' => [], 'month_gaps' => [], 'declared_opening_differences' => [],
    'monthly_equation_differences' => [], 'daily_sign_differences' => [], 'stale_transfer_references' => [], 'invalid_transfer_pairs' => [],
    'orphan_accounts' => [], 'first_months' => [], 'raw_month_totals' => $months];
$previous = [];
foreach ($months as $month) {
    $id = strtolower($month['account_id']);
    $date = DateTimeImmutable::createFromFormat('!Y-m', $month['month_key']);
    if (! $date || $date->format('Y-m') !== $month['month_key']) {
        throw new RuntimeException('Invalid source month.');
    }
    if (! isset($previous[$id])) {
        $report['first_months'][$id] = $month['month_key'];
        if (isset($accounts[$id]) && (int) $accounts[$id]['opening_balance'] !== (int) $month['opening_balance']) {
            $report['declared_opening_differences'][] = ['account_id' => $id, 'month' => $month['month_key'],
                'declared_minor' => (string) $accounts[$id]['opening_balance'], 'reported_minor' => (string) $month['opening_balance']];
        }
    } else {
        $last = $previous[$id];
        if ($date->modify('-1 month')->format('Y-m') !== $last['month_key']) {
            $report['month_gaps'][] = ['account_id' => $id, 'previous' => $last['month_key'], 'next' => $month['month_key']];
        } elseif ((int) $last['closing_balance'] !== (int) $month['opening_balance']) {
            $report['chain_breaks'][] = ['account_id' => $id, 'previous' => $last['month_key'], 'next' => $month['month_key'],
                'previous_closing_minor' => (string) $last['closing_balance'], 'next_opening_minor' => (string) $month['opening_balance']];
        }
    }
    $delta = $dailyDelta = 0;
    foreach ($transactions as $transaction) {
        if (strtolower($transaction['account_id']) !== $id || $transaction['month_key'] !== $month['month_key'] || $transaction['deleted_at'] !== null || $transaction['is_disabled']) {
            continue;
        }
        $amount = (int) $transaction['amount'];
        $sign = match ($transaction['flow_kind']) {
            'income', 'transfer_in', 'adjustment' => 1,
            'reconciliation' => $transaction['is_negative'] ? -1 : 1,
            'expense', 'transfer_out' => -1,
            default => throw new RuntimeException('Unknown source movement kind.'),
        };
        $delta += $sign * $amount;
        $dailyDelta += ($transaction['flow_kind'] === 'adjustment' ? -1 : $sign) * $amount;
    }
    $calculated = (int) $month['opening_balance'] + $delta + (int) $month['interest_total'];
    if ($calculated !== (int) $month['closing_balance']) {
        $report['monthly_equation_differences'][] = ['account_id' => $id, 'month' => $month['month_key'],
            'calculated_minor' => (string) $calculated, 'reported_minor' => (string) $month['closing_balance']];
    }
    if ($delta !== $dailyDelta) {
        $report['daily_sign_differences'][] = ['account_id' => $id, 'month' => $month['month_key'], 'monthly_delta_minor' => (string) $delta, 'daily_delta_minor' => (string) $dailyDelta];
    }
    $previous[$id] = $month;
}
foreach ($transactions as $id => $row) {
    if (! isset($accounts[strtolower($row['account_id'])])) {
        $report['orphan_accounts'][] = ['transaction_id' => $id, 'source_account_id' => strtolower($row['account_id']), 'deleted' => $row['deleted_at'] !== null];
    }
    if (! $row['original_transaction_id']) {
        continue;
    }
    $original = $transactions[strtolower($row['original_transaction_id'])] ?? null;
    if (! $original || $row['flow_kind'] !== 'transfer_in' || $original['flow_kind'] !== 'transfer_out'
        || (int) $row['amount'] !== (int) $original['amount'] || $row['occurred_at'] !== $original['occurred_at']
        || $row['status'] !== $original['status'] || (bool) $row['is_disabled'] !== (bool) $original['is_disabled']
        || ($row['deleted_at'] === null) !== ($original['deleted_at'] === null)) {
        $report['invalid_transfer_pairs'][] = $id;
    } elseif (strtolower($row['target_account_id'] ?? '') !== strtolower($original['account_id'])
        || strtolower($original['target_account_id'] ?? '') !== strtolower($row['account_id'])) {
        $report['stale_transfer_references'][] = ['out_id' => strtolower($original['id']), 'in_id' => $id];
    }
}
$result = json_encode($report, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$stream = fopen($argv[2], 'x');
if ($stream === false || fwrite($stream, $result) !== strlen($result)) {
    throw new RuntimeException('Cannot finish private Ledger audit.');
}
fclose($stream);
chmod($argv[2], 0600);
$counts = [];
foreach (['chain_breaks', 'month_gaps', 'declared_opening_differences', 'monthly_equation_differences', 'daily_sign_differences', 'stale_transfer_references', 'invalid_transfer_pairs', 'orphan_accounts'] as $field) {
    $counts[$field] = count($report[$field]);
}
echo json_encode(['source_sha256' => $report['source_sha256'], 'months_checked' => count($months), 'counts' => $counts, 'report_sha256' => hash('sha256', $result)], JSON_THROW_ON_ERROR), PHP_EOL;
