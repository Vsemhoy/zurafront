import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable, pointerWithin, rectIntersection } from '@dnd-kit/core';
import { IconArrowDown, IconArrowUp, IconChevronLeft, IconChevronRight, IconGripVertical, IconPlus } from '@tabler/icons-react';
import { ledgerApi } from '../entities/ledger/api';
import { useLedgerRefresh } from '../entities/ledger/hooks';
import { canMoveLedgerCard, currentLedgerMonth, flowSlots, ledgerFlowMonthTotals, ledgerMonthGroups, ledgerPeriodFilters, ledgerSelectedAccountIds, shiftLedgerMonth, shiftLedgerPeriod } from '../entities/ledger/flow';
import { displayLedgerDate, displayLedgerMonth } from '../entities/ledger/dates';
import { formatMoney, ledgerKinds, ledgerStatuses, newTransaction, transactionSign } from '../entities/ledger/model';
import './LedgerFlow.css';

export function LedgerPeriodToolbar({ params, change, report = false, accounts }) {
  const current = currentLedgerMonth();
  const start = params.get('start') || (report ? shiftLedgerMonth(current, -11) : current);
  const end = params.get('end') || current;
  const forecast = params.get('calculation') !== 'actual';
  const allTime = report && ['categories', 'projects'].includes(params.get('group_by')) && params.get('all_time') === '1';
  const maximum = report && !forecast ? current : '2100-12';
  const horizon = accounts.find((account) => !account.is_archived && account.forecast_as_of)?.forecast_as_of?.slice(0, 7);
  const validRange = /^\d{4}-(0[1-9]|1[0-2])$/.test(start) && /^\d{4}-(0[1-9]|1[0-2])$/.test(end) && start <= end;
  return <div className="ledger-period-toolbar">
    <button className="ledger-period-arrow" title="На месяц назад" aria-label="На месяц назад" disabled={allTime || !validRange || start <= '1900-01'} onClick={() => change(shiftLedgerPeriod(start, end, -1))}><IconChevronLeft size={16}/></button>
    <label>С месяца<input type="month" aria-label="Начало периода" disabled={allTime} min="1900-01" max={maximum} value={start} onChange={(event) => change('start', event.target.value)}/></label>
    <label>По месяц<input type="month" aria-label="Конец периода" disabled={allTime} min={start} max={maximum} value={end} onChange={(event) => change('end', event.target.value)}/></label>
    <button className="ledger-period-arrow" title="На месяц вперёд" aria-label="На месяц вперёд" disabled={allTime || !validRange || end >= maximum} onClick={() => change(shiftLedgerPeriod(start, end, 1))}><IconChevronRight size={16}/></button>
    <button disabled={allTime} title="Показать текущий месяц" onClick={() => change({ start: current, end: current })}>Сегодня</button>
    <select aria-label="Режим расчёта" value={forecast ? 'forecast' : 'actual'} onChange={(event) => change({ calculation: event.target.value, ...(event.target.value === 'actual' && report && end > current ? { start: start > current ? current : start, end: current } : {}) })}><option value="forecast">Прогноз</option><option value="actual">Факт</option></select>
    {forecast && horizon && !allTime && <button title="Месяц последней операции по активным счетам" onClick={() => change({ start: horizon, end: horizon })}>Последняя операция</button>}
    {report ? <select aria-label="Счёт в периоде" value={params.get('account_id') || ''} onChange={(event) => change('account_id', event.target.value)}><option value="">Все счета</option>{accounts.filter((account) => !account.exclude_from_reports).map((account) => <option key={account.id} value={account.id}>{account.title} · {account.currency}</option>)}</select> : <LedgerAccountPicker accounts={accounts} selected={ledgerSelectedAccountIds(params)} onChange={(ids) => change({ account_id: '', account_ids: ids })}/>}
    <label className="ledger-check"><input type="checkbox" checked={params.get('archived') === '1'} onChange={(event) => change('archived', event.target.checked ? '1' : '')}/>С архивными</label>
    <small>{allTime ? 'Вся история операций' : report ? 'До 24 месяцев' : 'До 3 месяцев'}</small>
  </div>;
}

function LedgerAccountPicker({ accounts, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event) => { if (!container.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const names = selected.map((key) => accounts.find((account) => account.id === key)?.title || 'Недоступный счёт');
  return <div className="ledger-account-picker" ref={container} onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} aria-label="Отображаемые счета" title={names.join(', ') || 'Все счета'} onClick={() => setOpen((value) => !value)}>{selected.length === 0 ? 'Все счета' : selected.length === 1 ? names[0] : `Счета: ${selected.length}`} ▾</button>
    {open && <div id={id} className="ledger-account-picker-menu" role="group" aria-label="Отображаемые счета">
      <button type="button" onClick={() => onChange([])} disabled={!selected.length}>Показать все счета</button>
      {accounts.map((account) => <button key={account.id} type="button" role="checkbox" aria-checked={selected.includes(account.id)} className="ledger-account-option" onClick={() => onChange(selected.includes(account.id) ? selected.filter((key) => key !== account.id) : [...selected, account.id])}><span className="ledger-account-check" aria-hidden="true">{selected.includes(account.id) ? '✓' : ''}</span><span>{account.title}<small>{account.currency}{account.is_archived ? ' · Архив' : ''}</small></span></button>)}
      {!accounts.length && <small>Нет доступных счетов</small>}
      <small>Без отметок показываются все счета. Архивные — по переключателю «С архивными».</small>
    </div>}
  </div>;
}

export default function LedgerFlow({ scopeId, params, change, onOpen, onCreate }) {
  const filters = ledgerPeriodFilters(params);
  const query = useQuery({ queryKey: ['ledger-flow', scopeId, filters], queryFn: ({ signal }) => ledgerApi.flow(scopeId, filters, signal) });
  const refresh = useLedgerRefresh(scopeId);
  const [dragging, setDragging] = useState(null);
  const [copying, setCopying] = useState(false);
  const copyHeld = useRef(false);
  const headerScroll = useRef(null);
  const bodyScroll = useRef(null);
  const syncScroll = (event, target) => { if (target.current && target.current.scrollLeft !== event.currentTarget.scrollLeft) target.current.scrollLeft = event.currentTarget.scrollLeft; };
  useEffect(() => {
    const update = (event) => { copyHeld.current = event.shiftKey; setCopying(event.shiftKey); };
    const reset = () => { copyHeld.current = false; setCopying(false); };
    window.addEventListener('keydown', update);
    window.addEventListener('keyup', update);
    window.addEventListener('pointerup', update, true);
    window.addEventListener('blur', reset);
    return () => { window.removeEventListener('keydown', update); window.removeEventListener('keyup', update); window.removeEventListener('pointerup', update, true); window.removeEventListener('blur', reset); };
  }, []);
  const [notice, setNotice] = useState('');
  const move = useMutation({ mutationFn: ({ transaction, side, account, date, copy, idempotencyKey }) => ledgerApi.move(scopeId, transaction.id, { revision: transaction.revision, account_id: account.id, occurred_on: date, side, ...(copy ? { copy: true, idempotency_key: idempotencyKey } : {}) }),
    onSuccess: (_, variables) => { refresh(); setNotice(variables.copy ? 'Создана копия операции' : 'Операция перенесена'); }, onError: () => refresh() });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 7 } }), useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 7 } }), useSensor(KeyboardSensor));
  const accounts = query.data?.accounts ?? [];
  const slots = useMemo(() => flowSlots(query.data?.transactions ?? [], query.data?.accounts ?? []), [query.data]);
  const daily = useMemo(() => new Map(Object.entries(query.data?.daily ?? {}).flatMap(([id, days]) => days.map((day) => [`${day.date}:${id}`, day]))), [query.data]);
  const descending = params.get('direction') !== 'asc';
  const months = ledgerMonthGroups(filters.start, filters.end, descending);
  const finish = ({ active, over }) => {
    setDragging(null);
    const card = active.data.current;
    const destination = over?.data.current;
    if (!card || !destination || move.isPending) return;
    const { transaction, side } = card;
    if (!canMoveLedgerCard(transaction, side, destination.account, accounts)) { setNotice('Выберите доступный счёт того же проекта и валюты. Стороны перевода должны различаться.'); return; }
    const original = side === 'target' ? transaction.target_account_id : transaction.account_id;
    if (original === destination.account.id && transaction.occurred_on === destination.date) return;
    setNotice(''); move.mutate({ ...card, ...destination, copy: copyHeld.current, idempotencyKey: crypto.randomUUID() });
  };
  if (query.isPending) return <p>Загружаю поток…</p>;
  if (query.error) return <div className="ledger-error" role="alert">{query.error.message}<button onClick={() => query.refetch()}>Повторить</button></div>;
  if (!accounts.length) return <p className="ledger-empty">Нет счетов для выбранного фильтра.</p>;
  return <section className="ledger-flow">
    <p className="ledger-help">Двойной клик по ячейке — новая операция, по карточке — просмотр. Тяните за ручку для переноса, с Shift — для копирования в другую ячейку. Копия создаётся без фотографий и связи с эксплуатацией. {query.data.forecast ? 'Прогноз: проведённые и запланированные операции, включая будущие, с расчётными процентами до конца выбранного периода.' : 'Факт: только проведённые операции и проценты, по сегодняшний день.'}</p>
    {notice && <p role="status" className="ledger-notice">{notice}</p>}{move.error && <p role="alert" className="ledger-error">{move.error.message}</p>}
    <DndContext sensors={sensors} collisionDetection={(args) => { const hits = pointerWithin(args); return hits.length ? hits : rectIntersection(args); }} onDragStart={({ active, activatorEvent }) => { move.reset(); copyHeld.current = Boolean(activatorEvent.shiftKey); setCopying(copyHeld.current); setDragging(active.data.current); }} onDragCancel={() => setDragging(null)} onDragEnd={finish}>
      <div className="ledger-flow-sticky"><div className="ledger-flow-scroll ledger-flow-heading-scroll" ref={headerScroll} onScroll={(event) => syncScroll(event, bodyScroll)}><table className="ledger-flow-table" style={{ '--ledger-account-count': accounts.length }}><thead><tr><th aria-sort={descending ? 'descending' : 'ascending'}><span className="ledger-date-heading">Дата<button title={descending ? 'От последнего числа · переключить на первое' : 'От первого числа · переключить на последнее'} aria-label={descending ? 'Показать от первого числа' : 'Показать от последнего числа'} onClick={() => change('direction', descending ? 'asc' : 'desc')}>{descending ? <IconArrowDown size={16}/> : <IconArrowUp size={16}/>}</button></span></th>{accounts.map((account) => <th key={account.id} style={{ '--account-color': account.color }}><strong>{account.title}</strong><small>{account.project?.key} · {account.currency}{account.is_archived ? ' · Архив' : ''}</small></th>)}</tr></thead></table></div></div>
      <div className="ledger-flow-scroll" ref={bodyScroll} onScroll={(event) => syncScroll(event, headerScroll)} aria-busy={move.isPending}><table className="ledger-flow-table" style={{ '--ledger-account-count': accounts.length }} aria-label="Операции по дням и счетам"><thead className="ledger-flow-semantic-head"><tr><th scope="col"><span>Дата</span></th>{accounts.map((account) => <th scope="col" key={account.id}><span>{account.title} · {account.currency}</span></th>)}</tr></thead>
        <tbody>{months.map(({ month, dates }) => <Fragment key={month}>
          <FlowMonthRow month={month} accounts={accounts} transactions={query.data.transactions ?? []} daily={query.data.daily ?? {}} asOf={query.data.calculated_through ?? query.data.as_of} forecast={query.data.forecast}/>
          {dates.map((date) => <FlowRow key={date} date={date} accounts={accounts} slots={slots} daily={daily} dragging={dragging} busy={move.isPending} today={query.data.as_of} onOpen={onOpen} onCreate={(account) => onCreate({ ...newTransaction(account), occurred_on: date })}/>)}
        </Fragment>)}</tbody>
      </table></div>
      <DragOverlay>{dragging && <div className="ledger-flow-card ledger-flow-card--overlay"><small>{copying ? '+ Копировать' : 'Перенести'}</small><strong>{dragging.transaction.title}</strong><span>{formatMoney(dragging.transaction.amount_minor, dragging.transaction.currency)}</span></div>}</DragOverlay>
    </DndContext>
  </section>;
}

function FlowMonthRow({ month, accounts, transactions, daily, asOf, forecast }) {
  const totals = useMemo(() => ledgerFlowMonthTotals(month, accounts, transactions, daily, asOf, forecast), [month, accounts, transactions, daily, asOf, forecast]);
  const future = month > asOf.slice(0, 7);
  return <tr className="ledger-flow-month"><th scope="row">{displayLedgerMonth(`${month}-01`)}<small>{forecast ? 'Прогноз месяца' : future ? 'Месяц ещё не наступил' : month === asOf.slice(0, 7) ? `Итоги на ${displayLedgerDate(asOf)}` : 'Итоги месяца'}</small></th>{accounts.map((account) => {
    const total = totals.get(account.id);
    return <td key={account.id}><div className="ledger-month-totals">
      <span className="ledger-income">Доходы <b>{formatMoney(total.income, account.currency)}</b></span>
      <span className="ledger-expense">Расходы <b>{formatMoney(total.expense, account.currency)}</b></span>
      <span>Итог доходов и расходов <b>{formatMoney(total.net, account.currency)}</b></span>
      {(total.received !== '0' || total.sent !== '0') && <span className="ledger-month-transfers" title={`Входящие: ${formatMoney(total.received, account.currency)}; исходящие: ${formatMoney(total.sent, account.currency)}`}>Переводы, нетто <b>{formatMoney(total.transfers, account.currency)}</b></span>}
      {(total.adjustment_in !== '0' || total.adjustment_out !== '0') && <span>Корректировки <b>{formatMoney(total.adjustments, account.currency)}</b></span>}
      {total.interest !== '0' && <span>Проценты <b>{formatMoney(total.interest, account.currency)}</b></span>}
      <strong className="ledger-month-balance" title={total.balance_date ? `На ${displayLedgerDate(total.balance_date)}. На начало месяца: ${formatMoney(total.opening_minor, account.currency)}` : 'Остаток неизвестен или месяц ещё не наступил'}>Остаток <b>{total.closing_minor === null ? '—' : formatMoney(total.closing_minor, account.currency)}</b></strong>
    </div></td>;
  })}</tr>;
}
function FlowRow({ date, accounts, slots, daily, dragging, busy, today, onOpen, onCreate }) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  return <tr className={`${date === today ? 'is-today' : ''} ${weekday === 0 || weekday === 6 ? 'is-weekend' : ''}`}><th scope="row"><time dateTime={date}>{displayLedgerDate(date)}</time><small>{['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][weekday]}</small></th>{accounts.map((account) => <td key={account.id}><FlowCell date={date} account={account} accounts={accounts} dragging={dragging} busy={busy} balance={daily.get(`${date}:${account.id}`)} cards={slots.get(`${date}:${account.id}`) ?? []} onOpen={onOpen} onCreate={() => onCreate(account)}/></td>)}</tr>;
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
