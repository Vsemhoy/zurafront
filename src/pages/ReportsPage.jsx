import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { IconChevronLeft, IconChevronRight, IconDownload, IconEdit, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { reportApi } from '../entities/report/api';
import { AnnualPlanTable } from '../shared/ui/AnnualPlanTable';
import './ReportsPage.css';

const localMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const shiftMonth = (month, offset) => {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(year, value - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const statusLabels = { todo: 'К выполнению', scheduled: 'Запланировано', in_progress: 'В работе', blocked: 'Заблокировано', review: 'На проверке', done: 'Готово', cancelled: 'Удалено' };
const tabs = [['summary', 'Сводка'], ['kpis', 'Зачтённые KPI'], ['completed', 'Выполнено'], ['plan', 'План-факт'], ['archive', 'Архив']];
const dateLabel = (value, timezone) => value ? new Date(value).toLocaleString('ru-RU', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short' }) : '—';

export function ReportsPage() {
  const { activeScope } = useWorkspace();
  return activeScope ? <MonthlyReports key={activeScope.id} scope={activeScope}/> : <main className="reports-page">Выберите скоуп.</main>;
}

function MonthlyReports({ scope }) {
  const client = useQueryClient();
  const [month, setMonth] = useState(localMonth);
  const [userId, setUserId] = useState('');
  const [planYear, setPlanYear] = useState(new Date().getFullYear());
  const [tab, setTab] = useState('summary');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [downloadError, setDownloadError] = useState('');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const filters = { month, timezone, plan_year: planYear, ...(userId ? { user_id: userId } : {}) };
  const query = useQuery({ queryKey: ['monthly-report', scope.id, filters], queryFn: () => reportApi.get(scope.id, filters) });
  const archives = useQuery({ queryKey: ['monthly-report-archives', scope.id, month, page], queryFn: () => reportApi.archives(scope.id, { month, timezone }, page), enabled: tab === 'archive' });
  const refresh = () => { client.invalidateQueries({ queryKey: ['monthly-report', scope.id] }); ['planner', 'tasks', 'task', 'kpi-stats'].forEach((key) => client.invalidateQueries({ queryKey: [key, scope.id] })); };
  const download = async (report) => {
    setDownloadError('');
    try { await reportApi.download(scope.id, report); } catch (error) { setDownloadError(error.message); }
  };
  const exportReport = useMutation({
    mutationFn: () => reportApi.save(scope.id, filters),
    onSuccess: async (report) => {
      client.invalidateQueries({ queryKey: ['monthly-report-archives', scope.id] });
      await download(report);
    },
  });
  const removePlan = useMutation({ mutationFn: (id) => reportApi.deletePlan(scope.id, id), onSuccess: refresh });
  const data = query.data;
  const changeMonth = (value) => { if (/^20\d{2}-(0[1-9]|1[0-2])$/.test(value)) { setMonth(value); setPage(1); } };

  return <main className="reports-page">
    <header className="reports-heading"><div><small>{scope.name}</small><h1>Reporter</h1></div><button className="reports-primary" disabled={!data || query.isFetching || exportReport.isPending} onClick={() => exportReport.mutate()}><IconDownload size={17}/>{exportReport.isPending ? 'Формирую…' : 'Сохранить Excel'}</button></header>
    <section className="reports-filters">
      <div className="reports-month"><button aria-label="Предыдущий месяц" onClick={() => changeMonth(shiftMonth(month, -1))}><IconChevronLeft size={17}/></button><label>Отчётный месяц<input type="month" min="2000-01" max="2099-12" value={month} onChange={(event) => changeMonth(event.target.value)}/></label><button aria-label="Следующий месяц" onClick={() => changeMonth(shiftMonth(month, 1))}><IconChevronRight size={17}/></button></div>
      <label>Исполнитель<select value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Все</option>{(data?.people ?? []).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      <span>Завершение задач по времени {timezone}.<br/>Excel сохраняет снимок всех четырёх листов.</span>
    </section>
    <nav className="reports-tabs">{tabs.map(([key, title]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{title}{key === 'plan' ? ` · ${planYear}` : ''}</button>)}</nav>
    {(query.error || exportReport.error || removePlan.error || downloadError) && <p role="alert" className="reports-error">{downloadError || query.error?.message || exportReport.error?.message || removePlan.error?.message}</p>}
    {query.isPending && <p>Собираю отчёт…</p>}
    {data && <>
      {tab === 'summary' && <><p className="reports-note">Премия: 1 балл = 1%, максимум {data.bonus_cap_percent}%. KPI засчитывается один раз за месяц после достижения порога. Остаток баллов не переносится. Только доступные вам проекты.</p><ReportTable headers={['Исполнитель', 'Выполнено', 'Зачтено KPI', 'Баллы', 'Премия']} empty={!data.summary.length}>{data.summary.map((row) => <tr key={row.user_id ?? 'none'}><td>{row.name}</td><td>{row.completed_tasks}</td><td>{row.qualified_kpis}</td><td>{row.bonus_points}</td><td>{row.bonus_percent}%</td></tr>)}</ReportTable></>}
      {tab === 'kpis' && <div className="reports-kpis">{!data.kpis.length && <p className="reports-empty">За этот месяц нет достигнутых премиальных KPI.</p>}{data.kpis.map((kpi) => <section key={`${kpi.user_id}:${kpi.kpi_id}`}><header><div><small>{kpi.user_name}</small><h2>{kpi.name}</h2></div><span>{kpi.completed_tasks} / {kpi.minimum_completed_tasks} задач · <b>+{kpi.points} баллов</b></span></header><ReportTable headers={['Код', 'Задача', 'Проект', 'Завершено']}>{kpi.tasks.map((task) => <tr key={task.id}><td><TaskLink task={task}/></td><td>{task.title}</td><td>{task.project_name}</td><td>{dateLabel(task.completed_at, timezone)}</td></tr>)}</ReportTable></section>)}</div>}
      {tab === 'completed' && <><p className="reports-note">{data.completed.length} завершённых задач. Включая задачи без KPI и без исполнителя.</p><ReportTable headers={['Код', 'Задача', 'Проект', 'Исполнитель', 'Заказчик', 'Завершено', 'Плановая', 'Результат']} empty={!data.completed.length}>{data.completed.map((task) => <tr key={task.id}><td><TaskLink task={task}/></td><td>{task.title}</td><td>{task.project_name}</td><td>{task.assignee_name}</td><td>{task.customer_name || '—'}</td><td>{dateLabel(task.completed_at, timezone)}</td><td>{task.planned ? 'Да' : 'Нет'}</td><td>{task.result ? <details><summary>Показать</summary><div className="reports-result">{task.result}</div></details> : '—'}</td></tr>)}</ReportTable></>}
      {tab === 'plan' && <><div className="reports-plan-header"><label>Год плана <input type="number" min="2000" max="2099" value={planYear} onChange={(event) => { const year = Number(event.target.value); if (year >= 2000 && year <= 2099) setPlanYear(year); }}/></label><Link to="/plans">Открыть Planner</Link></div><p className="reports-note">План-факт за год. Отметка выполнения плана независима от статусов его задач. Исключённые из отчётности проекты не показаны.</p><AnnualPlanTable items={data.plan_items}/><details><summary>Ранее созданный помесячный план задач · {data.plan_month}</summary><div className="reports-plan-header"><p>Работы на {data.plan_month}. Для добавления нужна дата в календаре в пределах месяца плана. Незавершённые задачи добавляются вручную.</p><button onClick={() => setEditing({ month: data.plan_month, assignee_id: userId, expected_result: '' })}><IconPlus size={16}/>Добавить работу</button></div><ReportTable headers={['Код', 'Задача', 'Плановый исполнитель', 'Ожидаемый результат', 'Статус / блокер', '']} empty={!data.plan.length}>{data.plan.map((plan) => <tr key={plan.id}><td><TaskLink task={plan.task}/></td><td>{plan.task.title}<small className="reports-muted">{plan.task.project_name}</small></td><td>{plan.assignee_name}</td><td className="reports-result">{plan.expected_result || '—'}</td><td>{statusLabels[plan.task.status]}{plan.blockers.map((blocker, index) => <p className="reports-blocker" key={index}>{blocker.reason}{blocker.resolution_required && <small>Нужно: {blocker.resolution_required}</small>}</p>)}</td><td><div className="reports-actions"><button title="Редактировать план" onClick={() => setEditing(plan)}><IconEdit size={16}/></button><button title="Убрать из плана, сохранив задачу" disabled={removePlan.isPending} onClick={() => window.confirm('Убрать работу из этого месячного плана? Сама задача сохранится.') && removePlan.mutate(plan.id)}><IconTrash size={16}/></button></div></td></tr>)}</ReportTable></details></>}
    </>}
    {tab === 'archive' && <section><p className="reports-note">Мои сохранённые отчёты за {month}. Файлы не пересчитываются. Скачивание доступно, пока сохраняются права на их проекты.</p>{archives.error && <p className="reports-error">{archives.error.message}</p>}{archives.isPending ? <p>Загружаю архив…</p> : <ReportTable headers={['Создан', 'Сотрудник', 'Размер', '']} empty={!archives.data?.data?.length}>{archives.data?.data?.map((report) => <tr key={report.id}><td>{dateLabel(report.created_at, timezone)}</td><td>{report.person_name || 'Все'}</td><td>{Math.ceil(report.size_bytes / 1024)} КБ</td><td><button onClick={() => download(report)}><IconDownload size={16}/>Excel</button></td></tr>)}</ReportTable>}<div className="reports-pager"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Назад</button><span>{page} / {archives.data?.meta?.last_page ?? 1}</span><button disabled={page >= (archives.data?.meta?.last_page ?? 1)} onClick={() => setPage(page + 1)}>Далее</button></div></section>}
    {editing && <PlanEditor scopeId={scope.id} plan={editing} people={data?.people ?? []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }}/>}
  </main>;
}

function TaskLink({ task }) { return <Link to={`/tasks/${task.id}/edit`}>{task.task_key || 'Открыть'}</Link>; }
function ReportTable({ headers, children, empty = false }) {
  return empty ? <p className="reports-empty">Пока нет записей.</p> : <div className="reports-table-scroll"><table className="reports-table"><thead><tr>{headers.map((header, index) => <th key={index}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function PlanEditor({ scopeId, plan, people, onClose, onSaved }) {
  const [form, setForm] = useState({ planned_on: plan.task?.due_at?.slice(0, 7) === plan.month ? plan.task.due_at.slice(0, 10) : '', month: plan.month, task_id: plan.task?.id ?? '', assignee_id: plan.assignee_id ?? '', expected_result: plan.expected_result ?? '' });
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { const timer = setTimeout(() => { setTerm(search); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const candidates = useQuery({ queryKey: ['report-plan-candidates', scopeId, term, page], queryFn: () => reportApi.candidates(scopeId, term, page), enabled: !plan.id });
  const save = useMutation({ mutationFn: () => reportApi.savePlan(scopeId, { ...form, assignee_id: form.assignee_id || null }), onSuccess: onSaved });
  return <div className="reports-backdrop" onMouseDown={onClose}><form className="reports-plan-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><header><h2>Работа на {form.month}</h2><button type="button" aria-label="Закрыть" onClick={onClose}><IconX size={18}/></button></header>
    {plan.id ? <p>{plan.task.task_key} · {plan.task.title}</p> : <><label>Найти незавершённую задачу<input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Код или название"/></label><div className="reports-candidates">{candidates.isPending ? <p>Загружаю…</p> : candidates.data?.data?.map((task) => <button type="button" key={task.id} className={form.task_id === task.id ? 'active' : ''} onClick={() => setForm({ ...form, task_id: task.id, planned_on: task.due_at?.slice(0, 7) === form.month ? task.due_at.slice(0, 10) : '', assignee_id: form.assignee_id || task.assignee_id || '' })}><b>{task.task_key}</b><span>{task.title}<small>{task.project?.title ?? 'Без проекта'}</small></span></button>)}{candidates.data?.data?.length === 0 && <p>Задачи не найдены.</p>}</div><div className="reports-pager"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Назад</button><span>{page} / {candidates.data?.meta?.last_page ?? 1}</span><button type="button" disabled={page >= (candidates.data?.meta?.last_page ?? 1)} onClick={() => setPage(page + 1)}>Далее</button></div></>}
    <label>Дата в календаре<input required type="date" min={form.month + "-01"} max={form.month + "-" + new Date(Number(form.month.slice(0, 4)), Number(form.month.slice(5, 7)), 0).getDate()} value={form.planned_on} onChange={(event) => setForm({ ...form, planned_on: event.target.value })}/></label>
    <label>Плановый исполнитель<select value={form.assignee_id} onChange={(event) => setForm({ ...form, assignee_id: event.target.value })}><option value="">Не назначен</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
    <label>Что получим за этот месяц<textarea rows={4} maxLength={10000} value={form.expected_result} onChange={(event) => setForm({ ...form, expected_result: event.target.value })} placeholder="Ожидаемый результат или этап работ"/></label>
    {(save.error || candidates.error) && <p className="reports-error">{save.error?.message || candidates.error?.message}</p>}<footer><button type="button" onClick={onClose}>Отмена</button><button className="reports-primary" disabled={!form.task_id || save.isPending}>{save.isPending ? 'Сохраняю…' : 'Сохранить'}</button></footer>
  </form></div>;
}
