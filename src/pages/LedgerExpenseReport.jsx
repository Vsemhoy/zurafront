import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ledgerApi } from '../entities/ledger/api';
import { ledgerPeriodFilters, shiftLedgerMonth } from '../entities/ledger/flow';
import { formatMoney } from '../entities/ledger/model';
import { displayLedgerMonth } from '../entities/ledger/dates';

const colors = ['#1670bc', '#248349', '#b87510', '#8a57a8', '#b42318', '#0891b2'];
export default function LedgerExpenseReport({ scopeId, params, change, projects, groupBy }) {
  const filters = { ...ledgerPeriodFilters(params, true), group_by: groupBy, all_time: params.get('all_time') === '1' ? '1' : '0', ...(params.get('allocation_project_id') ? { allocation_project_id: params.get('allocation_project_id') } : {}) };
  const query = useQuery({ queryKey: ['ledger-report', scopeId, filters], queryFn: ({ signal }) => ledgerApi.report(scopeId, filters, signal) });
  const currencies = Object.keys(query.data?.totals ?? {});
  const currency = currencies.includes(params.get('currency')) ? params.get('currency') : currencies[0];
  const rows = useMemo(() => (query.data?.[groupBy] ?? []).filter((row) => row.currency === currency).sort((a, b) => BigInt(a.total_minor) === BigInt(b.total_minor) ? a.title.localeCompare(b.title) : BigInt(a.total_minor) > BigInt(b.total_minor) ? -1 : 1), [query.data, groupBy, currency]);
  const months = useMemo(() => {
    if (query.data?.all_time) return [...new Set(rows.flatMap((row) => Object.keys(row.months)))].sort();
    const result = [];
    for (let month = filters.start; month <= filters.end && result.length < 24; month = shiftLedgerMonth(month, 1)) result.push(month);
    return result;
  }, [query.data?.all_time, rows, filters.start, filters.end]);
  return <section className="ledger-report ledger-expense-report">
    <div className="ledger-period-toolbar">
      <select aria-label="Проект расходов" value={params.get('allocation_project_id') || ''} onChange={(event) => change('allocation_project_id', event.target.value)}><option value="">Все проекты операций</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.title}</option>)}</select>
      <label className="ledger-check"><input type="checkbox" checked={params.get('all_time') === '1'} onChange={(event) => change('all_time', event.target.checked ? '1' : '')}/>За всё время</label>
      {currencies.length > 0 && <select aria-label="Валюта расходов" value={currency} onChange={(event) => change('currency', event.target.value)}>{currencies.map((value) => <option key={value}>{value}</option>)}</select>}
    </div>
    <p className="ledger-help">{filters.forecast === '1' ? 'Прогноз: проведённые и запланированные расходы, включая будущие.' : 'Факт: проведённые расходы по сегодняшний день.'} Учитывается проект операции. Переводы, корректировки и расчётные проценты не включены. Счета с отметкой «Не добавлять в отчёт» исключены.</p>
    {query.isPending ? <p>Считаю расходы…</p> : query.error ? <div className="ledger-error" role="alert">{query.error.message}<button onClick={() => query.refetch()}>Повторить</button></div> : rows.length === 0 ? <p className="ledger-empty">Нет расходов для выбранных фильтров.</p> : <>
      <section className="ledger-balances"><small>{query.data.all_time ? 'Всего за всё время' : 'Всего за выбранный период'} · {filters.forecast === '1' ? 'прогноз' : 'факт'} · {query.data.from} — {query.data.as_of}</small><div><strong>{formatMoney(query.data.totals[currency], currency)}</strong></div></section>
      <ExpenseChart key={`${groupBy}:${currency}`} rows={rows} months={months} currency={currency}/>
      <div className="ledger-table-scroll"><table className="ledger-table ledger-expense-table"><caption>{groupBy === 'categories' ? 'Расходы по категориям' : 'Расходы по проектам'} · {currency}</caption><thead><tr><th>{groupBy === 'categories' ? 'Категория' : 'Проект'}</th><th>Всего</th>{months.map((month) => <th key={month}>{displayLedgerMonth(`${month}-01`)}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><th scope="row">{row.title}</th><td><strong>{formatMoney(row.total_minor, currency)}</strong></td>{months.map((month) => <td key={month}>{formatMoney(row.months[month] || '0', currency)}</td>)}</tr>)}</tbody><tfoot><tr><th>Всего</th><td>{formatMoney(query.data.totals[currency], currency)}</td>{months.map((month) => <td key={month}>{formatMoney(rows.reduce((sum, row) => sum + BigInt(row.months[month] || '0'), 0n).toString(), currency)}</td>)}</tr></tfoot></table></div>
    </>}
  </section>;
}
function ExpenseChart({ rows, months, currency }) {
  const [selection, setSelection] = useState(null);
  const selected = selection ?? rows.slice(0, 5).map(({ id }) => id);
  const visible = rows.filter((row) => selected.includes(row.id));
  const data = months.map((month) => ({ month, ...Object.fromEntries(visible.map((row) => [row.id, Number(row.months[month] || '0') / 100])) }));
  return <article className="ledger-report-chart"><header><h2>Динамика расходов по месяцам</h2></header><div className="ledger-chart-toggles">{rows.map((row, index) => <button key={row.id} style={{ '--series-color': colors[index % colors.length] }} aria-pressed={selected.includes(row.id)} onClick={() => setSelection(selected.includes(row.id) ? selected.filter((id) => id !== row.id) : [...selected, row.id])}>{row.title}</button>)}</div>
    <div className="ledger-chart-canvas"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 12, right: 15, left: 0, bottom: 4 }} accessibilityLayer><CartesianGrid strokeDasharray="3 3" stroke="#e1e7ee"/><XAxis dataKey="month" tick={{ fontSize: 10 }}/><YAxis width={64} tick={{ fontSize: 10 }} tickFormatter={(value) => new Intl.NumberFormat('ru-RU', { notation: 'compact' }).format(value)}/><Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="ledger-chart-tooltip"><strong>{displayLedgerMonth(`${label}-01`)}</strong>{payload.map((entry) => <div key={entry.dataKey} style={{ color: entry.color }}>{entry.name}: {formatMoney(rows.find((row) => row.id === entry.dataKey)?.months[label] || '0', currency)}</div>)}</div> : null}/>{visible.map((row) => <Line key={row.id} dataKey={row.id} name={row.title} stroke={colors[rows.indexOf(row) % colors.length]} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false}/>)}</ComposedChart></ResponsiveContainer></div>
  </article>;
}
