export const ledgerKinds = { income: 'Доход', expense: 'Расход', transfer: 'Перевод' };
export const ledgerStatuses = { planned: 'Запланировано', posted: 'Проведено', void: 'Отменено' };
export const accountTypes = { bank: 'Банковский счёт', cash: 'Касса', wallet: 'Кошелёк' };
export const categoryKinds = { both: 'Доходы и расходы', income: 'Доходы', expense: 'Расходы' };
export function moneyToMinor(value) {
  const match = /^(-?)(\d{1,10})(?:[.,](\d{1,2}))?$/.exec(String(value));
  if (!match) throw new Error('Сумма: до 9 999 999 999.99, не более двух знаков после точки.');
  const absolute = BigInt(match[2]) * 100n + BigInt((match[3] || '').padEnd(2, '0'));
  return match[1] ? -absolute : absolute;
}
export function minorToDecimal(value) {
  const minor = BigInt(value);
  const absolute = minor < 0n ? -minor : minor;
  return `${minor < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}
export function formatMoney(minor, currency = '') {
  const value = BigInt(minor || '0');
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? '−' : ''}${new Intl.NumberFormat('ru-RU').format(absolute / 100n)},${String(absolute % 100n).padStart(2, '0')}${currency ? ` ${currency}` : ''}`;
}
export function moneyTotals(accounts) {
  const result = new Map();
  for (const account of accounts) result.set(account.currency, (result.get(account.currency) || 0n) + BigInt(account.balance_minor || '0'));
  return [...result].map(([currency, minor]) => ({ currency, minor: String(minor) }));
}
export function newAccount(projectId = '') {
  return { project_id: projectId, title: '', type: 'bank', currency: 'RUB', opening_balance: '0.00', description: '', color: '#7c6a46', sort_order: 0, is_archived: false };
}
export function newCategory(projectId = '') {
  return { project_id: projectId, title: '', kind: 'both', color: '#7c6a46', sort_order: 0, is_archived: false };
}
export function newTransaction(account = null, kind = 'expense', date = new Date()) {
  const occurred_on = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { account_id: account?.id || '', target_account_id: '', kind, amount: '', occurred_on, status: 'planned', title: '', category_id: '', note_md: '', is_pinned: false, idempotency_key: crypto.randomUUID() };
}
export function ledgerForm(type, data) {
  const result = { ...(type === 'account' ? newAccount() : type === 'category' ? newCategory() : { category_id: '', target_account_id: '', note_md: '' }), ...data };
  for (const key of ['category_id', 'target_account_id', 'note_md', 'description']) if (result[key] == null) result[key] = '';
  return result;
}
export function ledgerPayload(type, form, original = null) {
  const existing = Boolean(original?.id);
  const fields = type === 'account' ? ['title', 'type', 'opening_balance', 'description', 'color', 'sort_order', 'is_archived'] : type === 'category' ? ['title', 'kind', 'color', 'sort_order', 'is_archived'] : ['title', 'amount', 'occurred_on', 'status', 'category_id', 'note_md', 'is_pinned'];
  const normalize = (field, value) => ['amount', 'opening_balance'].includes(field) ? minorToDecimal(moneyToMinor(value || '0')) : ['category_id', 'note_md', 'description'].includes(field) ? value || null : field === 'sort_order' ? Number(value) : field === 'title' ? String(value).trim() : value;
  const result = {};
  for (const field of fields) {
    if (existing && normalize(field, form[field]) === normalize(field, original[field])) continue;
    result[field] = normalize(field, form[field]);
  }
  if (existing) result.revision = original.revision;
  else if (type === 'account') { result.project_id = form.project_id; result.currency = form.currency; }
  else if (type === 'category') result.project_id = form.project_id;
  else { result.kind = form.kind; result.account_id = form.account_id; result.target_account_id = form.kind === 'transfer' ? form.target_account_id : null; result.idempotency_key = form.idempotency_key; if (form.kind === 'transfer') result.category_id = null; }
  return result;
}
export function transactionSign(transaction, accountId = '') {
  if (transaction.kind === 'income') return '+';
  if (transaction.kind === 'expense') return '−';
  if (accountId) return transaction.target_account_id === accountId ? '+' : '−';
  return !transaction.account ? '+' : !transaction.target_account ? '−' : '↔';
}
