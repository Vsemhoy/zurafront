/* oxlint-disable react/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft, IconArrowRight, IconBolt, IconCalendarPlus, IconChevronDown, IconFilter, IconLayersSelected, IconPlus, IconRefresh, IconX } from '@tabler/icons-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { plannerApi } from '../entities/planner/api';
import { contractorApi } from '../entities/contractor/api';
import { projectApi } from '../entities/project/api';
import { taskApi } from '../entities/task/api';
import { priorityLabel, taskReference } from '../entities/task/model';
import { taskStatuses, taskStatusMap } from '../entities/task/statuses';
import './PlannerPage.css';

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(date, amount) { const next = new Date(date); next.setDate(next.getDate() + amount); return next; }
function startMonday(date) { const next = new Date(date); const day = next.getDay() || 7; next.setDate(next.getDate() - day + 1); next.setHours(0, 0, 0, 0); return next; }
function endSunday(date) { return addDays(startMonday(date), 6); }
function rangeDays(from, to) { const days = []; for (let day = new Date(from); day <= to; day = addDays(day, 1)) days.push(day); return days; }

function period(anchor, mode) {
    if (mode === 'quarter') {
        const firstMonth = Math.floor(anchor.getMonth() / 3) * 3;
        const rawFrom = new Date(anchor.getFullYear(), firstMonth, 1);
        const rawTo = new Date(anchor.getFullYear(), firstMonth + 3, 0);
        return { from: startMonday(rawFrom), to: endSunday(rawTo), title: `${Math.floor(firstMonth / 3) + 1} квартал ${anchor.getFullYear()}` };
    }
    const rawFrom = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const rawTo = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { from: startMonday(rawFrom), to: endSunday(rawTo), title: `${monthNames[anchor.getMonth()]} ${anchor.getFullYear()}` };
}

function MultiFilter({ label, items, selected, onChange, open, onToggle }) {
    return <details className="planner-filter" open={open}><summary onClick={(event) => { event.preventDefault(); onToggle(); }}><IconFilter size={14}/><span>{selected.length ? `${label}: ${selected.length}` : label}</span><IconChevronDown size={14}/></summary><div className="planner-filter__menu"><button type="button" onClick={() => onChange([])}>Сбросить</button>{items.map((item) => <label key={item.value}><input type="checkbox" checked={selected.includes(item.value)} onChange={() => onChange(selected.includes(item.value) ? selected.filter((value) => value !== item.value) : [...selected, item.value])}/><i style={{ background: item.color }}/><span>{item.label}</span></label>)}</div></details>;
}

function QuickCreate({ date, task, projects, assignees, defaults, onClose, onSave, onOpenFull, pending, error }) {
    const [form, setForm] = useState({ title: task?.title ?? '', description: task?.description ?? '', project_id: task?.project_id ?? defaults.projectId ?? '', assignee_id: task?.assignee_id ?? defaults.assigneeId ?? '', status: task?.status ?? (defaults.status === 'blocked' ? 'scheduled' : defaults.status) ?? 'scheduled', priority: task?.priority ?? 2 });
    return <div className="planner-modal-backdrop" onMouseDown={onClose}><form className="planner-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onSave({ ...form, project_id: form.project_id || null, assignee_id: form.assignee_id || null, priority: Number(form.priority), due_at: `${date} 12:00:00` }); }}><header><div><small>{task ? taskReference(task) : 'Быстрое планирование'}</small><h2>{Number(date.slice(8))} {monthNames[Number(date.slice(5, 7)) - 1]}</h2></div><button type="button" onClick={onClose}><IconX size={18}/></button></header><label>Задача<input autoFocus required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Что должно быть сделано?"/></label><label>Описание<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Короткое текстовое описание"/></label><div className="planner-modal__grid"><label>Проект<select value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })}><option value="">Без проекта</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label>Исполнитель<select value={form.assignee_id} onChange={(event) => setForm({ ...form, assignee_id: event.target.value })}><option value="">Не назначен</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label>Статус<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{taskStatuses.filter((status) => status.value !== 'blocked' || task?.status === 'blocked').map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label>Приоритет<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{[1, 2, 3, 4, 5].map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}</select></label></div>{error && <p className="planner-error">{error.message}</p>}<footer>{task && <button type="button" onClick={onOpenFull}>Полный редактор</button>}<button type="button" onClick={onClose}>Отмена</button><button className="planner-primary" disabled={pending}><IconPlus size={16}/>{pending ? 'Сохраняю…' : task ? 'Сохранить' : 'Создать'}</button></footer></form></div>;
}

function BulkTools({ selectedCount, projects, assignees, onClose, onApply, pending, error }) {
    const [form, setForm] = useState({ project_id: '', assignee_id: '', status: '', priority: '', description: '', checklist_item: '', relation_task_key: '', relation: 'related' });
    const submit = (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
        if (payload.priority) payload.priority = Number(payload.priority);
        onApply(payload);
    };
    return <aside className="planner-bulk"><header><div><small>Массовая обработка</small><strong>{selectedCount} задач</strong></div><button onClick={onClose}><IconX size={17}/></button></header><form onSubmit={submit}><label>Исполнитель<select value={form.assignee_id} onChange={(event) => setForm({ ...form, assignee_id: event.target.value })}><option value="">Не менять</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label>Статус<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="">Не менять</option>{taskStatuses.filter((status) => status.value !== 'blocked').map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label>Проект<select value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })}><option value="">Не менять</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label>Приоритет<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="">Не менять</option>{[1, 2, 3, 4, 5].map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}</select></label><label>Общее описание<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Обычный текст, заменит описание"/></label><label>Добавить пункт чек-листа<input value={form.checklist_item} onChange={(event) => setForm({ ...form, checklist_item: event.target.value })} placeholder="Один общий пункт"/></label><fieldset><legend>Связать с задачей</legend><input value={form.relation_task_key} onChange={(event) => setForm({ ...form, relation_task_key: event.target.value.toUpperCase() })} placeholder="ADM-154"/><select value={form.relation} onChange={(event) => setForm({ ...form, relation: event.target.value })}><option value="related">Связана</option><option value="duplicate">Дубликат</option><option value="blocks">Блокирует</option><option value="blocked_by">Заблокирована</option></select></fieldset>{error && <p className="planner-error">{error.message}</p>}<button className="planner-primary" disabled={!selectedCount || pending}><IconBolt size={16}/>{pending ? 'Применяю…' : 'Применить ко всем'}</button></form></aside>;
}

export function PlannerPage() {
    const { activeScope } = useOutletContext();
    const scopeId = activeScope?.id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const gridRef = useRef(null);
    const [mode, setMode] = useState('month');
    const [anchor, setAnchor] = useState(() => new Date());
    const [projectIds, setProjectIds] = useState([]);
    const [assigneeIds, setAssigneeIds] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [createDate, setCreateDate] = useState(null);
    const [editTask, setEditTask] = useState(null);
    const [openFilter, setOpenFilter] = useState(null);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [selected, setSelected] = useState([]);
    const [dragItem, setDragItem] = useState(null);
    const [selectionBox, setSelectionBox] = useState(null);
    const [filtersReadyFor, setFiltersReadyFor] = useState(null);
    const visible = useMemo(() => period(anchor, mode), [anchor, mode]);
    const days = useMemo(() => rangeDays(visible.from, visible.to), [visible]);
    useEffect(() => { const close = (event) => { if (!event.target.closest('.planner-filter')) setOpenFilter(null); }; document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close); }, []);
    // Filters are external per-scope preferences; hydrate them when the workspace changes.
    // oxlint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
        if (!scopeId) return;
        try {
            const saved = JSON.parse(localStorage.getItem(`zuratax:planner-filters:${scopeId}`) ?? '{}');
            setProjectIds(Array.isArray(saved.projectIds) ? saved.projectIds : []);
            setAssigneeIds(Array.isArray(saved.assigneeIds) ? saved.assigneeIds : []);
            setStatuses(Array.isArray(saved.statuses) ? saved.statuses : []);
        } catch { setProjectIds([]); setAssigneeIds([]); setStatuses([]); }
        setFiltersReadyFor(scopeId);
    }, [scopeId]);
    useEffect(() => {
        if (!scopeId || filtersReadyFor !== scopeId) return;
        localStorage.setItem(`zuratax:planner-filters:${scopeId}`, JSON.stringify({ projectIds, assigneeIds, statuses }));
    }, [scopeId, filtersReadyFor, projectIds, assigneeIds, statuses]);

    const { data: projects = [] } = useQuery({ queryKey: ['projects', scopeId], queryFn: () => projectApi.list(scopeId), enabled: Boolean(scopeId) });
    const { data: assignable = { assignees: [], agents: [] } } = useQuery({ queryKey: ['task-assignable', scopeId], queryFn: () => contractorApi.assignable(scopeId), enabled: Boolean(scopeId) });
    const filters = { from: dateKey(visible.from), to: dateKey(visible.to), projectIds, assigneeIds, statuses };
    const calendar = useQuery({ queryKey: ['planner', scopeId, filters.from, filters.to, projectIds, assigneeIds, statuses], queryFn: () => plannerApi.range(scopeId, filters), enabled: Boolean(scopeId) });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['planner', scopeId] });
    const saveTask = useMutation({ mutationFn: (payload) => { if (!editTask) return taskApi.create(scopeId, payload); const changes = { ...payload }; if (editTask.planner_kind === 'tail') delete changes.due_at; return taskApi.update(scopeId, editTask.id, changes); }, onSuccess: () => { setCreateDate(null); setEditTask(null); refresh(); } });
    const dropMutation = useMutation({ mutationFn: async ({ item, day, shift, alt }) => {
        if (item.kind === 'tail') return plannerApi.moveTail(scopeId, item.id, day);
        if (alt) return plannerApi.createTail(scopeId, item.id, day);
        if (shift) return plannerApi.copyTask(scopeId, item.id, day);
        return taskApi.update(scopeId, item.id, { due_at: `${day} 12:00:00` });
    }, onSuccess: refresh });
    const bulk = useMutation({ mutationFn: (payload) => plannerApi.bulk(scopeId, { task_ids: selected, ...payload }), onSuccess: () => { setSelected([]); refresh(); } });

    const itemsByDay = useMemo(() => {
        const result = {};
        for (const task of calendar.data?.tasks ?? []) {
            if (!task.due_at) continue;
            const key = String(task.due_at).slice(0, 10);
            (result[key] ??= []).push({ kind: 'task', id: task.id, task });
        }
        for (const tail of calendar.data?.tails ?? []) (result[tail.planned_on] ??= []).push({ kind: 'tail', id: tail.id, task: tail.task });
        return result;
    }, [calendar.data]);

    const step = mode === 'quarter' ? 3 : 1;
    const movePeriod = (direction) => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + direction * step, 1));
    const toggleTask = (taskId) => setSelected((current) => current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]);

    const startMarquee = (event) => {
        if (!bulkOpen || event.button !== 0 || event.target.closest('.planner-card')) return;
        const rect = gridRef.current.getBoundingClientRect();
        const start = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        setSelectionBox({ ...start, width: 0, height: 0 });
        const move = (moveEvent) => setSelectionBox({ x: Math.min(start.x, moveEvent.clientX - rect.left), y: Math.min(start.y, moveEvent.clientY - rect.top), width: Math.abs(moveEvent.clientX - rect.left - start.x), height: Math.abs(moveEvent.clientY - rect.top - start.y) });
        const up = (upEvent) => {
            const x = Math.min(event.clientX, upEvent.clientX), y = Math.min(event.clientY, upEvent.clientY), right = Math.max(event.clientX, upEvent.clientX), bottom = Math.max(event.clientY, upEvent.clientY);
            if (right - x > 5 || bottom - y > 5) {
                const found = [...gridRef.current.querySelectorAll('[data-task-id]')].filter((node) => { const card = node.getBoundingClientRect(); return card.left < right && card.right > x && card.top < bottom && card.bottom > y; }).map((node) => node.dataset.taskId);
                setSelected([...new Set(found)]);
            }
            setSelectionBox(null); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    };

    return <main className={`planner-page ${bulkOpen ? 'planner-page--bulk' : ''}`}>
        {bulkOpen && <BulkTools selectedCount={selected.length} projects={projects} assignees={assignable.assignees} onClose={() => { setBulkOpen(false); setSelected([]); }} onApply={(payload) => bulk.mutate(payload)} pending={bulk.isPending} error={bulk.error}/>} 
        <section className="planner-workspace">
            <header className="planner-head"><div><small>Планирование ресурсов</small><h1>Planner</h1></div><div className="planner-head__controls"><div className="planner-period"><button onClick={() => movePeriod(-1)} aria-label="Назад"><IconArrowLeft size={17}/></button><strong>{visible.title}</strong><button onClick={() => movePeriod(1)} aria-label="Вперёд"><IconArrowRight size={17}/></button><button onClick={() => setAnchor(new Date())}>Сегодня</button></div><div className="planner-mode"><button className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>Месяц</button><button className={mode === 'quarter' ? 'active' : ''} onClick={() => setMode('quarter')}>Квартал</button></div></div></header>
            <nav className="planner-tabs"><button className="active">Задачи</button><button disabled>События <small>скоро</small></button><button disabled>Эксплоиты <small>скоро</small></button></nav>
            <div className="planner-toolbar"><MultiFilter label="Проекты" open={openFilter === 'projects'} onToggle={() => setOpenFilter(openFilter === 'projects' ? null : 'projects')} items={projects.map((project) => ({ value: project.id, label: project.title, color: project.color }))} selected={projectIds} onChange={setProjectIds}/><MultiFilter label="Исполнители" open={openFilter === 'assignees'} onToggle={() => setOpenFilter(openFilter === 'assignees' ? null : 'assignees')} items={assignable.assignees.map((user) => ({ value: user.id, label: user.name, color: '#8eb8e8' }))} selected={assigneeIds} onChange={setAssigneeIds}/><MultiFilter label="Статусы" open={openFilter === 'statuses'} onToggle={() => setOpenFilter(openFilter === 'statuses' ? null : 'statuses')} items={taskStatuses} selected={statuses} onChange={setStatuses}/><button type="button" className="planner-reset-filters" disabled={!projectIds.length && !assigneeIds.length && !statuses.length} title="Сбросить все фильтры" onClick={() => { setProjectIds([]); setAssigneeIds([]); setStatuses([]); setOpenFilter(null); }}><IconRefresh size={15}/><span>Сбросить</span></button><span className="planner-toolbar__hint"><kbd>Shift</kbd> копия <kbd>Alt</kbd> хвост</span><button className={`planner-bulk-trigger ${bulkOpen ? 'active' : ''}`} onClick={() => setBulkOpen(!bulkOpen)}><IconLayersSelected size={17}/>{selected.length ? `Выбрано: ${selected.length}` : 'Массово'}</button></div>
            <div className="planner-weekdays">{weekDays.map((day) => <strong key={day}>{day}</strong>)}</div>
            <div className={`planner-grid ${mode === 'quarter' ? 'planner-grid--quarter' : ''}`} ref={gridRef} onPointerDown={startMarquee}>
                {days.map((day) => { const key = dateKey(day); const today = key === dateKey(new Date()); const foreignMonth = mode === 'month' && day.getMonth() !== anchor.getMonth(); return <div key={key} className={`planner-day ${today ? 'planner-day--today' : ''} ${foreignMonth ? 'planner-day--muted' : ''}`} onDoubleClick={(event) => { if (!bulkOpen && !event.target.closest('.planner-card')) { setEditTask(null); setCreateDate(key); } }} onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('planner-day--drop'); }} onDragLeave={(event) => event.currentTarget.classList.remove('planner-day--drop')} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove('planner-day--drop'); if (dragItem) dropMutation.mutate({ item: dragItem, day: key, shift: event.shiftKey, alt: event.altKey }); }}><button className="planner-day__number" ><span>{day.getDate()}</span>{(day.getDate() === 1 || (mode === 'quarter' && day.getDay() === 1)) && <small>{monthNames[day.getMonth()]}</small>}<IconCalendarPlus size={13}/></button><div className="planner-day__items">{(itemsByDay[key] ?? []).map((item) => { const status = taskStatusMap[item.task.status] ?? taskStatusMap.todo; const isSelected = selected.includes(item.task.id); return <article key={`${item.kind}-${item.id}`} draggable className={`planner-card planner-card--${item.kind} ${isSelected ? 'planner-card--selected' : ''}`} data-task-id={item.task.id} style={{ background: status.color, borderLeftColor: item.task.project?.color ?? '#8794a7' }} title={item.kind === 'tail' ? `Хвост ${taskReference(item.task)} · двойной клик — редактор` : item.task.title} onDragStart={(event) => { setDragItem(item); event.dataTransfer.effectAllowed = 'copyMove'; event.dataTransfer.setData('text/plain', item.id); }} onDragEnd={() => setDragItem(null)} onClick={(event) => { event.stopPropagation(); if (bulkOpen || event.ctrlKey || event.metaKey) toggleTask(item.task.id); }} onDoubleClick={(event) => { event.stopPropagation(); setEditTask({ ...item.task, planner_kind: item.kind }); setCreateDate(key); }}>{item.kind === 'tail' ? <strong>{taskReference(item.task)}</strong> : <><span><b>{taskReference(item.task)}</b>{item.task.assignee?.name && <i>{item.task.assignee.name}</i>}</span><p>{item.task.title}</p></>}</article>; })}</div></div>; })}
                {selectionBox && <div className="planner-selection" style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }}/>} 
            </div>
            {calendar.isLoading && <div className="planner-loading">Раскладываю задачи…</div>}{calendar.error && <div className="planner-error planner-error--page">{calendar.error.message}</div>}
        </section>
        {createDate && <QuickCreate key={editTask?.id ?? createDate} date={createDate} task={editTask} projects={projects} assignees={assignable.assignees} defaults={{ projectId: projectIds[0], assigneeId: assigneeIds[0], status: statuses[0] }} onClose={() => { setCreateDate(null); setEditTask(null); }} onSave={(payload) => saveTask.mutate(payload)} onOpenFull={() => navigate(`/tasks/${editTask.id}/edit`)} pending={saveTask.isPending} error={saveTask.error}/>}
    </main>;
}
