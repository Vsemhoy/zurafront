import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { IconCalendar, IconChevronLeft, IconChevronRight, IconCopy, IconEdit, IconList, IconMoon, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { useAuth } from '../auth';
import { darklogApi } from '../entities/darklog/api';
import { actions, calendarWeeks, darklogHref, dayKey, decisions, isoInput, kinds, localInput, markersOnSegment, modules, monthNow, origins, periodSegment, relations, severities, statuses } from '../entities/darklog/model';
import MarkdownRenderer from '../shared/ui/MarkdownRenderer';
import { CommentAuthor } from '../shared/ui/CommentAuthor';
import { AttachmentsButton } from '../shared/ui/AttachmentsButton';
import './DarklogPage.css';

const MarkdownEditor = lazy(() => import('../shared/ui/CompactMarkdownEditor'));
const dateTime = (value) => value ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : 'Продолжается';
const optionsOf = (values) => Object.entries(values).map(([value, label]) => <option key={value} value={value}>{label}</option>);
const defaultFilters = () => ({ month: monthNow(), status: '', project_id: '', department_id: '', responsible_id: '', severity: '', kind: '', q: '', view: 'calendar' });
function loadFilters(key) {
  const defaults = defaultFilters();
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    for (const field of Object.keys(defaults)) if (typeof saved?.[field] === 'string') defaults[field] = saved[field];
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(defaults.month)) defaults.month = monthNow();
    if (!['calendar', 'table'].includes(defaults.view)) defaults.view = 'calendar';
    return defaults;
  } catch { return defaults; }
}

export function DarklogPage() {
  const { activeScope } = useWorkspace();
  const userId = useAuth((state) => state.user?.id);
  const { scopeId } = useParams();
  if (!activeScope) return <main className="darklog-page">Выберите скоуп.</main>;
  if (scopeId && scopeId !== activeScope.id) return <main className="darklog-page">Этот скоуп недоступен. <Link to="/darklog">Вернуться</Link></main>;
  return <DarklogWorkspace key={`${userId}:${activeScope.id}`} scope={activeScope} userId={userId}/>;
}

function DarklogWorkspace({ scope, userId }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { darklogId } = useParams();
  const storageKey = `zuratax:darklog:${userId}:${scope.id}`;
  const [filters, setFilters] = useState(() => loadFilters(storageKey));
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [search, setSearch] = useState(filters.q);
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(filters)); } catch { /* Storage can be disabled. */ } }, [filters, storageKey]);
  useEffect(() => { const timer = setTimeout(() => { setFilters((current) => current.q === search ? current : { ...current, q: search }); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const options = useQuery({ queryKey: ['darklog-options', scope.id], queryFn: () => darklogApi.options(scope.id) });
  const { view, ...query } = filters;
  const list = useQuery({ queryKey: ['darklogs', scope.id, query, page], queryFn: () => darklogApi.list(scope.id, { ...query, page, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }) });
  const refresh = () => { client.invalidateQueries({ queryKey: ['darklogs', scope.id] }); client.invalidateQueries({ queryKey: ['darklog', scope.id] }); client.invalidateQueries({ queryKey: ['task-darklogs', scope.id] }); };
  const change = (field, value) => { setFilters((current) => ({ ...current, [field]: value })); setPage(1); };
  const shift = (delta) => { const date = new Date(`${filters.month}-01T12:00:00`); date.setMonth(date.getMonth() + delta); change('month', dayKey(date).slice(0, 7)); };
  const open = (entry, marker) => navigate(darklogHref(scope.id, entry.id) + (marker ? `#${marker.id}` : ''));
  const entries = list.data?.items ?? [];
  return <main className="darklog-page darklog-ui">
    <header className="darklog-heading"><IconMoon size={23}/><div><h1>Darklog</h1><small>{scope.name} · Что мешает работе</small></div><div className="darklog-view-switch"><button aria-label="Календарь влияния" aria-pressed={view === 'calendar'} onClick={() => change('view', 'calendar')}><IconCalendar size={17}/></button><button aria-label="Таблица" aria-pressed={view === 'table'} onClick={() => change('view', 'table')}><IconList size={17}/></button></div><button className="darklog-primary" disabled={!options.data?.can_create} onClick={() => setEditor({})}><IconPlus size={16}/>Новый дарклог</button></header>
    <section className="darklog-toolbar" aria-label="Фильтры Darklog">
      <div className="darklog-month"><button title="Предыдущий месяц" onClick={() => shift(-1)}><IconChevronLeft size={16}/></button><input aria-label="Месяц" type="month" min="2000-01" max="2099-12" value={filters.month} onChange={(event) => event.target.value && change('month', event.target.value)}/><button title="Следующий месяц" onClick={() => shift(1)}><IconChevronRight size={16}/></button></div>
      <select aria-label="Статус" value={filters.status} onChange={(event) => change('status', event.target.value)}><option value="">Все статусы</option><option value="active">Открытые</option>{optionsOf(statuses)}</select>
      <select aria-label="Проект" value={filters.project_id} onChange={(event) => change('project_id', event.target.value)}><option value="">Все проекты</option>{options.data?.projects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.title}</option>)}</select>
      <select aria-label="Отдел" value={filters.department_id} onChange={(event) => change('department_id', event.target.value)}><option value="">Все отделы</option>{options.data?.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
      <select aria-label="Сопровождающий" value={filters.responsible_id} onChange={(event) => change('responsible_id', event.target.value)}><option value="">Все ответственные</option>{options.data?.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
      <select aria-label="Серьёзность" value={filters.severity} onChange={(event) => change('severity', event.target.value)}><option value="">Любая серьёзность</option>{optionsOf(severities)}</select>
      <select aria-label="Тип" value={filters.kind} onChange={(event) => change('kind', event.target.value)}><option value="">Все типы</option>{optionsOf(kinds)}</select>
      <input aria-label="Поиск Darklog" maxLength={150} placeholder="Код, название, описание…" value={search} onChange={(event) => setSearch(event.target.value)}/>
      <button onClick={() => { setFilters(defaultFilters()); setSearch(''); setPage(1); }}>Сбросить</button>
    </section>
    <p className="darklog-hint">{list.data?.total ?? 0} записей · Сплошная полоса — фактическое влияние, пунктир — прогноз. Сопровождающий не означает виновника.</p>
    {(list.error || options.error) && <p className="darklog-error" role="alert">{list.error?.message || options.error?.message}</p>}
    {list.isPending ? <p>Загружаю обстановку…</p> : view === 'calendar' ? <DarklogCalendar month={filters.month} entries={entries} onOpen={open}/> : <DarklogTable entries={entries} onOpen={open}/>}
    <footer className="darklog-pager"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Назад</button><span>{page} / {list.data?.last_page || 1}</span><button disabled={page >= (list.data?.last_page || 1)} onClick={() => setPage(page + 1)}>Далее</button></footer>
    {darklogId && <DarklogDrawer key={darklogId} scopeId={scope.id} id={darklogId} options={options.data} refresh={refresh} onEdit={setEditor} onClose={() => navigate('/darklog')}/>}
    {editor && <DarklogEditor key={editor.id || 'new'} scopeId={scope.id} item={editor} options={options.data} defaults={filters} onClose={() => setEditor(null)} onSaved={(entry) => { setEditor(null); refresh(); open(entry); }}/>}
  </main>;
}

function DarklogCalendar({ month, entries, onOpen }) {
  const weeks = calendarWeeks(month);
  return <div className="darklog-calendar-scroll"><section className="darklog-calendar" aria-label="Календарь влияния">
    <div className="darklog-weekdays">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <strong key={day}>{day}</strong>)}</div>
    {weeks.map((week) => <section className="darklog-week" key={week[0]}><div className="darklog-dates">{week.map((day, column) => <div key={day} className={`${column >= 5 ? 'weekend' : ''} ${!day.startsWith(month) ? 'other-month' : ''} ${day === dayKey(new Date()) ? 'today' : ''}`}><time dateTime={day}>{Number(day.slice(-2))}</time></div>)}</div>
      <div className="darklog-week-bars">{entries.map((entry) => {
        const segments = entry.periods.flatMap((period) => {
          const actual = periodSegment(period, week);
          const expected = !period.ends_at && entry.expected_end_at && new Date(entry.expected_end_at) > new Date() ? periodSegment({ starts_at: new Date().toISOString(), ends_at: entry.expected_end_at }, week) : null;
          return [...(actual ? [{ ...actual, key: period.id, forecast: false }] : []), ...(expected ? [{ ...expected, key: `${period.id}-forecast`, forecast: true }] : [])];
        });
        const uncovered = (entry.markers ?? []).filter((marker) => { const column = week.indexOf(dayKey(new Date(marker.at))); return column >= 0 && !segments.some((segment) => column >= segment.first && column <= segment.last); });
        return <div className="darklog-calendar-entry" key={entry.id}>{segments.map((segment) => {
          const markers = markersOnSegment(entry.markers ?? [], week, segment);
          return <div className="darklog-bar-lane" key={segment.key}><div className={`darklog-bar ${segment.forecast ? 'darklog-bar--forecast' : ''}`} data-severity={entry.severity} style={{ gridColumn: `${segment.first + 1} / ${segment.last + 2}`, borderTopLeftRadius: segment.continuesBefore ? 2 : undefined, borderBottomLeftRadius: segment.continuesBefore ? 2 : undefined, borderTopRightRadius: segment.continuesAfter ? 2 : undefined, borderBottomRightRadius: segment.continuesAfter ? 2 : undefined }}>
            <button className="darklog-bar-open" title={`${entry.code} · ${entry.title}\n${statuses[entry.status]} · ${severities[entry.severity]}${segment.forecast ? '\nПрогноз, не фактический период' : ''}`} onClick={() => onOpen(entry)}><b>{entry.code}</b><span>{segment.forecast ? 'Прогноз · ' : ''}{entry.title}</span></button>
            <DarklogMarkers markers={markers} segment={segment} onOpen={(marker) => onOpen(entry, marker)}/>
          </div></div>;
        })}{uncovered.length > 0 && <div className="darklog-bar-lane">{uncovered.slice(0, 7).map((marker) => <button key={marker.id} className="darklog-standalone-marker" style={{ gridColumn: week.indexOf(dayKey(new Date(marker.at))) + 1, '--marker-color': modules[marker.module]?.[1] }} title={`${marker.title}\n${dateTime(marker.at)}`} onClick={() => onOpen(entry, marker)}>{entry.code} · {modules[marker.module]?.[0]}</button>)}</div>}</div>;
      })}</div>
    </section>)}
  </section></div>;
}

function DarklogMarkers({ markers, segment, onOpen }) {
  const groups = new Map();
  for (const marker of markers) groups.set(marker.column, [...(groups.get(marker.column) ?? []), marker]);
  return <span className="darklog-bar-markers">{[...groups].map(([column, entries]) => <button key={column} style={{ left: `${(column - segment.first + .5) / (segment.last - segment.first + 1) * 100}%`, '--marker-color': modules[entries[0].module]?.[1] || '#70556f' }} className={new Date(entries[0].at) > new Date() ? 'planned' : ''} title={entries.map((marker) => `${modules[marker.module]?.[0] || 'Запись'} · ${marker.title}\n${dateTime(marker.at)}`).join('\n\n')} aria-label={entries.length > 1 ? `Событий: ${entries.length}. Открыть хронологию` : `Открыть событие: ${entries[0].title}`} onClick={() => onOpen(entries[0])}>{entries.length > 1 ? entries.length : ''}</button>)}</span>;
}

function DarklogTable({ entries, onOpen }) {
  return <div className="darklog-table-scroll"><table className="darklog-table"><thead><tr><th>Код / проблема</th><th>Влияние</th><th>Статус</th><th>Проект / отдел</th><th>Сопровождающий</th><th>Периоды</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td><button className="darklog-table-title" onClick={() => onOpen(entry)}><code>{entry.code}</code>{entry.title}</button><small>{kinds[entry.kind]} · {origins[entry.origin]}</small></td><td><span data-severity={entry.severity} className="darklog-severity">{severities[entry.severity]}</span></td><td>{statuses[entry.status]}</td><td>{entry.project?.key || 'Весь скоуп'}<small>{entry.department?.name || 'Без отдела'}</small></td><td>{entry.responsible ? <CommentAuthor author={entry.responsible}/> : 'Не назначен'}</td><td>{entry.periods.length} · {entry.periods.some((period) => !period.ends_at) ? 'Влияет сейчас' : 'Влияние завершено'}</td></tr>)}</tbody></table>{entries.length === 0 && <p>На выбранный период записей нет.</p>}</div>;
}

function DarklogDrawer({ scopeId, id, options, refresh, onEdit, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState('timeline');
  const [visible, setVisible] = useState(40);
  const [content, setContent] = useState('');
  const [reply, setReply] = useState(null);
  const [copyError, setCopyError] = useState('');
  const query = useQuery({ queryKey: ['darklog', scopeId, id], queryFn: () => darklogApi.get(scopeId, id) });
  const comment = useMutation({ mutationFn: () => darklogApi.comment(scopeId, id, { content, parent_id: reply ? reply.parent_id || reply.comment_id : null }), onSuccess: () => { setContent(''); setReply(null); refresh(); } });
  const removeComment = useMutation({ mutationFn: (commentId) => darklogApi.deleteComment(scopeId, id, commentId), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => darklogApi.remove(scopeId, id), onSuccess: () => { refresh(); onClose(); } });
  useEffect(() => { const key = (event) => { if (event.key === 'Escape' && !document.querySelector('.darklog-editor-backdrop,.filer-backdrop')) onClose(); }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, [onClose]);
  useEffect(() => { if (location.hash && query.data) requestAnimationFrame(() => document.getElementById(`darklog-timeline-${location.hash.slice(1)}`)?.scrollIntoView({ block: 'center' })); }, [location.hash, query.data, tab]);
  const item = query.data;
  const activeTab = location.hash ? 'timeline' : tab;
  const switchTab = (next) => { setTab(next); if (location.hash) navigate(location.pathname, { replace: true }); };
  const timeline = location.hash ? item?.timeline ?? [] : (item?.timeline ?? []).slice(-visible);
  const copy = () => navigator.clipboard.writeText(`${window.location.origin}${darklogHref(scopeId, id)}`).catch(() => setCopyError('Не удалось скопировать ссылку.'));
  return createPortal(<><div className="darklog-drawer-backdrop" onClick={onClose}/><aside className="darklog-drawer darklog-ui" role="dialog" aria-modal="true" aria-label="Карточка Darklog">
    <header><div><small>{item?.code || 'Darklog'}</small><h2>{item?.title || 'Загружаю…'}</h2></div><button title="Скопировать ссылку" onClick={() => void copy()}><IconCopy size={17}/></button><button aria-label="Закрыть карточку" onClick={onClose}><IconX size={21}/></button></header>
    {(query.error || remove.error || copyError) && <p className="darklog-error" role="alert">{query.error?.message || remove.error?.message || copyError}</p>}
    {item && <><div className="darklog-card-summary"><span className="darklog-severity" data-severity={item.severity}>{severities[item.severity]}</span><b>{statuses[item.status]}</b><span>{kinds[item.kind]}</span><span>{origins[item.origin]}</span>{item.category && <span>#{item.category}</span>}</div>
      <div className="darklog-card-meta"><span>{item.project?.title || 'Общая проблема скоупа'} · {item.department?.name || 'Без отдела'}</span><span>Сопровождает: {item.responsible ? <CommentAuthor author={item.responsible}/> : 'Не назначен'}</span>{item.expected_end_at && <span>Ожидаем восстановление: {dateTime(item.expected_end_at)}</span>}</div>
      <div className="darklog-card-actions">{item.can_update && <button onClick={() => onEdit(item)}><IconEdit size={15}/>Редактировать</button>}<AttachmentsButton scopeId={scopeId} type="darklog" id={id} readOnly={!item.can_update}/>{item.can_delete && <button className="danger" disabled={remove.isPending} onClick={() => window.confirm('Удалить дарклог из реестра? История останется в базе.') && remove.mutate()}><IconTrash size={15}/>Удалить</button>}</div>
      {item.description && <div className="darklog-description"><MarkdownRenderer>{item.description}</MarkdownRenderer></div>}
      <details className="darklog-context"><summary>Влияние, обходное решение и результат</summary>{[['Что пострадало', item.impact], ['Обходное решение', item.workaround], ['Устранение и проверка', item.resolution], ['Обоснование решения', item.decision_reason]].map(([title, value]) => value && <section key={title}><h3>{title}</h3><MarkdownRenderer>{value}</MarkdownRenderer></section>)}<h3>Периоды влияния</h3>{item.periods.map((period) => <p key={period.id}>{dateTime(period.starts_at)} → {dateTime(period.ends_at)}{period.note && ` · ${period.note}`}</p>)}</details>
      <nav className="darklog-tabs"><button aria-pressed={activeTab === 'timeline'} onClick={() => switchTab('timeline')}>Хронология</button><button aria-pressed={activeTab === 'links'} onClick={() => switchTab('links')}>Связи · {item.links.length}</button><button aria-pressed={activeTab === 'kpi'} onClick={() => switchTab('kpi')}>KPI · {item.kpi_links.length}</button></nav>
      {activeTab === 'timeline' && <><section className="darklog-timeline">{!location.hash && item.timeline.length > visible && <button onClick={() => setVisible(visible + 40)}>Показать предыдущие события</button>}{timeline.map((event) => <article id={`darklog-timeline-${event.id}`} key={event.id} className={`darklog-timeline-event ${event.kind === 'comment' ? 'is-comment' : ''} ${location.hash === `#${event.id}` ? 'is-focused' : ''}`} style={{ '--marker-color': modules[event.module]?.[1] || '#70556f' }}><header>{event.author && <CommentAuthor author={event.author}/>}<strong>{actions[event.title] || event.title}</strong><time>{dateTime(event.at)}{new Date(event.at) > new Date() ? ' · запланировано' : ''}</time></header>{event.parent_id && <small className="darklog-reply-label">Ответ на комментарий</small>}{event.content && <MarkdownRenderer>{event.content}</MarkdownRenderer>}{event.link && <p><a href={event.link.target.href}>{event.link.target.code} · {event.link.target.title}</a><small>{relations[event.link.relation]}{event.link.note ? ` · ${event.link.note}` : ''}</small></p>}{event.status && <small>Статус: {statuses[event.status]}</small>}{event.kind === 'comment' && item.can_update && <footer><button onClick={() => { setReply(event); document.getElementById('darklog-comment-input')?.focus(); }}>Ответить</button>{event.can_delete && <button disabled={removeComment.isPending} onClick={() => window.confirm('Удалить комментарий?') && removeComment.mutate(event.comment_id)}>Удалить</button>}</footer>}</article>)}</section>
        {item.can_update && <form className="darklog-comment-form" onSubmit={(event) => { event.preventDefault(); if (content.trim()) comment.mutate(); }}>{reply && <p>Ответ: {reply.author?.name}<button type="button" title="Отменить ответ" onClick={() => setReply(null)}><IconX size={13}/></button></p>}<textarea id="darklog-comment-input" required maxLength={20000} rows={3} placeholder="Что происходит? Комментарий поддерживает Markdown." value={content} onChange={(event) => setContent(event.target.value)}/><button className="darklog-primary" disabled={comment.isPending || !content.trim()}>Добавить комментарий</button>{(comment.error || removeComment.error) && <p className="darklog-error">{comment.error?.message || removeComment.error?.message}</p>}</form>}</>}
      {activeTab === 'links' && <DarklogLinks scopeId={scopeId} item={item} refresh={refresh}/>}
      {activeTab === 'kpi' && <DarklogKpi scopeId={scopeId} item={item} options={options} refresh={refresh}/>}
    </>}
    <button className="darklog-back-link" onClick={() => navigate('/darklog')}>К календарю Darklog</button>
  </aside></>, document.body);
}

function DarklogLinks({ scopeId, item, refresh }) {
  const [type, setType] = useState('task');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [relation, setRelation] = useState('context');
  const [note, setNote] = useState('');
  useEffect(() => { const timer = setTimeout(() => setTerm(search), 250); return () => clearTimeout(timer); }, [search]);
  const candidates = useQuery({ queryKey: ['darklog-candidates', scopeId, type, term], queryFn: () => darklogApi.candidates(scopeId, type, term), enabled: item.can_update });
  const add = useMutation({ mutationFn: (target) => darklogApi.link(scopeId, item.id, { target_type: type, target_id: target.id, relation, note }), onSuccess: () => { setNote(''); refresh(); } });
  const remove = useMutation({ mutationFn: (linkId) => darklogApi.unlink(scopeId, item.id, linkId), onSuccess: refresh });
  return <section className="darklog-links"><p className="darklog-hint">Причина, затронутая запись и работа по устранению — разные роли связи. Завершённую задачу тоже можно связать.</p>{item.links.map((link) => <div className="darklog-linked-record" key={link.id}><i style={{ backgroundColor: modules[link.target.type]?.[1] }}/><a href={link.target.href}><b>{link.target.code} · {link.target.title}</b><small>{relations[link.relation]}{link.note ? ` · ${link.note}` : ''}</small></a>{item.can_update && <button title="Убрать связь" disabled={remove.isPending} onClick={() => remove.mutate(link.id)}><IconX size={15}/></button>}</div>)}
    {item.can_update && <div className="darklog-link-picker"><div className="darklog-form-grid"><label>Модуль<select value={type} onChange={(event) => setType(event.target.value)}>{optionsOf(Object.fromEntries(Object.entries(modules).filter(([key]) => key !== 'comment').map(([key, value]) => [key, value[0]])))}</select></label><label>Роль связи<select value={relation} onChange={(event) => setRelation(event.target.value)}>{optionsOf(relations)}</select></label></div><input maxLength={150} aria-label="Поиск связанной записи" placeholder="Найти по названию или коду…" value={search} onChange={(event) => setSearch(event.target.value)}/><input maxLength={2000} aria-label="Пояснение связи" placeholder="Пояснение (необязательно)" value={note} onChange={(event) => setNote(event.target.value)}/><div className="darklog-candidates">{candidates.isPending ? <p>Загружаю…</p> : candidates.data?.filter((target) => type !== 'darklog' || target.id !== item.id).map((target) => <button key={target.id} disabled={add.isPending || item.links.some((link) => link.target.type === type && link.target.id === target.id && link.relation === relation)} onClick={() => add.mutate(target)}><span>{target.code} · {target.title}</span><IconPlus size={14}/></button>)}</div></div>}
    {(candidates.error || add.error || remove.error) && <p className="darklog-error">{candidates.error?.message || add.error?.message || remove.error?.message}</p>}
  </section>;
}

function DarklogKpi({ scopeId, item, options, refresh }) {
  const empty = { user_id: '', kpi_id: '', decision: 'pending', reason: '', effective_from: localInput(new Date()), effective_until: '' };
  const [form, setForm] = useState(empty);
  const save = useMutation({ mutationFn: () => darklogApi.kpi(scopeId, item.id, { ...form, effective_from: isoInput(form.effective_from), effective_until: isoInput(form.effective_until) }), onSuccess: () => { setForm(empty); refresh(); } });
  const remove = useMutation({ mutationFn: (allocationId) => darklogApi.deleteKpi(scopeId, item.id, allocationId), onSuccess: refresh });
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  return <section className="darklog-kpi"><p className="darklog-hint">Это применимость проблемы к показателю, а не назначение виновника. Связь сама по себе не меняет баллы. Подтверждение — у управляющего сотрудниками.</p>{item.kpi_links.map((allocation) => <article key={allocation.id}><CommentAuthor author={allocation.user}/><strong>{allocation.kpi?.name || 'Архивный KPI'}</strong><span className={`darklog-decision darklog-decision--${allocation.decision}`}>{decisions[allocation.decision]}</span><small>{dateTime(allocation.effective_from)} → {allocation.effective_until ? dateTime(allocation.effective_until) : 'Без окончания'}</small>{allocation.reason && <p>{allocation.reason}</p>}{allocation.reviewer && <small>Решение: {allocation.reviewer.name} · {dateTime(allocation.reviewed_at)}</small>}{item.can_review && <div><button onClick={() => setForm({ user_id: allocation.user_id, kpi_id: allocation.kpi_id, decision: allocation.decision, reason: allocation.reason || '', effective_from: localInput(allocation.effective_from), effective_until: localInput(allocation.effective_until) })}>Рассмотреть / изменить</button><button disabled={remove.isPending} onClick={() => window.confirm('Удалить связь с KPI? Решение останется в истории.') && remove.mutate(allocation.id)}>Удалить связь</button></div>}</article>)}
    {item.can_update && <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><div className="darklog-form-grid"><label>Исполнитель<select required value={form.user_id} onChange={set('user_id')}><option value="">Выберите человека</option>{options?.people.filter((person) => person.is_executor && person.type !== 'agent').map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label><label>KPI<select required value={form.kpi_id} onChange={set('kpi_id')}><option value="">Выберите показатель</option>{options?.kpis.map((kpi) => <option value={kpi.id} key={kpi.id}>{kpi.name}</option>)}</select></label><label>Начало ответственности<input type="datetime-local" required step="1" value={form.effective_from} onChange={set('effective_from')}/></label><label>Окончание<input type="datetime-local" step="1" value={form.effective_until} onChange={set('effective_until')}/></label><label>Применимость<select disabled={!item.can_review} value={form.decision} onChange={set('decision')}>{optionsOf(decisions)}</select></label></div><label>Обоснование<textarea required={form.decision !== 'pending'} rows={2} maxLength={5000} value={form.reason} onChange={set('reason')}/></label><button className="darklog-primary" disabled={save.isPending}>Сохранить применимость</button></form>}{(save.error || remove.error) && <p className="darklog-error">{save.error?.message || remove.error?.message}</p>}
  </section>;
}

function DarklogEditor({ scopeId, item, options, defaults, onClose, onSaved }) {
  const [pane, setPane] = useState('description');
  const [form, setForm] = useState(() => ({ title: '', description: '', impact: '', workaround: '', resolution: '', category: '', kind: 'incident', origin: 'unknown', severity: 'medium', status: 'new', decision_reason: '', project_id: defaults.project_id, department_id: defaults.department_id, responsible_id: defaults.responsible_id, expected_end_at: '', ...item,
    periods: (item.periods ?? [{ starts_at: new Date().toISOString(), ends_at: null, note: '' }]).map((period) => ({ ...period, starts_at: localInput(period.starts_at), ends_at: localInput(period.ends_at) })),
  }));
  const [expected, setExpected] = useState(localInput(item.expected_end_at));
  const save = useMutation({ mutationFn: () => darklogApi.save(scopeId, item.id, Object.fromEntries(Object.entries({ ...form, project_id: form.project_id || null, department_id: form.department_id || null, responsible_id: form.responsible_id || null, expected_end_at: isoInput(expected), periods: form.periods.map((period) => ({ ...period, starts_at: isoInput(period.starts_at), ends_at: isoInput(period.ends_at) })) }).filter(([field]) => ['title', 'description', 'impact', 'workaround', 'resolution', 'category', 'kind', 'origin', 'severity', 'status', 'decision_reason', 'project_id', 'department_id', 'responsible_id', 'expected_end_at', 'periods'].includes(field)))), onSuccess: onSaved });
  useEffect(() => { const key = (event) => { if (event.key === 'Escape') onClose(); }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, [onClose]);
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const setPeriod = (index, field, value) => setForm((current) => ({ ...current, periods: current.periods.map((period, position) => position === index ? { ...period, [field]: value } : period) }));
  return createPortal(<div className="darklog-editor-backdrop"><form className="darklog-editor darklog-ui" role="dialog" aria-modal="true" aria-label="Редактор Darklog" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><header><h2>{item.code || 'Новый дарклог'}</h2><button type="button" aria-label="Закрыть редактор" onClick={onClose}><IconX size={20}/></button></header>
    <label>Что мешает работе<input autoFocus required maxLength={255} value={form.title} onChange={set('title')} placeholder="Интернет отсутствует, CAD не запускается…"/></label>
    <div className="darklog-form-grid"><label>Тип<select value={form.kind} onChange={set('kind')}>{optionsOf(kinds)}</select></label><label>Источник<select value={form.origin} onChange={set('origin')}>{optionsOf(origins)}</select></label><label>Серьёзность<select value={form.severity} onChange={set('severity')}>{optionsOf(severities)}</select></label><label>Статус решения<select value={form.status} onChange={set('status')}>{optionsOf(statuses)}</select></label><label>Проект<select value={form.project_id || ''} onChange={set('project_id')}><option value="">Весь скоуп</option>{form.project_id && !options?.projects.some((project) => project.id === form.project_id) && <option value={form.project_id}>{form.project?.title || 'Прежний проект'} · архив</option>}{options?.projects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.title}</option>)}</select></label><label>Отдел<select value={form.department_id || ''} onChange={set('department_id')}><option value="">Без отдела</option>{options?.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label><label>Сопровождающий<select value={form.responsible_id || ''} onChange={set('responsible_id')}><option value="">Не назначен</option>{form.responsible_id && !options?.people.some((person) => person.id === form.responsible_id) && <option value={form.responsible_id}>{form.responsible?.name || 'Прежний ответственный'}</option>}{options?.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label>Категория / область<input maxLength={100} placeholder="CAD, связь, инфраструктура…" value={form.category || ''} onChange={set('category')}/></label></div>
    <nav className="darklog-tabs">{[['description', 'Что происходит'], ['impact', 'Влияние'], ['workaround', 'Обход'], ['resolution', 'Устранение']].map(([field, label]) => <button type="button" key={field} aria-pressed={pane === field} onClick={() => setPane(field)}>{label}</button>)}</nav>
    <div className="darklog-md"><Suspense fallback={<p>Загружаю Markdown…</p>}><MarkdownEditor key={pane} value={form[pane] || ''} onChange={(markdown) => setForm((current) => ({ ...current, [pane]: markdown }))} toolbarInitiallyOpen hideToolbarTrigger/></Suspense></div>
    <section className="darklog-periods"><header><h3>Фактические периоды влияния</h3><button type="button" onClick={() => setForm((current) => ({ ...current, periods: [...current.periods, { starts_at: localInput(new Date()), ends_at: '', note: '' }] }))}><IconPlus size={14}/>Период</button></header><p className="darklog-hint">Пустое окончание означает, что влияние продолжается. Соседние периоды допустимы, пересекающиеся — нет.</p>{form.periods.map((period, index) => <div className="darklog-period-row" key={period.id || `new-${index}`}><label>Начало<input required type="datetime-local" step="1" value={period.starts_at} onChange={(event) => setPeriod(index, 'starts_at', event.target.value)}/></label><label>Окончание<input type="datetime-local" step="1" value={period.ends_at} onChange={(event) => setPeriod(index, 'ends_at', event.target.value)}/></label><label>Примечание<input maxLength={2000} value={period.note || ''} onChange={(event) => setPeriod(index, 'note', event.target.value)}/></label><button type="button" title="Удалить период" onClick={() => setForm((current) => ({ ...current, periods: current.periods.filter((_, position) => position !== index) }))}><IconTrash size={15}/></button></div>)}<button type="button" onClick={() => setForm((current) => ({ ...current, periods: current.periods.map((period) => period.ends_at ? period : { ...period, ends_at: localInput(new Date()) }) }))}>Завершить открытые периоды сейчас</button></section>
    <div className="darklog-form-grid"><label>Ожидаемое восстановление (прогноз)<input type="datetime-local" step="1" value={expected} onChange={(event) => setExpected(event.target.value)}/></label><label>Обоснование решения<textarea required={['accepted', 'unconfirmed'].includes(form.status)} maxLength={5000} rows={2} value={form.decision_reason || ''} onChange={set('decision_reason')}/></label></div>
    {save.error && <p className="darklog-error" role="alert">{save.error.message}</p>}<footer><button type="button" onClick={onClose}>Отмена</button><button className="darklog-primary" disabled={save.isPending}>{save.isPending ? 'Сохраняю…' : 'Сохранить'}</button></footer>
  </form></div>, document.body);
}
