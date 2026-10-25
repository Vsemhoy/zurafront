import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { IconCoin, IconPlus, IconTool, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { ledgerApi } from '../entities/ledger/api';
import { useLedgerRefresh } from '../entities/ledger/hooks';
import { accountTypes, categoryKinds, costTypes, formatMoney, ledgerForm, ledgerKinds, ledgerPayload, ledgerStatuses, minorToDecimal, moneyTotals, newAccount, newCategory, newTransaction, transactionSign } from '../entities/ledger/model';
import LedgerStatement from './LedgerStatement';
import { useSaveForm } from '../shared/ui/useSaveForm';
import { EditorSaveBar } from '../shared/ui/EditorSaveBar';
import CompactMarkdownEditor from '../shared/ui/CompactMarkdownEditor';
import MarkdownRenderer from '../shared/ui/MarkdownRenderer';
import './LedgerPage.css';

const displayDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU');
const displayMonth = (date) => new Date(`${date.slice(0, 7)}-01T12:00:00`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
export function LedgerPage() {
  const { activeScope } = useWorkspace();
  const { transactionId } = useParams();
  return activeScope ? <LedgerWorkspace key={activeScope.id} scope={activeScope} transactionId={transactionId}/> : <main className="ledger-page">Выберите скоуп.</main>;
}

function LedgerWorkspace({ scope, transactionId }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [editor, setEditor] = useState(null);
  const [statementAccount, setStatementAccount] = useState(null);
  const [notice, setNotice] = useState('');
  const refresh = useLedgerRefresh(scope.id);
  const options = useQuery({ queryKey: ['ledger-options', scope.id], queryFn: () => ledgerApi.options(scope.id), refetchInterval: 30000 });
  const view = ['accounts', 'categories'].includes(params.get('view')) ? params.get('view') : 'journal';
  const projectId = params.get('project_id') || '';
  const filterKey = new URLSearchParams([...params].filter(([key]) => ['project_id', 'account_id', 'kind', 'status', 'category_id', 'q', 'from', 'to', 'page', 'trash', 'cost_type'].includes(key))).toString();
  const transactions = useQuery({ queryKey: ['ledger-transactions', scope.id, filterKey], queryFn: ({ signal }) => ledgerApi.transactions(scope.id, filterKey, signal), enabled: options.isSuccess && view === 'journal' });
  const accountFilters = { ...(projectId ? { project_id: projectId } : {}), ...(params.get('page') ? { page: params.get('page') } : {}), ...(params.get('archived') ? { archived: '1' } : {}) };
  const accounts = useQuery({ queryKey: ['ledger-accounts', scope.id, accountFilters], queryFn: ({ signal }) => ledgerApi.accounts(scope.id, accountFilters, signal), enabled: options.isSuccess && view === 'accounts' });
  const change = (key, value) => setParams((previous) => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.delete('page'); if (key === 'project_id') { next.delete('account_id'); next.delete('category_id'); } return next; });
  const data = options.data;
  const projectAccounts = data?.accounts.filter((account) => !projectId || account.project_id === projectId) ?? [];
  const balanceAccounts = projectAccounts.filter((account) => !params.get('account_id') || account.id === params.get('account_id'));
  const writable = projectAccounts.filter((account) => account.can_write);
  const preferredAccount = writable.find((account) => account.id === params.get('account_id')) ?? writable[0];
  const manageable = data?.projects.filter((project) => project.can_manage) ?? [];
  const preferredProject = manageable.find((project) => project.id === projectId)?.id ?? manageable[0]?.id ?? '';
  const closeEditor = () => { setEditor(null); if (transactionId) navigate(`/ledger${params.toString() ? `?${params}` : ''}`, { replace: true }); };
  const selection = transactionId ? { type: 'transaction', id: transactionId } : editor;
  return <main className="ledger-page"><header className="ledger-heading"><span><IconCoin size={28}/></span><div><h1>Ledger</h1><p>Проектные счета и движение денег</p></div>{data && writable.length > 0 && <button className="ledger-primary" onClick={() => setEditor({ type: 'transaction', draft: newTransaction(preferredAccount) })}><IconPlus size={17}/>Новая операция</button>}</header>
    {options.isPending ? <p>Загружаю Ledger…</p> : options.error ? <div className="ledger-error" role="alert"><p>{options.error.status === 403 ? 'Нет доступа к Ledger. Нужны отдельные финансовые права и доступ к проекту.' : options.error.message}</p><button onClick={() => options.refetch()}>Повторить</button></div> : <>
      <div className="ledger-tabs" role="navigation" aria-label="Разделы Ledger">{[['journal', 'Операции'], ['accounts', 'Счета'], ['categories', 'Категории']].map(([id, title]) => <button key={id} aria-pressed={view === id} onClick={() => change('view', id === 'journal' ? '' : id)}>{title}</button>)}<select aria-label="Проект Ledger" value={projectId} onChange={(event) => change('project_id', event.target.value)}><option value="">Все доступные проекты</option>{data.projects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.title}{project.deleted_at ? ' (архив проекта)' : ''}</option>)}</select></div>
      {notice && <p role="status" className="ledger-notice">{notice}</p>}
      <section className="ledger-balances" aria-label="Остатки по валютам"><small>Остатки на сегодня · проведённые операции и расчётные проценты · без будущих операций</small><div>{moneyTotals(balanceAccounts).map((item) => <strong key={item.currency}>{formatMoney(item.minor, item.currency)}</strong>)}{!balanceAccounts.length && <span>Нет доступных счетов</span>}</div></section>
      {view === 'journal' && <><div className="ledger-filters"><input aria-label="Поиск операций" placeholder="Название операции…" value={params.get('q') || ''} maxLength={120} onChange={(event) => change('q', event.target.value)}/><select aria-label="Счёт Ledger" value={params.get('account_id') || ''} onChange={(event) => change('account_id', event.target.value)}><option value="">Все счета</option>{projectAccounts.map((account) => <option key={account.id} value={account.id}>{account.title} · {account.currency}{account.is_archived ? ' (архив)' : ''}</option>)}</select><select aria-label="Вид денежной операции" value={params.get('kind') || ''} onChange={(event) => change('kind', event.target.value)}><option value="">Все виды</option>{Object.entries(ledgerKinds).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><select aria-label="Тип затрат эксплуатации" value={params.get('cost_type') || ''} onChange={(event) => change('cost_type', event.target.value)}><option value="">Все типы затрат</option>{Object.entries(costTypes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><select aria-label="Статус денежной операции" value={params.get('status') || ''} onChange={(event) => change('status', event.target.value)}><option value="">Все статусы</option>{Object.entries(ledgerStatuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><select aria-label="Категория Ledger" value={params.get('category_id') || ''} onChange={(event) => change('category_id', event.target.value)}><option value="">Все категории</option>{data.categories.filter((category) => !projectId || category.project_id === projectId).map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select>
        <label>С<input type="date" aria-label="Дата начала Ledger" value={params.get('from') || ''} onChange={(event) => change('from', event.target.value)}/></label><label>По<input type="date" aria-label="Дата конца Ledger" value={params.get('to') || ''} onChange={(event) => change('to', event.target.value)}/></label><label><input type="checkbox" checked={params.get('trash') === '1'} onChange={(event) => change('trash', event.target.checked ? '1' : '')}/>Корзина</label><button onClick={() => setParams(new URLSearchParams())}>Сбросить</button></div>
        {transactions.data && !params.get('trash') && <div className="ledger-turnover"><small>Проведённый оборот по фильтру · за весь диапазон, не только эту страницу</small>{transactions.data.meta.totals.map((total) => <div key={total.currency}><span className="ledger-income">Доход {formatMoney(total.income, total.currency)}</span><span className="ledger-expense">Расход {formatMoney(total.expense, total.currency)}</span><span>Переводы: → {formatMoney(total.sent, total.currency)} · ← {formatMoney(total.received, total.currency)}</span></div>)}</div>}
        {transactions.isPending ? <p>Загружаю операции…</p> : transactions.error ? <p role="alert" className="ledger-error">{transactions.error.message}</p> : <><TransactionTable transactions={transactions.data?.data ?? []} accountId={params.get('account_id') || ''} onOpen={(transaction) => setEditor({ type: 'transaction', id: transaction.id })}/><LedgerPagination result={transactions} onPage={(page) => change('page', String(page))}/></>}
      </>}
      {view === 'accounts' && <><div className="ledger-section-actions"><label><input type="checkbox" checked={params.get('archived') === '1'} onChange={(event) => change('archived', event.target.checked ? '1' : '')}/>С архивными счетами</label>{manageable.length > 0 && <button className="ledger-primary" onClick={() => setEditor({ type: 'account', draft: newAccount(preferredProject) })}><IconPlus size={16}/>Новый счёт</button>}</div>{accounts.isPending ? <p>Загружаю счета…</p> : accounts.error ? <p role="alert" className="ledger-error">{accounts.error.message}</p> : <><div className="ledger-account-grid">{accounts.data?.data.map((account) => <article key={account.id} className={`ledger-account ${account.is_archived ? 'is-archived' : ''}`} style={{ '--account-color': account.color }}><small>{account.project?.key} · {account.project?.title}</small><h2>{account.title}</h2><strong>{formatMoney(account.balance_today_minor ?? account.balance_minor, account.currency)}</strong><p>{accountTypes[account.type]}{account.is_archived ? ' · Архив' : ''}{account.type === 'credit' ? ` · ${minorToDecimal(account.interest_rate_bps ?? 0)}% годовых` : ''}</p><small>Начальный остаток: {formatMoney(account.opening_minor, account.currency)}</small>{account.type === 'credit' && <p>Расчётные проценты на {account.balance_as_of}: {formatMoney(account.interest_minor, account.currency)}</p>}<p className="ledger-description">{account.description}</p><footer><span>Создал: {account.creator_name}</span><button onClick={() => setStatementAccount(account)}>Расчёт</button>{account.can_manage && <button onClick={() => setEditor({ type: 'account', draft: ledgerForm('account', account) })}>Настроить</button>}</footer></article>)}</div>{accounts.data?.data.length === 0 && <p className="ledger-empty">Счетов нет. Создайте счёт и выберите его проект — доступ будет определяться проектом, не авторством.</p>}<LedgerPagination result={accounts} onPage={(page) => change('page', String(page))}/></>}</>}
      {view === 'categories' && <><div className="ledger-section-actions"><p>Категории принадлежат проектам. Архивирование сохраняет старые операции.</p>{manageable.length > 0 && <button className="ledger-primary" onClick={() => setEditor({ type: 'category', draft: newCategory(preferredProject) })}><IconPlus size={16}/>Новая категория</button>}</div><div className="ledger-category-list">{data.categories.filter((category) => !projectId || category.project_id === projectId).map((category) => <article key={category.id} className={category.is_archived ? 'is-archived' : ''}><i style={{ background: category.color }}/><div><strong>{category.title}</strong><small>{data.projects.find((project) => project.id === category.project_id)?.title} · {categoryKinds[category.kind]}{category.is_archived ? ' · Архив' : ''}</small></div>{manageable.some((project) => project.id === category.project_id) && <button onClick={() => setEditor({ type: 'category', draft: ledgerForm('category', category) })}>Настроить</button>}</article>)}</div></>}
      {!data.accounts.length && data.projects.length === 0 && <p className="ledger-empty">Нет доступных проектов Ledger. Авторство и доступ Equip сами по себе финансовых прав не дают.</p>}
      {selection && <LedgerEditor key={`${selection.type}:${selection.id || selection.draft?.id || 'new'}`} scopeId={scope.id} options={data} selection={selection} onClose={closeEditor} onSaved={() => { refresh(); setNotice('Сохранено'); }}/>}
      {statementAccount && <LedgerStatement key={statementAccount.id} scopeId={scope.id} account={statementAccount} onClose={() => setStatementAccount(null)}/>}
    </>}
  </main>;
}

function TransactionTable({ transactions, accountId, onOpen }) {
  const groups = useMemo(() => {
    const result = new Map();
    for (const transaction of transactions) { const month = transaction.is_pinned ? 'Закреплено' : displayMonth(transaction.occurred_on); if (!result.has(month)) result.set(month, []); result.get(month).push(transaction); }
    return [...result];
  }, [transactions]);
  if (!transactions.length) return <p className="ledger-empty">Операций пока нет. Запланированные операции не меняют фактические остатки.</p>;
  return <div className="ledger-table-scroll"><table className="ledger-table"><thead><tr><th>Дата</th><th>Операция</th><th>Счёт / проект</th><th>Категория</th><th>Сумма</th><th>Статус</th><th>Создал</th></tr></thead>{groups.map(([month, items]) => <tbody key={month}><tr className="ledger-month"><th colSpan={7}>{month}</th></tr>{items.map((transaction) => <tr key={transaction.id} data-status={transaction.deleted_at ? 'deleted' : transaction.status}><td>{displayDate(transaction.occurred_on)}</td><td><button className="ledger-text-link" onClick={() => onOpen(transaction)}>{transaction.has_exploitation && <IconTool size={13}/>}<strong>{transaction.title}</strong></button><small>{ledgerKinds[transaction.kind]}{transaction.has_exploitation ? ' · ' + (costTypes[transaction.cost_type] || 'Общие затраты') : ''}</small></td><td>{transaction.account?.title || 'Закрытый счёт'}{transaction.kind === 'transfer' && <> → {transaction.target_account?.title || 'Закрытый счёт'}</>}<small>{transaction.account?.project?.key || transaction.target_account?.project?.key}</small></td><td>{transaction.category?.title || '—'}</td><td className={`ledger-amount ledger-amount--${transaction.kind}`}>{transactionSign(transaction, accountId)} {formatMoney(transaction.amount_minor, transaction.currency)}</td><td><span className="ledger-status">{transaction.deleted_at ? 'Удалено' : ledgerStatuses[transaction.status]}</span></td><td>{transaction.creator_name}</td></tr>)}</tbody>)}</table></div>;
}

function LedgerPagination({ result, onPage }) {
  const meta = result.data?.meta;
  return meta?.last_page > 1 && <nav className="ledger-pagination"><button disabled={result.isFetching || meta.page === 1} onClick={() => onPage(meta.page - 1)}>Назад</button><span>{meta.page} / {meta.last_page} · всего {meta.total}</span><button disabled={result.isFetching || meta.page >= meta.last_page} onClick={() => onPage(meta.page + 1)}>Далее</button></nav>;
}

function LedgerEditor({ scopeId, options, selection, onClose, onSaved }) {
  const dialog = useRef(null);
  const [overlayContainer, setOverlayContainer] = useState(null);
  const bind = useCallback((element) => { dialog.current = element; setOverlayContainer(element); }, []);
  const query = useQuery({ queryKey: ['ledger-transaction', scopeId, selection.id], queryFn: () => ledgerApi.transaction(scopeId, selection.id), enabled: selection.type === 'transaction' && Boolean(selection.id), refetchOnWindowFocus: false });
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  const initial = query.data ? ledgerForm('transaction', query.data) : selection.draft;
  return <dialog ref={bind} className="ledger-dialog" aria-label="Редактор Ledger" onCancel={(event) => { event.preventDefault(); const close = dialog.current.querySelector('[data-ledger-close]'); if (close) close.click(); else onClose(); }}>
    {query.error ? <><p role="alert" className="ledger-error">{query.error.message}</p><button onClick={onClose}>Закрыть</button></> : selection.id && query.isPending ? <><p>Загружаю операцию…</p><button onClick={onClose}>Закрыть</button></> : <LedgerEditorForm type={selection.type} scopeId={scopeId} options={options} initial={initial} overlayContainer={overlayContainer} onClose={onClose} onSaved={onSaved}/>}
  </dialog>;
}

function LedgerEditorForm({ type, scopeId, options, initial, overlayContainer, onClose, onSaved }) {
  const native = useRef(null);
  const [tab, setTab] = useState('main');
  const [editing, setEditing] = useState(type !== 'transaction' || !initial.id);
  const client = useQueryClient();
  const active = editing && (type !== 'transaction' || !initial.id || initial.can_write);
  const form = useSaveForm({ initial, label: 'Ledger', active,
    persist: async (draft, baseline) => ledgerForm(type, await ledgerApi[type === 'account' ? 'saveAccount' : type === 'category' ? 'saveCategory' : 'saveTransaction'](scopeId, baseline.id, ledgerPayload(type, draft, baseline))),
    onSaved: (record) => { if (type === 'transaction') client.setQueryData(['ledger-transaction', scopeId, record.id], record); onSaved(record); },
    onSubmitted: () => { if (!initial.id || type !== 'transaction') onClose(); },
    validate: () => {
      const invalid = native.current?.querySelector(':invalid:not(fieldset)');
      if (invalid) { setTab('main'); requestAnimationFrame(() => invalid.reportValidity()); return false; }
      return true;
    },
  });
  const destroy = useMutation({ mutationFn: () => ledgerApi.remove(scopeId, initial.id, form.draft.revision), onSuccess: () => { onSaved(); onClose(); } });
  const restore = useMutation({ mutationFn: () => ledgerApi.restore(scopeId, initial.id, form.draft.revision), onSuccess: () => { onSaved(); onClose(); } });
  const draft = form.draft;
  const set = (key, value) => form.change((old) => ({ ...old, [key]: value }));
  const close = () => active ? form.leave(onClose) : onClose();
  const account = options.accounts.find((item) => item.id === draft.account_id);
  const categories = options.categories.filter((item) => item.project_id === account?.project_id && ['both', draft.kind].includes(item.kind) && (!item.is_archived || item.id === draft.category_id));
  const field = (key, label, inputType = 'text', extra = {}) => <label>{label}<input type={inputType} value={draft[key] ?? ''} onChange={(event) => set(key, event.target.value)} {...extra}/></label>;
  const heading = type === 'account' ? 'Проектный счёт' : type === 'category' ? 'Категория' : 'Денежная операция';
  return <form ref={native} noValidate className="ledger-editor" onSubmit={(event) => { event.preventDefault(); if (active) void form.save(); }} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }}>
    <header><div><small>Ledger · {heading}</small><h2>{initial.id ? draft.title : `Новая ${type === 'account' ? 'запись счёта' : type === 'category' ? 'категория' : 'операция'}`}</h2></div><button type="button" data-ledger-close aria-label="Закрыть Ledger" disabled={form.busy || destroy.isPending || restore.isPending} onClick={close}><IconX size={20}/></button></header>
    {type === 'transaction' && <nav className="ledger-tabs">{[['main', 'Основное'], ['note', 'Описание'], ...(initial.can_manage ? [['history', 'История']] : [])].map(([id, label]) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>}
    <div className="ledger-editor-body">
      {type === 'transaction' && initial.id && !editing && initial.can_write && <button type="button" className="ledger-secondary" onClick={() => setEditing(true)}>Редактировать</button>}
      <fieldset disabled={!active || form.busy} hidden={tab !== 'main'}><legend>{heading}</legend>
        {field('title', 'Название *', 'text', { required: true, maxLength: type === 'category' ? 120 : type === 'account' ? 160 : 255, autoFocus: !initial.id })}
        {type !== 'transaction' && <label>Проект *<select value={draft.project_id} required disabled={Boolean(initial.id)} onChange={(event) => set('project_id', event.target.value)}><option value="">Выберите проект</option>{options.projects.filter((project) => project.can_manage || project.id === draft.project_id).map((project) => <option key={project.id} value={project.id}>{project.key} · {project.title}</option>)}</select></label>}
        {type === 'account' && <><div className="ledger-form-row"><label>Вид счёта<select value={draft.type} disabled={initial.type === 'credit' && initial.opening_locked} onChange={(event) => { const next = event.target.value; form.change((old) => ({ ...old, type: next, ...(next === 'credit' ? {} : { interest_rate: '', interest_start_on: '', interest_end_on: '' }) })); }}>{Object.entries(accountTypes).map(([id, name]) => <option key={id} value={id} disabled={id === 'credit' && initial.opening_locked && initial.type !== 'credit'}>{name}</option>)}</select></label><label>Валюта *<select required value={draft.currency} disabled={Boolean(initial.id)} onChange={(event) => set('currency', event.target.value)}>{options.currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label></div>{field('opening_balance', 'Начальный остаток', 'text', { required: true, inputMode: 'decimal', pattern: '-?[0-9]{1,10}([.,][0-9]{1,2})?', disabled: initial.opening_locked })}<small>Проект и валюта счёта неизменны. После первой операции начальный остаток фиксируется.</small>
          {draft.type === 'credit' && <><div className="ledger-form-row">{field('interest_rate', 'Годовая ставка, % *', 'text', { required: true, inputMode: 'decimal', pattern: '[0-9]{1,4}([.,][0-9]{1,2})?', disabled: initial.opening_locked })}{field('interest_start_on', 'Начислять с *', 'date', { required: true, min: '1900-01-01', max: '2100-12-31', disabled: initial.opening_locked })}</div>{field('interest_end_on', 'Последний день начисления (необязательно)', 'date', { min: draft.interest_start_on || '1900-01-01', max: '2100-12-31', disabled: initial.opening_locked })}<p className="ledger-help">Долг — отрицательный остаток. Проценты начисляются после движений каждого дня и капитализируются ежедневно. Это расчётная модель, не банковская выписка. После первой операции условия фиксируются. Архивирование само по себе не прекращает начисление — для этого задайте последний день.</p></>}
          <label>Описание<textarea value={draft.description || ''} maxLength={10000} onChange={(event) => set('description', event.target.value)}/></label></>}
        {type === 'category' && <label>Для операций<select value={draft.kind} onChange={(event) => set('kind', event.target.value)}>{Object.entries(categoryKinds).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
        {type !== 'transaction' && <><div className="ledger-form-row">{field('color', 'Цвет', 'color')}{field('sort_order', 'Порядок', 'number', { min: 0, max: 1000000, step: 1 })}</div><label className="ledger-check"><input type="checkbox" checked={draft.is_archived} onChange={(event) => set('is_archived', event.target.checked)}/>В архиве</label></>}
        {type === 'transaction' && <>
          <div className="ledger-form-row"><label>Вид операции<select value={draft.kind} disabled={Boolean(initial.id)} onChange={(event) => form.change((old) => ({ ...old, kind: event.target.value, target_account_id: '', category_id: '' }))}>{Object.entries(ledgerKinds).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>Счёт *<select value={draft.account_id || ''} required disabled={Boolean(initial.id)} onChange={(event) => form.change((old) => ({ ...old, account_id: event.target.value, category_id: '', target_account_id: '' }))}><option value="">{initial.id ? 'Закрытый счёт' : 'Выберите счёт'}</option>{options.accounts.filter((item) => item.can_write || item.id === draft.account_id).map((item) => <option key={item.id} value={item.id}>{item.project?.key} · {item.title} · {item.currency}</option>)}</select></label></div>
          {draft.kind === 'transfer' && <label>На счёт *<select required value={draft.target_account_id || ''} disabled={Boolean(initial.id)} onChange={(event) => set('target_account_id', event.target.value)}><option value="">{initial.id ? 'Закрытый счёт' : 'Выберите другой счёт в той же валюте'}</option>{options.accounts.filter((item) => (item.can_write && item.currency === account?.currency && item.id !== account?.id) || item.id === draft.target_account_id).map((item) => <option key={item.id} value={item.id}>{item.project?.key} · {item.title}</option>)}</select></label>}
          <div className="ledger-form-row">{field('amount', `Сумма *${account?.currency || draft.currency ? ` · ${account?.currency || draft.currency}` : ''}`, 'text', { required: true, inputMode: 'decimal', pattern: '[0-9]{1,10}([.,][0-9]{1,2})?' })}{field('occurred_on', 'Дата операции *', 'date', { required: true })}</div>
          <div className="ledger-form-row"><label>Статус<select value={draft.status} onChange={(event) => set('status', event.target.value)}>{Object.entries(ledgerStatuses).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>{draft.kind !== 'transfer' && <label>Категория<select value={draft.category_id || ''} onChange={(event) => set('category_id', event.target.value)}><option value="">Без категории</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>}</div>
          {initial.has_exploitation && <label>Тип затрат<select value={draft.cost_type || 'combined'} onChange={(event) => set('cost_type', event.target.value)}>{Object.entries(costTypes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>}<label className="ledger-check"><input type="checkbox" checked={draft.is_pinned} onChange={(event) => set('is_pinned', event.target.checked)}/>Закрепить</label>
          <p className="ledger-help">Запланированная или отменённая операция не меняет остаток. Перевод — одна операция на два счёта, не доход и не расход.</p>
        </>}
      </fieldset>
      {type === 'transaction' && initial.id && <p className="ledger-author">Создал: {initial.creator_name} · {new Date(initial.created_at).toLocaleString('ru-RU')}. Авторство не предоставляет доступ к счёту.</p>}
      {type === 'transaction' && initial.has_exploitation && <div className="ledger-source"><IconTool size={17}/><span>Самостоятельный расход эксплуатации. Его сумма, тип и дата не меняются при редактировании оценки в Эксплоитере.</span>{initial.exploitation && <Link to={`/exploiter/${scopeId}/${initial.exploitation.id}`} target="_blank" rel="noopener noreferrer">Запись Эксплоитера →</Link>}</div>}
      {tab === 'note' && (active ? <CompactMarkdownEditor key={initial.id || 'new'} value={draft.note_md} onChange={(value) => set('note_md', value)} toolbarInitiallyOpen hideToolbarTrigger readOnly={form.busy} overlayContainer={overlayContainer}/> : <MarkdownRenderer>{draft.note_md || 'Описание не добавлено.'}</MarkdownRenderer>)}
      {tab === 'history' && initial.id && <LedgerHistory scopeId={scopeId} id={initial.id}/>}
    </div>
    {(form.error || destroy.error || restore.error) && <p className="ledger-error" role="alert">{form.error || destroy.error?.message || restore.error?.message}</p>}
    <footer className="ledger-editor-footer">{active ? <EditorSaveBar {...form} onSave={form.save}><button type="button" disabled={form.busy} onClick={close}>Закрыть редактор</button></EditorSaveBar> : <button type="button" onClick={close}>Закрыть</button>}
      {type === 'transaction' && initial.can_manage && <div className="ledger-danger-actions">{initial.deleted_at ? <button type="button" disabled={restore.isPending} onClick={() => { if (window.confirm('Восстановить операцию с сохранённой суммой и вернуть её влияние на остатки?')) restore.mutate(); }}>Восстановить из корзины</button> : <button type="button" disabled={form.busy || form.dirty || destroy.isPending} onClick={() => { if (window.confirm('Убрать операцию из расчёта остатков? История сохранится, операцию можно восстановить из корзины.')) destroy.mutate(); }}>Удалить в корзину</button>}</div>}
    </footer>
  </form>;
}

function LedgerHistory({ scopeId, id }) {
  const [page, setPage] = useState(1);
  const history = useQuery({ queryKey: ['ledger-history', scopeId, id, page], queryFn: () => ledgerApi.history(scopeId, id, page) });
  return <section className="ledger-history">{history.isPending ? <p>Загружаю историю…</p> : history.error ? <p role="alert">{history.error.message}</p> : <>{history.data.data.map((item) => <article key={item.id}><strong>{({ 'ledger.transaction_created': 'Операция создана', 'ledger.transaction_updated': 'Операция изменена', 'ledger.transaction_deleted': 'Удалена в корзину', 'ledger.transaction_restored': 'Восстановлена', 'ledger.exploitation_cost_updated': 'Изменены затраты Эксплоитера' })[item.action] || item.action}</strong><small>{new Date(item.created_at).toLocaleString('ru-RU')} · автор действия {item.actor_id || 'удалён'}</small><details><summary>Что изменилось</summary><pre>{JSON.stringify({ before: item.before, after: item.after }, null, 2)}</pre></details></article>)}<LedgerPagination result={history} onPage={setPage}/></>}</section>;
}
