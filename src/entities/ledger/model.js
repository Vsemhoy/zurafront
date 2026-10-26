import { parseCategoryKeywords } from './categories.js';
import { ledgerDate } from './dates.js';

export const ledgerKinds = { income: 'Доход', expense: 'Расход', transfer: 'Перевод', adjustment_in: 'Корректировка +', adjustment_out: 'Корректировка −' };
export const ledgerStatuses = { planned: 'Запланировано', posted: 'Проведено', void: 'Отменено' };
export const accountTypes = { bank: 'Банковский счёт', cash: 'Касса', wallet: 'Кошелёк', credit: 'Кредитный счёт' };
export const categoryKinds = { both: 'Доходы и расходы', income: 'Доходы', expense: 'Расходы' };
export const costTypes = { labor: 'Работа', parts: 'Запчасти', consumables: 'Расходники', delivery: 'Доставка', service: 'Услуги', other: 'Прочее', combined: 'Общие затраты' };
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
  if (minor === null) return 'Неизвестно';
  const value = BigInt(minor || '0');
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? '−' : ''}${new Intl.NumberFormat('ru-RU').format(absolute / 100n)},${String(absolute % 100n).padStart(2, '0')}${currency ? ` ${currency}` : ''}`;
}
export function moneyTotals(accounts) {
  const result = new Map();
  for (const account of accounts) {
    if (account.is_archived || account.balance_is_known === false) continue;
    result.set(account.currency, (result.get(account.currency) || 0n) + BigInt(account.balance_today_minor ?? account.balance_minor ?? '0'));
  }
  return [...result].map(([currency, minor]) => ({ currency, minor: String(minor) }));
}
export function newAccount(projectId = '') {
  return { project_id: projectId, title: '', type: 'bank', currency: 'RUB', opening_balance: '0.00', balance_is_known: true, description: '', color: '#7c6a46', sort_order: 0, is_archived: false, exclude_from_reports: false, interest_rate: '', interest_start_on: '', interest_end_on: '' };
}
export function rateToBasisPoints(value) {
  if (value === '' || value == null) return null;
  const points = moneyToMinor(value);
  if (points < 0n || points > 100000n) throw new Error('Годовая ставка: от 0 до 1000%, не более двух знаков после точки.');
  return Number(points);
}
export function newCategory(projectId = '') {
  return { project_id: projectId, title: '', parent_id: '', keywords: [], keywords_text: '', kind: 'both', color: '#7c6a46', sort_order: 0, is_archived: false };
}
export function newTransaction(account = null, kind = 'expense', date = new Date()) {
  const occurred_on = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { account_id: account?.id || '', target_account_id: '', kind, amount: '', occurred_on, status: 'posted', title: '', allocation_project_id: '', category_id: '', note_md: '', is_pinned: false, idempotency_key: crypto.randomUUID() };
}
export function ledgerForm(type, data) {
  const result = { ...(type === 'account' ? newAccount() : type === 'category' ? newCategory() : { category_id: '', allocation_project_id: '', target_account_id: '', note_md: '' }), ...data };
  for (const key of ['category_id', 'allocation_project_id', 'target_account_id', 'note_md', 'description']) if (result[key] == null) result[key] = '';
  if (type === 'category') { result.parent_id ||= ''; result.keywords_text = (data.keywords ?? []).join(', '); }
  if (type === 'account') {
    result.interest_rate = data.interest_rate_bps == null ? result.interest_rate : minorToDecimal(data.interest_rate_bps);
    for (const key of ['interest_start_on', 'interest_end_on']) result[key] ||= '';
  }
  if (type === 'transaction' && result.occurred_on != null) result.occurred_on = ledgerDate(result.occurred_on);
  return result;
}
export function ledgerPayload(type, form, original = null) {
  const existing = Boolean(original?.id);
  const fields = type === 'account' ? ['title', 'type', 'opening_balance', 'balance_is_known', 'description', 'color', 'sort_order', 'is_archived', 'exclude_from_reports', 'interest_rate', 'interest_start_on', 'interest_end_on'] : type === 'category' ? ['title', 'parent_id', 'keywords_text', 'kind', 'color', 'sort_order', 'is_archived'] : ['title', 'amount', 'occurred_on', 'status', 'allocation_project_id', 'category_id', 'note_md', 'is_pinned'];
  const normalize = (field, value) => field === 'keywords_text' ? JSON.stringify(parseCategoryKeywords(value)) : field === 'occurred_on' ? ledgerDate(value) : field === 'interest_rate' ? rateToBasisPoints(value) : ['amount', 'opening_balance'].includes(field) ? minorToDecimal(moneyToMinor(value || '0')) : ['parent_id', 'category_id', 'allocation_project_id', 'note_md', 'description', 'interest_start_on', 'interest_end_on'].includes(field) ? value || null : field === 'sort_order' ? Number(value) : field === 'title' ? String(value).trim() : value;
  const result = {};
  for (const field of fields) {
    if (existing && normalize(field, form[field]) === normalize(field, original[field])) continue;
    if (field === 'keywords_text') result.keywords = parseCategoryKeywords(form[field]);
    else result[field === 'interest_rate' ? 'interest_rate_bps' : field] = normalize(field, form[field]);
  }
  if (type === 'account' && original?.balance_is_known === false && form.balance_is_known) result.opening_balance = normalize('opening_balance', form.opening_balance);
  if (existing) result.revision = original.revision;
  else if (type === 'account') { result.project_id = form.project_id; result.currency = form.currency; }
  else if (type === 'category') result.project_id = form.project_id;
  else { result.kind = form.kind; result.account_id = form.account_id; result.target_account_id = form.kind === 'transfer' ? form.target_account_id : null; result.idempotency_key = form.idempotency_key; if (form.kind === 'transfer') result.category_id = null; }
  if (type === 'transaction' && existing && original.has_exploitation && form.cost_type !== original.cost_type) result.cost_type = form.cost_type;
  return result;
}

export function newExploitationExpense(entry) {
  return { account_id: '', amount: '', cost_type: 'labor', title: '', note_md: '', occurred_on: ledgerDate(entry.occurred_on), status: 'posted', idempotency_key: crypto.randomUUID() };
}

export function exploitationExpensePayload(form, entryRevision) {
  const { title, ...data } = form;
  return { ...data, occurred_on: ledgerDate(form.occurred_on), amount: minorToDecimal(moneyToMinor(form.amount)), ...(title.trim() ? { title: title.trim() } : {}), note_md: form.note_md || null, entry_revision: entryRevision };
}
export function transactionSign(transaction, accountId = '') {
  if (['income', 'adjustment_in'].includes(transaction.kind)) return '+';
  if (['expense', 'adjustment_out'].includes(transaction.kind)) return '−';
  if (accountId) return transaction.target_account_id === accountId ? '+' : '−';
  return !transaction.account ? '+' : !transaction.target_account ? '−' : '↔';
}
