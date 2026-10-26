import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ledgerApi } from '../entities/ledger/api';
import { formatMoney } from '../entities/ledger/model';
import { ledgerPeriodFilters, reportMetrics, reportSeries, summarizeLedgerReport } from '../entities/ledger/flow';
import LedgerExpenseReport from './LedgerExpenseReport';
import { displayLedgerMonth } from '../entities/ledger/dates';

export default function LedgerReport({ scopeId, params, change, projects }) {
  const groupBy = ['categories', 'projects'].includes(params.get('group_by')) ? params.get('group_by') : 'accounts';
  return <><div className="ledger-tabs" aria-label="Вид отчёта">{[['accounts', 'Остатки'], ['categories', 'По категориям'], ['projects', 'По проектам']].map(([id, title]) => <button key={id} aria-pressed={groupBy === id} onClick={() => change({ group_by: id, all_time: '' })}>{title}</button>)}</div>{groupBy === 'accounts' ? <LedgerBalanceReport scopeId={scopeId} params={params} change={change}/> : <LedgerExpenseReport scopeId={scopeId} params={params} change={change} projects={projects} groupBy={groupBy}/>}</>;
}
function LedgerBalanceReport({ scopeId, params, change }) {
  const filters = ledgerPeriodFilters(params, true);
  const query = useQuery({ queryKey: ['ledger-report', scopeId, filters], queryFn: ({ signal }) => ledgerApi.report(scopeId, filters, signal) });
  const currencies = [...new Set((query.data?.accounts ?? []).map((account) => account.currency))];
  const currency = currencies.includes(params.get('currency')) ? params.get('currency') : currencies[0];
  const accounts = (query.data?.accounts ?? []).filter((account) => account.currency === currency);
  const summary = useMemo(() => summarizeLedgerReport(query.data?.months ?? [], query.data?.accounts ?? [], currency), [query.data, currency]);
  if (query.isPending) return <p>Считаю итоги…</p>;
  if (query.error) return <div className="ledger-error" role="alert">{query.error.message}<button onClick={() => query.refetch()}>Повторить</button></div>;
  if (!accounts.length) return <p className="ledger-empty">Нет счетов для отчёта. Счета с флагом «Не добавлять в отчёт» здесь не отображаются и не учитываются.</p>;
  return <section className="ledger-report">
    <div className="ledger-period-toolbar"><label>Валюта<select aria-label="Валюта итогов" value={currency} onChange={(event) => change('currency', event.target.value)}>{currencies.map((value) => <option key={value}>{value}</option>)}</select></label><small>{query.data.forecast ? 'Прогноз: проведённые и запланированные операции' : 'Проведённые операции'} по {query.data.as_of}. Валюты считаются отдельно; переводы не являются доходами или расходами.</small></div>
    {accounts.some((account) => account.balance_is_known === false) && <p className="ledger-notice">Остаток счетов с неподтверждённой начальной суммой не входит в общий остаток. Их проведённые доходы и расходы учитываются.</p>}
    <ReportChart title="Общие итоги" rows={summary} currency={currency}/>
    <div className="ledger-report-grid">{accounts.map((account) => <ReportChart key={account.id} title={`${account.title}${account.is_archived ? ' · Архив' : ''}`} rows={query.data.months.filter((row) => row.account_id === account.id)} currency={currency} color={account.color}/>)}</div>
    <div className="ledger-table-scroll"><table className="ledger-table"><caption>Итоги по месяцам · {currency}</caption><thead><tr><th>Месяц</th><th>Остаток на конец периода</th><th>Доходы</th><th>Расходы</th><th>Переводы, нетто</th><th>Проценты</th><th>Корректировки</th></tr></thead><tbody>{reportSeries(summary).map((row) => <tr key={row.month}><th>{displayLedgerMonth(`${row.month}-01`)}</th>{reportMetrics.map(([key]) => <td key={key}>{formatMoney(row[key], currency)}</td>)}</tr>)}</tbody></table></div>
  </section>;
}

function ReportChart({ title, rows, currency, color }) {
  const [visible, setVisible] = useState(['closing_minor']);
  const metrics = reportMetrics.map(([key, label, stroke]) => [key, label, key === 'closing_minor' && color ? color : stroke]);
  const series = reportSeries(rows);
  const data = series.map((row) => ({ month: row.month, exact: row, ...Object.fromEntries(metrics.map(([key]) => [key, row[key] === null ? null : Number(row[key]) / 100])) }));
  const latest = rows.at(-1);
  return <article className="ledger-report-chart"><header><h2>{title}</h2><strong>{formatMoney(latest?.closing_minor ?? null, currency)}</strong></header>
    <div className="ledger-chart-toggles">{metrics.map(([key, label, stroke]) => <button key={key} style={{ '--series-color': stroke }} aria-pressed={visible.includes(key)} onClick={() => setVisible((old) => old.includes(key) ? old.filter((value) => value !== key) : [...old, key])}>{label}</button>)}</div>
    <div className="ledger-chart-canvas"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 12, right: 15, left: 0, bottom: 4 }} accessibilityLayer>
      <CartesianGrid strokeDasharray="3 3" stroke="#e1e7ee"/><XAxis dataKey="month" tick={{ fontSize: 10 }}/><YAxis width={64} tick={{ fontSize: 10 }} tickFormatter={(value) => new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}/><ReferenceLine y={0} stroke="#9aaabd"/>
      <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="ledger-chart-tooltip"><strong>{displayLedgerMonth(`${label}-01`)}</strong>{payload.map((entry) => <div key={entry.dataKey} style={{ color: entry.color }}>{entry.name}: {formatMoney(entry.payload.exact[entry.dataKey], currency)}</div>)}</div> : null}/>
      {metrics.filter(([key]) => visible.includes(key)).map(([key, label, stroke]) => <Area key={key} dataKey={key} name={label} type="linear" stroke={stroke} fill={stroke} fillOpacity={0.07} strokeWidth={1.8} dot={{ r: 2 }} isAnimationActive={false}/>)}
    </ComposedChart></ResponsiveContainer></div>
  </article>;
}
