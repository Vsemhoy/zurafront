import { ledgerDate } from './dates.js';

export function currentLedgerMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
export function shiftLedgerMonth(month, offset) {
  const [year, number] = month.split('-').map(Number);
  return currentLedgerMonth(new Date(year, number - 1 + offset, 1));
}
export function shiftLedgerPeriod(start, end, offset) {
  return { start: shiftLedgerMonth(start, offset), end: shiftLedgerMonth(end, offset) };
}
export function ledgerMonthGroups(start, end, descending = true) {
  const days = ledgerDays(start, end);
  if (descending) days.reverse();
  const groups = new Map();
  for (const day of days) {
    const month = day.slice(0, 7);
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month).push(day);
  }
  return [...groups].map(([month, dates]) => ({ month, dates }));
}
// Flow includes every visible account, including those excluded from reports.
// Match daily balances: only posted movements through the server's as-of date.
export function ledgerFlowMonthTotals(month, accounts, transactions, daily, asOf) {
  const rows = new Map(accounts.map(({ id }) => [id, {
    income: 0n, expense: 0n, received: 0n, sent: 0n, adjustment_in: 0n, adjustment_out: 0n,
    interest: 0n, opening_minor: null, closing_minor: null, balance_date: null,
  }]));
  for (const transaction of transactions) {
    const date = ledgerDate(transaction.occurred_on);
    if (transaction.status !== 'posted' || date.slice(0, 7) !== month || date > asOf) continue;
    const amount = BigInt(transaction.amount_minor);
    const source = rows.get(transaction.account_id);
    if (transaction.kind === 'transfer') {
      if (source) source.sent += amount;
      const target = rows.get(transaction.target_account_id);
      if (target) target.received += amount;
    } else if (source && ['income', 'expense', 'adjustment_in', 'adjustment_out'].includes(transaction.kind)) {
      source[transaction.kind] += amount;
    }
  }
  for (const [id, row] of rows) {
    const days = (daily[id] ?? []).filter((day) => day.date.slice(0, 7) === month && day.date <= asOf).sort((a, b) => a.date.localeCompare(b.date));
    row.opening_minor = days[0]?.opening_minor ?? null;
    row.closing_minor = days.at(-1)?.closing_minor ?? null;
    row.balance_date = days.at(-1)?.date ?? null;
    for (const day of days) row.interest += BigInt(day.interest_minor || '0');
    row.net = row.income - row.expense;
    row.transfers = row.received - row.sent;
    row.adjustments = row.adjustment_in - row.adjustment_out;
    for (const [key, value] of Object.entries(row)) if (typeof value === 'bigint') row[key] = String(value);
  }
  return rows;
}
export function ledgerDays(start, end) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(start) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(end) || end < start) return [];
  const [year, month] = start.split('-').map(Number);
  const cursor = new Date(year, month - 1, 1);
  const result = [];
  while (currentLedgerMonth(cursor) <= end && result.length < 93) {
    result.push(`${currentLedgerMonth(cursor)}-${String(cursor.getDate()).padStart(2, '0')}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}
export function flowSlots(transactions, accounts) {
  const ids = new Set(accounts.map(({ id }) => id));
  const result = new Map();
  for (const transaction of transactions) {
    for (const [side, id] of [['source', transaction.account_id], ['target', transaction.kind === 'transfer' ? transaction.target_account_id : null]]) {
      if (!ids.has(id)) continue;
      const key = `${ledgerDate(transaction.occurred_on)}:${id}`;
      if (!result.has(key)) result.set(key, []);
      result.get(key).push({ transaction, side });
    }
  }
  return result;
}
export function canMoveLedgerCard(transaction, side, destination, accounts) {
  const originalId = side === 'target' ? transaction.target_account_id : transaction.account_id;
  const original = accounts.find(({ id }) => id === originalId);
  const otherId = side === 'target' ? transaction.account_id : transaction.target_account_id;
  return Boolean(transaction.can_write && destination?.can_write && original && destination.project_id === original.project_id && destination.currency === transaction.currency && destination.id !== otherId && (!transaction.kind.startsWith('adjustment_') || destination.can_manage));
}

export const reportMetrics = [
  ['closing_minor', 'Остаток', '#334155'], ['income', 'Доходы', '#248349'], ['expense', 'Расходы', '#b42318'],
  ['transfers', 'Переводы, нетто', '#1670bc'], ['interest', 'Проценты', '#b87510'], ['adjustments', 'Корректировки', '#8a57a8'],
];
export function reportSeries(rows) {
  return rows.map((row) => ({ ...row, expense: String(-BigInt(row.expense || '0')), transfers: String(BigInt(row.received || '0') - BigInt(row.sent || '0')), adjustments: String(BigInt(row.adjustment_in || '0') - BigInt(row.adjustment_out || '0')) }));
}
export function summarizeLedgerReport(rows, accounts, currency) {
  const ids = new Set(accounts.filter((a) => !a.exclude_from_reports && a.currency === currency).map(({ id }) => id));
  const result = new Map();
  for (const row of rows) {
    if (!ids.has(row.account_id) || row.currency !== currency) continue;
    if (!result.has(row.month)) result.set(row.month, { month: row.month, currency, closing_minor: null, income: '0', expense: '0', sent: '0', received: '0', interest: '0', adjustment_in: '0', adjustment_out: '0' });
    const target = result.get(row.month);
    for (const key of ['closing_minor', 'income', 'expense', 'sent', 'received', 'interest', 'adjustment_in', 'adjustment_out']) {
      if (row[key] != null) target[key] = String(BigInt(target[key] || '0') + BigInt(row[key]));
    }
  }
  return [...result.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function ledgerPeriodFilters(params, report = false) {
  const current = currentLedgerMonth();
  return { start: params.get('start') || (report ? shiftLedgerMonth(current, -11) : current), end: params.get('end') || current,
    ...Object.fromEntries([...params].filter(([key, value]) => ['project_id', 'account_id', 'archived'].includes(key) && value)) };
}

