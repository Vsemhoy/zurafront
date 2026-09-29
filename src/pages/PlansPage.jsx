import { Fragment, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { IconEdit, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { planApi } from '../entities/plan/api';
import './PlansPage.css';

const priorities = { 1: 'Низкая', 2: 'Обычная', 3: 'Важная', 4: 'Очень важная', 5: 'Критическая' };
const monthNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthLabel = (value) => new Date(`${value}-01T12:00:00`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
const duration = (value) => value == null ? '—' : `${Math.round(value / 60 * 100) / 100} ч`;

export function PlansPage() {
  const { activeScope } = useWorkspace();
  return activeScope ? <Plans key={activeScope.id} scope={activeScope}/> : <main>Выберите скоуп.</main>;
}

function Plans({ scope }) {
  const client = useQueryClient();
  const [filters, setFilters] = useState({ year: new Date().getFullYear(), month: '', assignee_id: '', project_id: '', status: '', q: '', page: 1 });
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  useEffect(() => { const timer = setTimeout(() => setFilters((old) => ({ ...old, q: search, page: 1 })), 250); return () => clearTimeout(timer); }, [search]);
  const options = useQuery({ queryKey: ['plan-options', scope.id], queryFn: () => planApi.options(scope.id) });
  const list = useQuery({ queryKey: ['plans', scope.id, filters], queryFn: () => planApi.list(scope.id, filters) });
  const refresh = () => { client.invalidateQueries({ queryKey: ['plans', scope.id] }); client.invalidateQueries({ queryKey: ['monthly-report', scope.id] }); };
  const complete = useMutation({ mutationFn: ({ id, completed }) => planApi.save(scope.id, id, { completed }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id) => planApi.remove(scope.id, id), onSuccess: refresh });
  const set = (key) => (event) => setFilters({ ...filters, [key]: event.target.value, page: 1, ...(key === 'year' ? { month: '' } : {}) });
  const items = list.data?.items ?? [];
  return <main className="plans-page">
    <header className="plans-heading"><div><small>{scope.name} · планирование результатов</small><h1>Planner</h1></div><Link to="/planner">Календарь</Link><button className="plans-primary" onClick={() => setEditing({ month: filters.month || (Number(filters.year) === new Date().getFullYear() ? monthNow() : `${filters.year}-01`), project_id: filters.project_id, assignee_id: filters.assignee_id })}><IconPlus size={16}/>Новая плановая единица</button></header>
    <div className="plans-filters">
      <label>Год<input type="number" min="2000" max="2099" value={filters.year} onChange={set('year')}/></label>
      <label>Месяц<select value={filters.month} onChange={set('month')}><option value="">Весь год</option>{Array.from({ length: 12 }, (_, i) => `${filters.year}-${String(i + 1).padStart(2, '0')}`).map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label>
      <label>Проект<select value={filters.project_id} onChange={set('project_id')}><option value="">Все проекты</option>{options.data?.projects.map((p) => <option key={p.id} value={p.id}>{p.key} · {p.title}</option>)}</select></label>
      <label>Исполнитель<select value={filters.assignee_id} onChange={set('assignee_id')}><option value="">Все</option>{options.data?.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Выполнение<select value={filters.status} onChange={set('status')}><option value="">Все</option><option value="open">Не выполнено</option><option value="done">Выполнено</option></select></label>
      <label>Поиск<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Название плана"/></label>
    </div>
    <p className="plans-note">Выполнено {list.data?.done ?? 0} из {list.data?.total ?? 0}. Галочка завершает план, но не меняет задачи и календарь. Проекты вне отчётности здесь тоже видны.</p>
    {(list.error || options.error || complete.error || remove.error) && <p role="alert" className="plans-error">{list.error?.message || options.error?.message || complete.error?.message || remove.error?.message}</p>}
    {list.isPending ? <p>Загружаю план…</p> : <div className="plans-scroll"><table className="plans-table"><thead><tr><th>Готово</th><th>План / результат</th><th>Проект</th><th>Исполнитель</th><th>Задачи</th><th>Оценка / диапазон</th><th>Важность</th><th/></tr></thead><tbody>
      {items.map((item, index) => <Fragment key={item.id}>
        {(index === 0 || items[index - 1].month !== item.month) && <tr className="plans-month-row"><th colSpan={8}>{monthLabel(item.month)}</th></tr>}
        <tr className={item.completed_at ? 'plans-done' : ''}>
          <td><input type="checkbox" aria-label={`Выполнено: ${item.title}`} checked={Boolean(item.completed_at)} disabled={complete.isPending} onChange={(event) => complete.mutate({ id: item.id, completed: event.target.checked })}/></td>
          <td><button className="plans-title" onClick={() => setEditing(item)}>{item.title}</button><p>{item.expected_result || 'Ожидаемый результат не указан'}</p><details><summary>Описание, ресурсы и эффект</summary>{[['Описание', item.description], ['Ресурсы', item.resources], ['Положительный эффект', item.impact], ['Фактический результат', item.actual_result]].map(([label, value]) => value && <p key={label}><b>{label}:</b> {value}</p>)}{item.completed_at && <p>Завершил {item.completer?.name || '—'} · {new Date(item.completed_at).toLocaleString('ru-RU')}</p>}</details></td>
          <td>{item.project?.key || 'Без проекта'}{item.project?.include_in_reports === false && <small>Вне отчётности</small>}</td>
          <td>{item.assignee?.name || 'Не назначен'}</td>
          <td><details><summary>{item.completed_tasks_count} / {item.tasks_count}</summary>{item.tasks.map((task) => <Link key={task.id} to={`/tasks/${task.id}/edit`}>{task.status === 'done' ? '✓ ' : ''}{task.task_key || 'Задача'} · {task.title}</Link>)}</details></td>
          <td>{duration(item.estimated_minutes)}<small>{[item.starts_on, item.ends_on].filter(Boolean).join(' — ') || 'Без точных дат'}</small></td>
          <td>{priorities[item.priority]}</td>
          <td><div className="plans-actions"><button title="Редактировать" onClick={() => setEditing(item)}><IconEdit size={16}/></button><button title="Удалить план, сохранив задачи" disabled={remove.isPending} onClick={() => window.confirm('Удалить плановую единицу? Связанные задачи останутся.') && remove.mutate(item.id)}><IconTrash size={16}/></button></div></td>
        </tr>
      </Fragment>)}
    </tbody></table>{!items.length && <p>На этот период планов нет.</p>}</div>}
    <footer className="plans-pager"><button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Назад</button><span>{filters.page} / {list.data?.last_page ?? 1}</span><button disabled={filters.page >= (list.data?.last_page ?? 1)} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Далее</button></footer>
    {editing && <PlanEditor key={editing.id || 'new'} scopeId={scope.id} item={editing} options={options.data} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }}/>}
  </main>;
}

function PlanEditor({ scopeId, item, options, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', resources: '', expected_result: '', impact: '', actual_result: '', priority: 2, starts_on: '', ends_on: '', ...item, completed: Boolean(item.completed_at), hours: item.estimated_minutes == null ? '' : item.estimated_minutes / 60 });
  const [tasks, setTasks] = useState(item.tasks ?? []);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { const timer = setTimeout(() => { setTerm(search); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { const key = (event) => { if (event.key === 'Escape') onClose(); }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, [onClose]);
  const candidates = useQuery({ queryKey: ['plan-candidates', scopeId, form.project_id, term, page], queryFn: () => planApi.candidates(scopeId, { project_id: form.project_id || '', q: term, page }) });
  const save = useMutation({ mutationFn: () => planApi.save(scopeId, item.id, Object.fromEntries(Object.entries({
    ...form, project_id: form.project_id || null, assignee_id: form.assignee_id || null,
    starts_on: form.starts_on || null, ends_on: form.ends_on || null, estimated_minutes: form.hours === '' ? null : Math.round(Number(form.hours) * 60),
    priority: Number(form.priority), task_ids: tasks.map((task) => task.id),
  }).filter(([key]) => ['title', 'description', 'resources', 'expected_result', 'impact', 'actual_result', 'priority', 'month', 'starts_on', 'ends_on', 'project_id', 'assignee_id', 'estimated_minutes', 'task_ids', 'completed'].includes(key)))), onSuccess: onSaved });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const changeProject = (event) => { if (tasks.length && !window.confirm('Сменить проект и убрать связи с прежними задачами? Сами задачи сохранятся.')) return; setForm({ ...form, project_id: event.target.value }); setTasks([]); setPage(1); };
  return <div className="plans-backdrop"><form role="dialog" aria-modal="true" aria-label="Редактор плановой единицы" className="plans-editor" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><header><h2>{item.id ? 'Плановая единица' : 'Новая плановая единица'}</h2><button type="button" aria-label="Закрыть" onClick={onClose}><IconX size={18}/></button></header>
    <label>Название<input autoFocus required maxLength={255} value={form.title} onChange={set('title')}/></label>
    <div className="plans-editor-grid">
      <label>Месяц<input required type="month" min="2000-01" max="2099-12" value={form.month} onChange={set('month')}/></label>
      <label>Проект<select value={form.project_id || ''} onChange={changeProject}><option value="">Без проекта</option>{options?.projects.map((p) => <option key={p.id} value={p.id}>{p.key} · {p.title}</option>)}</select></label>
      <label>Исполнитель<select value={form.assignee_id || ''} onChange={set('assignee_id')}><option value="">Не назначен</option>{form.assignee_id && !options?.people.some((person) => person.id === form.assignee_id) && <option value={form.assignee_id} disabled>{form.assignee?.name ?? "Прежний исполнитель"} · недоступен</option>}{options?.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Важность<select value={form.priority} onChange={set('priority')}>{Object.entries(priorities).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Планируемое время, ч<input type="number" min="0" max="8760" step="any" value={form.hours} onChange={set('hours')}/></label>
      <label>Диапазон дат (необязательно)<span className="plans-dates"><input aria-label="Начало" type="date" value={form.starts_on || ''} onChange={set('starts_on')}/><input aria-label="Окончание" type="date" value={form.ends_on || ''} min={form.starts_on || undefined} onChange={set('ends_on')}/></span></label>
    </div>
    {[['description', 'Описание'], ['resources', 'Ресурсы: люди, доступы, оборудование, бюджет'], ['expected_result', 'Ожидаемый результат'], ['impact', 'Положительный эффект / влияние'], ['actual_result', 'Фактический результат']].map(([key, label]) => <label key={key}>{label}<textarea rows={2} maxLength={key === 'description' ? 20000 : 10000} value={form[key] || ''} onChange={set(key)}/></label>)}
    <details className="plans-task-linker"><summary>Связанные задачи: {tasks.length}</summary>
      <div className="plans-selected-tasks">{tasks.map((task) => <button type="button" key={task.id} onClick={() => setTasks(tasks.filter((t) => t.id !== task.id))}>{task.task_key} · {task.title}<IconX size={14}/></button>)}</div>
      <input aria-label="Найти задачу" placeholder="Найти задачу в этом проекте" value={search} onChange={(event) => setSearch(event.target.value)}/>
      <div className="plans-candidates">{candidates.isPending ? 'Загружаю…' : candidates.data?.data?.map((task) => <button type="button" key={task.id} disabled={tasks.some((t) => t.id === task.id)} onClick={() => setTasks([...tasks, task])}>{task.task_key} · {task.title}{task.status === 'done' ? ' ✓' : ''}</button>)}</div>
      <div className="plans-pager"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Назад</button><span>{page} / {candidates.data?.meta?.last_page ?? 1}</span><button type="button" disabled={page >= (candidates.data?.meta?.last_page ?? 1)} onClick={() => setPage(page + 1)}>Далее</button></div>
    </details>
    <label className="plans-checkbox"><input type="checkbox" checked={form.completed} onChange={(event) => setForm({ ...form, completed: event.target.checked })}/>Выполнено — независимо от статусов задач</label>
    {(save.error || candidates.error) && <p role="alert" className="plans-error">{save.error?.message || candidates.error?.message}</p>}
    <footer><button type="button" onClick={onClose}>Отмена</button><button className="plans-primary" disabled={save.isPending}>{save.isPending ? 'Сохраняю…' : 'Сохранить'}</button></footer>
  </form></div>;
}
