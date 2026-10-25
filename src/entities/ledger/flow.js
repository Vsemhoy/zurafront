import { ledgerDate } from './dates.js';

export function currentLedgerMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
export function shiftLedgerMonth(month, offset) {
  const [year, number] = month.split('-').map(Number);
  return currentLedgerMonth(new Date(year, number - 1 + offset, 1));
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

