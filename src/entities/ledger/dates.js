// Ledger operation dates are calendar days, not instants. Accept old UTC API responses too.
export function ledgerDate(value) {
  if (typeof value !== 'string') return '';
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$)/.exec(value);
  if (!match) return '';
  if (value.length > 10 && Number.isNaN(Date.parse(value))) return '';
  const date = new Date(`${match[1]}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === match[1] ? match[1] : '';
}

export function displayLedgerDate(value) {
  const day = ledgerDate(value);
  return day ? new Date(`${day}T12:00:00Z`).toLocaleDateString('ru-RU', { timeZone: 'UTC' }) : '—';
}

export function displayLedgerMonth(value) {
  const day = ledgerDate(value);
  return day ? new Date(`${day.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Без даты';
}
