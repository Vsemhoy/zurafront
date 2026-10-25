import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable, pointerWithin, rectIntersection } from '@dnd-kit/core';
import { IconGripVertical, IconPlus } from '@tabler/icons-react';
import { ledgerApi } from '../entities/ledger/api';
import { useLedgerRefresh } from '../entities/ledger/hooks';
import { canMoveLedgerCard, currentLedgerMonth, flowSlots, ledgerDays, ledgerPeriodFilters, shiftLedgerMonth } from '../entities/ledger/flow';
import { displayLedgerDate, displayLedgerMonth } from '../entities/ledger/dates';
import { formatMoney, ledgerKinds, ledgerStatuses, newTransaction, transactionSign } from '../entities/ledger/model';
import './LedgerFlow.css';

export function LedgerPeriodToolbar({ params, change, report = false, accounts }) {
  const current = currentLedgerMonth();
  const start = params.get('start') || (report ? shiftLedgerMonth(current, -11) : current);
  const end = params.get('end') || current;
  return <div className="ledger-period-toolbar">
    <label>С месяца<input type="month" aria-label="Начало периода" min="1900-01" max={report ? current : '2100-12'} value={start} onChange={(event) => change('start', event.target.value)}/></label>
    <label>По месяц<input type="month" aria-label="Конец периода" min={start} max={report ? current : '2100-12'} value={end} onChange={(event) => change('end', event.target.value)}/></label>
    <select aria-label="Счёт в периоде" value={params.get('account_id') || ''} onChange={(event) => change('account_id', event.target.value)}><option value="">Все счета</option>{accounts.filter((account) => !report || !account.exclude_from_reports).map((account) => <option key={account.id} value={account.id}>{account.title} · {account.currency}</option>)}</select>
    <label className="ledger-check"><input type="checkbox" checked={params.get('archived') === '1'} onChange={(event) => change('archived', event.target.checked ? '1' : '')}/>С архивными</label>
    <small>{report ? 'До 24 месяцев' : 'До 3 месяцев'}</small>
  </div>;
}

export default function LedgerFlow({ scopeId, params, onOpen, onCreate }) {
  const filters = ledgerPeriodFilters(params);
  const query = useQuery({ queryKey: ['ledger-flow', scopeId, filters], queryFn: ({ signal }) => ledgerApi.flow(scopeId, filters, signal) });
  const refresh = useLedgerRefresh(scopeId);
  const [dragging, setDragging] = useState(null);
  const [notice, setNotice] = useState('');
  const move = useMutation({ mutationFn: ({ transaction, side, account, date }) => ledgerApi.move(scopeId, transaction.id, { revision: transaction.revision, account_id: account.id, occurred_on: date, side }),
    onSuccess: () => { refresh(); setNotice('Операция перенесена'); }, onError: () => refresh() });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 7 } }), useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 7 } }), useSensor(KeyboardSensor));
  const accounts = query.data?.accounts ?? [];
  const slots = useMemo(() => flowSlots(query.data?.transactions ?? [], query.data?.accounts ?? []), [query.data]);
  const daily = useMemo(() => new Map(Object.entries(query.data?.daily ?? {}).flatMap(([id, days]) => days.map((day) => [`${day.date}:${id}`, day]))), [query.data]);
  const dates = ledgerDays(filters.start, filters.end);
  const finish = ({ active, over }) => {
    setDragging(null);
    const card = active.data.current;
    const destination = over?.data.current;
    if (!card || !destination || move.isPending) return;
    const { transaction, side } = card;
    if (!canMoveLedgerCard(transaction, side, destination.account, accounts)) { setNotice('Выберите доступный счёт того же проекта и валюты. Стороны перевода должны различаться.'); return; }
    const original = side === 'target' ? transaction.target_account_id : transaction.account_id;
    if (original === destination.account.id && transaction.occurred_on === destination.date) return;
    setNotice(''); move.mutate({ ...card, ...destination });
  };
  if (query.isPending) return <p>Загружаю поток…</p>;
  if (query.error) return <div className="ledger-error" role="alert">{query.error.message}<button onClick={() => query.refetch()}>Повторить</button></div>;
  if (!accounts.length) return <p className="ledger-empty">Нет счетов для выбранного фильтра.</p>;
  return <section className="ledger-flow">
    <p className="ledger-help">Двойной клик по ячейке — новая операция, по карточке — просмотр. Тяните за ручку, чтобы поменять дату или счёт. Остатки — только проведённые операции и проценты, по сегодняшний день.</p>
    {notice && <p role="status" className="ledger-notice">{notice}</p>}{move.error && <p role="alert" className="ledger-error">{move.error.message}</p>}
    <DndContext sensors={sensors} collisionDetection={(args) => { const hits = pointerWithin(args); return hits.length ? hits : rectIntersection(args); }} onDragStart={({ active }) => { move.reset(); setDragging(active.data.current); }} onDragCancel={() => setDragging(null)} onDragEnd={finish}>
      <div className="ledger-flow-scroll" aria-busy={move.isPending}><table className="ledger-flow-table"><thead><tr><th>Дата</th>{accounts.map((account) => <th key={account.id} style={{ '--account-color': account.color }}><strong>{account.title}</strong><small>{account.project?.key} · {account.currency}{account.is_archived ? ' · Архив' : ''}</small></th>)}</tr></thead>
        <tbody>{dates.map((date, index) => <FlowRow key={date} date={date} monthStart={index === 0 || date.endsWith('-01')} accounts={accounts} slots={slots} daily={daily} dragging={dragging} busy={move.isPending} today={query.data.as_of} onOpen={onOpen} onCreate={(account) => onCreate({ ...newTransaction(account), occurred_on: date })}/>)}</tbody>
      </table></div>
      <DragOverlay>{dragging && <div className="ledger-flow-card ledger-flow-card--overlay"><strong>{dragging.transaction.title}</strong><span>{formatMoney(dragging.transaction.amount_minor, dragging.transaction.currency)}</span></div>}</DragOverlay>
    </DndContext>
  </section>;
}

function FlowRow({ date, monthStart, accounts, slots, daily, dragging, busy, today, onOpen, onCreate }) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  return <>{monthStart && <tr className="ledger-flow-month"><th colSpan={accounts.length + 1}>{displayLedgerMonth(date)}</th></tr>}<tr className={`${date === today ? 'is-today' : ''} ${weekday === 0 || weekday === 6 ? 'is-weekend' : ''}`}><th scope="row"><time dateTime={date}>{displayLedgerDate(date)}</time><small>{['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][weekday]}</small></th>{accounts.map((account) => <td key={account.id}><FlowCell date={date} account={account} accounts={accounts} dragging={dragging} busy={busy} balance={daily.get(`${date}:${account.id}`)} cards={slots.get(`${date}:${account.id}`) ?? []} onOpen={onOpen} onCreate={() => onCreate(account)}/></td>)}</tr></>;
}
function FlowCell({ date, account, accounts, dragging, busy, balance, cards, onOpen, onCreate }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${date}:${account.id}`, data: { date, account }, disabled: busy || !account.can_write || Boolean(dragging && !canMoveLedgerCard(dragging.transaction, dragging.side, account, accounts)) });
  return <div ref={setNodeRef} className={`ledger-flow-cell ${isOver ? 'is-over' : ''}`} onDoubleClick={(event) => { if (account.can_write && !busy && !event.target.closest('button,.ledger-flow-card')) onCreate(); }}>
    {cards.map((card) => <FlowCard key={`${card.transaction.id}:${card.side}`} {...card} accountId={account.id} busy={busy} onOpen={onOpen}/>)}
    <footer><small title={balance ? `На начало дня: ${formatMoney(balance.opening_minor, account.currency)}` : 'Остаток неизвестен или дата ещё не наступила'}>{balance ? formatMoney(balance.closing_minor, account.currency) : '—'}{balance && balance.interest_minor !== '0' && <em>Проценты: {formatMoney(balance.interest_minor, account.currency)}</em>}</small>{account.can_write && <button disabled={busy} aria-label={`Новая операция: ${account.title}, ${date}`} title="Новая операция" onClick={onCreate}><IconPlus size={13}/></button>}</footer>
  </div>;
}
function FlowCard({ transaction, side, accountId, busy, onOpen }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: `${transaction.id}:${side}`, data: { transaction, side }, disabled: !transaction.can_write || busy });
  return <article ref={setNodeRef} className={`ledger-flow-card ${isDragging ? 'is-dragging' : ''}`} data-status={transaction.status} data-kind={transaction.kind} onDoubleClick={(event) => { event.stopPropagation(); onOpen(transaction); }}>
    <header><strong>{transactionSign(transaction, accountId)} {formatMoney(transaction.amount_minor, transaction.currency)}</strong>{transaction.can_write && <button ref={setActivatorNodeRef} className="ledger-flow-grip" disabled={busy} {...attributes} {...listeners} aria-label={`Перенести: ${transaction.title}`}><IconGripVertical size={14}/></button>}</header>
    <button className="ledger-flow-title" onClick={() => onOpen(transaction)}>{transaction.title}</button><small>{ledgerKinds[transaction.kind]} · {ledgerStatuses[transaction.status]}</small>{transaction.category && <small>{transaction.category.title}</small>}
    {transaction.kind === 'transfer' && <small>{side === 'source' ? '→ ' + (transaction.target_account?.title || 'Закрытый счёт') : '← ' + (transaction.account?.title || 'Закрытый счёт')}</small>}
  </article>;
}
