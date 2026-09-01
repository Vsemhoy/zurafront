import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconChartBar, IconChevronLeft, IconChevronRight, IconEdit, IconPlus, IconTargetArrow, IconTrash, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { contractorApi } from '../entities/contractor/api';
import { kpiApi } from '../entities/kpi/api';
import './KpiPage.css';
import './KpiReport.css';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const emptyKpi = { name: '', description: '', kind: 'bonus', points: 1, minimum_completed_tasks: 1, is_active: true };
const shiftMonth = (month, amount) => {
  const [year, index] = month.split('-').map(Number);
  const date = new Date(year, index - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export function KpiPage() {
  const { activeScope } = useWorkspace();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('goals');
  const [month, setMonth] = useState(currentMonth);
  const [personId, setPersonId] = useState('');
  const [editing, setEditing] = useState(null);
  const key = ['kpis', activeScope?.id, 'all'];
  const { data: kpis = [], isLoading } = useQuery({ queryKey: key, queryFn: () => kpiApi.list(activeScope.id, true), enabled: Boolean(activeScope) });
  const { data: assignable } = useQuery({ queryKey: ['contractors-assignable', activeScope?.id], queryFn: () => contractorApi.assignable(activeScope.id), enabled: Boolean(activeScope) });
  const people = assignable?.assignees ?? [];
  const activePersonId = personId || people.find((person) => person.is_current)?.id || people[0]?.id || '';
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['kpi-stats', activeScope?.id, month, activePersonId], queryFn: () => kpiApi.stats(activeScope.id, month, activePersonId), enabled: Boolean(activeScope && activePersonId && tab === 'report') });
  const { data: settings } = useQuery({ queryKey: ['kpi-settings', activeScope?.id], queryFn: () => kpiApi.settings(activeScope.id), enabled: Boolean(activeScope) });
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: key }), queryClient.invalidateQueries({ queryKey: ['kpi-stats', activeScope.id] }), queryClient.invalidateQueries({ queryKey: ['kpis', activeScope.id] })]);
  const remove = useMutation({ mutationFn: (id) => kpiApi.remove(activeScope.id, id), onSuccess: refresh });
  if (!activeScope) return <main className="kpi-state">Выберите скоуп.</main>;

  return <main className="kpi-page">
    <header className="kpi-toolbar"><div><IconTargetArrow size={21}/><h1>KPI</h1><small>{kpis.length} показателей</small></div>{tab === 'goals' && <button onClick={() => setEditing(emptyKpi)}><IconPlus size={16}/>Новый KPI</button>}</header>
    <nav className="kpi-tabs"><button className={tab === 'goals' ? 'active' : ''} onClick={() => setTab('goals')}>Цели</button><button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}>Отчёт</button></nav>
    {tab === 'goals' ? <><ScopeTargets key={JSON.stringify(settings)} scopeId={activeScope.id} settings={settings} onSaved={() => queryClient.invalidateQueries()}/><KpiCatalog kpis={kpis} loading={isLoading} remove={remove} onEdit={setEditing}/></> : <><ReportFilters people={people} personId={activePersonId} setPersonId={setPersonId} month={month} setMonth={setMonth}/><PersonReport stats={stats} loading={statsLoading}/></>}
    {editing ? <KpiEditor scopeId={activeScope.id} kpi={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }}/> : null}
  </main>;
}

function KpiCatalog({ kpis, loading, remove, onEdit }) {
  return <section className="kpi-catalog"><header><h2>Показатели скоупа</h2><span>Назначаются задаче только вручную</span></header>{loading ? <p>Загружаю KPI…</p> : <div className="kpi-table"><div className="kpi-table-head"><span>KPI</span><span>Тип</span><span>Баллы</span><span>Задач для зачёта</span><span>Выполнено всего</span><span/></div>{kpis.map((kpi) => <div className={!kpi.is_active ? 'inactive' : ''} key={kpi.id}><span><strong>{kpi.name}</strong><small>{kpi.description || 'Без описания'}</small></span><span><i className={`kpi-kind kpi-kind--${kpi.kind}`}>{kpi.kind === 'bonus' ? 'Премия' : 'Оклад'}</i></span><b>{kpi.points}</b><b>{kpi.minimum_completed_tasks}</b><b>{kpi.completed_tasks_count ?? 0} / {kpi.tasks_count ?? 0}</b><span className="kpi-row-actions"><button title="Редактировать" onClick={() => onEdit(kpi)}><IconEdit size={15}/></button><button title="Удалить" onClick={() => window.confirm(`Удалить KPI «${kpi.name}»? Старые задачи сохранят ID в истории.`) && remove.mutate(kpi.id)}><IconTrash size={15}/></button></span></div>)}</div>}</section>;
}

function ReportFilters({ people, personId, setPersonId, month, setMonth }) {
  return <section className="kpi-report-filters"><label>Сотрудник<select value={personId} onChange={(event) => setPersonId(event.target.value)}><option value="">Выберите человека</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}{person.position ? ` · ${person.position}` : ''}</option>)}</select></label><div className="kpi-month"><button title="Предыдущий месяц" onClick={() => setMonth(shiftMonth(month, -1))}><IconChevronLeft size={17}/></button><label>Отчётный месяц<input type="month" value={month} onChange={(event) => setMonth(event.target.value)}/></label><button title="Следующий месяц" onClick={() => setMonth(shiftMonth(month, 1))}><IconChevronRight size={17}/></button></div></section>;
}

function PersonReport({ stats, loading }) {
  const person = stats?.people?.[0];
  if (loading) return <section className="kpi-report-state">Считаю выполненные задачи…</section>;
  if (!person) return <section className="kpi-report-state">Выберите сотрудника для отчёта.</section>;
  return <section className="kpi-report"><header><div className="kpi-person-avatar">{person.user.name.slice(0, 2).toUpperCase()}</div><span><h2>{person.user.name}</h2><small>{person.user.position || person.user.type}</small></span><div><b>{person.salary_points} / {person.salary_target}</b><small>оклад · {person.salary_progress}%</small></div><div><b>{person.bonus_points} бал. → {person.payable_bonus_percent}%</b><small>премия, цель {person.bonus_target}</small></div></header>{!person.areas.length ? <p>За этот месяц нет выполненных задач, привязанных к KPI.</p> : <div className="kpi-report-areas">{person.areas.map((area) => <article key={area.id}><header><span><i className={`kpi-kind kpi-kind--${area.kind}`}>{area.kind === 'bonus' ? 'Премия' : 'Оклад'}</i><strong>{area.name}</strong></span><span><small>{area.completed_tasks} / {area.minimum_completed_tasks} задач</small><b>{area.qualified ? `+${area.awarded_points}` : 'порог не достигнут'}</b></span></header><div>{area.tasks.map((task) => <a key={task.id} href={`/tasks/${task.id}/edit`}><code>{task.task_key}</code><span><strong>{task.title}</strong><small>{task.project ? `${task.project.key} · ${task.project.title}` : 'Без проекта'}</small></span><time>{new Date(task.completed_at).toLocaleDateString('ru-RU')}</time></a>)}</div></article>)}</div>}</section>;
}

function ScopeTargets({ scopeId, settings, onSaved }) {
  const [form, setForm] = useState(settings ?? { salary_target_points: 100, bonus_target_points: 75, bonus_cap_percent: 75 });
  const save = useMutation({ mutationFn: () => kpiApi.updateSettings(scopeId, form), onSuccess: onSaved });
  const field = (key) => (event) => setForm((current) => ({ ...current, [key]: Number(event.target.value) }));
  return <section className="kpi-targets"><header><IconChartBar size={18}/><div><h2>Цели скоупа</h2><small>Общие правила расчёта для всех людей</small></div></header><label>Цель по окладу<input type="number" min="1" max="1000" value={form.salary_target_points} onChange={field('salary_target_points')}/><span>баллов</span></label><label>Цель по премии<input type="number" min="1" max="1000" value={form.bonus_target_points} onChange={field('bonus_target_points')}/><span>баллов</span></label><label>Потолок премии<input type="number" min="0" max="100" value={form.bonus_cap_percent} onChange={field('bonus_cap_percent')}/><span>% оклада</span></label><button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Сохраняю…' : 'Сохранить цели'}</button>{save.error && <p>{save.error.message}</p>}</section>;
}

function KpiEditor({ scopeId, kpi, onClose, onSaved }) {
  const isNew = !kpi.id; const [form, setForm] = useState(kpi); const save = useMutation({ mutationFn: () => isNew ? kpiApi.create(scopeId, form) : kpiApi.update(scopeId, kpi.id, form), onSuccess: onSaved });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'number' ? Number(event.target.value) : event.target.value }));
  return <div className="kpi-backdrop" onMouseDown={onClose}><form className="kpi-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><header><div><strong>{isNew ? 'Новый KPI' : 'Редактирование KPI'}</strong><small>Одна строка — один измеримый показатель</small></div><button type="button" onClick={onClose}><IconX size={18}/></button></header><label>Название<input autoFocus required value={form.name} onChange={set('name')} placeholder="Закрытие обращений пользователей"/></label><label>Что входит в KPI<textarea rows="4" value={form.description ?? ''} onChange={set('description')} placeholder="Свободное текстовое описание работ"/></label><div className="kpi-form-row"><label>Тип<select value={form.kind} onChange={set('kind')}><option value="salary">Окладный</option><option value="bonus">Премиальный</option></select></label><label>Баллы<input type="number" min="0" max="1000" value={form.points} onChange={set('points')}/></label><label>Задач для зачёта<input type="number" min="1" max="1000" value={form.minimum_completed_tasks} onChange={set('minimum_completed_tasks')}/></label></div><label className="kpi-active"><input type="checkbox" checked={form.is_active} onChange={set('is_active')}/>KPI активен и доступен для новых задач</label>{save.error && <p className="kpi-error">{save.error.message}</p>}<footer><button type="button" onClick={onClose}>Отмена</button><button className="primary" disabled={save.isPending}>{save.isPending ? 'Сохраняю…' : 'Сохранить KPI'}</button></footer></form></div>;
}
