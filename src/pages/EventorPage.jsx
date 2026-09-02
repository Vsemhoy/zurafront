import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconAlertTriangle, IconCalendar, IconCalendarEvent, IconChevronLeft, IconChevronRight, IconEye, IconEyeOff, IconFolder, IconList, IconLock, IconMessageCircle, IconPaperclip, IconPhoto, IconPin, IconPlus, IconSearch, IconSend, IconTrash, IconUser, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { contractorApi } from '../entities/contractor/api';
import { eventApi } from '../entities/event/api';
import { projectApi } from '../entities/project/api';
import './EventorPage.css';
import './BookerExcalidraw.css';

const MarkdownEditor = lazy(() => import('../shared/ui/CompactMarkdownEditor'));
const importanceOptions = [['undefined', 'Не определено'], ['unimportant', 'Не важно'], ['read', 'Ознакомиться'], ['important', 'Важно'], ['critical', 'Критично'], ['incident', 'Инцидент']];
const importanceMap = Object.fromEntries(importanceOptions);
let ExcalidrawComponent = null;
let exportExcalidrawToSvg = null;

async function loadExcalidraw() {
  if (ExcalidrawComponent && exportExcalidrawToSvg) return { Excalidraw: ExcalidrawComponent, exportToSvg: exportExcalidrawToSvg };
  const module = await import('@excalidraw/excalidraw');
  await import('@excalidraw/excalidraw/index.css');
  ExcalidrawComponent = module.Excalidraw;
  exportExcalidrawToSvg = module.exportToSvg;
  return { Excalidraw: ExcalidrawComponent, exportToSvg: exportExcalidrawToSvg };
}

export function EventorPage() {
  const { activeScope } = useWorkspace();
  const scopeId = activeScope?.id;
  const queryClient = useQueryClient();
  const [view, setView] = useState(() => localStorage.getItem('zuratax:eventor-view') || 'flow');
  const [filters, setFilters] = useState({ q: '', project_id: '', type_id: '', created_by: '', requester_id: '', importance: '' });
  const [month, setMonth] = useState(() => startMonth(new Date()));
  const [selectedId, setSelectedId] = useState(null);
  const [commentsId, setCommentsId] = useState(null);
  const [createDate, setCreateDate] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: projects = [] } = useQuery({ queryKey: ['projects', scopeId], queryFn: () => projectApi.list(scopeId), enabled: Boolean(scopeId) });
  const { data: peopleData = { people: [] } } = useQuery({ queryKey: ['contractors-assignable', scopeId], queryFn: () => contractorApi.assignable(scopeId), enabled: Boolean(scopeId) });
  const { data: types = [] } = useQuery({ queryKey: ['event-types', scopeId], queryFn: () => eventApi.types(scopeId), enabled: Boolean(scopeId) });
  const eventProjects = projects.filter((project) => project.show_in_eventor !== false);
  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), [filters]);
  const flow = useInfiniteQuery({
    queryKey: ['events', scopeId, params], enabled: Boolean(scopeId) && view === 'flow', initialPageParam: 1,
    queryFn: ({ pageParam }) => eventApi.list(scopeId, { ...params, page: pageParam, per_page: 20 }),
    getNextPageParam: (page) => page.meta?.current_page < page.meta?.last_page ? page.meta.current_page + 1 : undefined,
  });
  const calendarRange = useMemo(() => ({ from: dateKey(month), until: dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 7)) }), [month]);
  const calendar = useQuery({
    queryKey: ['events-calendar', scopeId, params, calendarRange], enabled: Boolean(scopeId) && view === 'calendar',
    queryFn: () => eventApi.list(scopeId, { ...params, ...calendarRange, per_page: 200 }),
  });
  const events = view === 'flow' ? (flow.data?.pages.flatMap((page) => page.data) ?? []) : (calendar.data?.data ?? []);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['events', scopeId] });
    queryClient.invalidateQueries({ queryKey: ['events-calendar', scopeId] });
  };
  const move = useMutation({ mutationFn: ({ event, day }) => eventApi.update(scopeId, event.id, movedDates(event, day)), onSuccess: refresh });
  const changeView = (next) => { setView(next); localStorage.setItem('zuratax:eventor-view', next); };
  const setFilter = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  const openCreate = (date = null) => { setCreateDate(date); setCreateOpen(true); };
  const loading = flow.isLoading || calendar.isLoading;
  const error = flow.error || calendar.error || move.error;

  return <main className="eventor-page">
    <header className="eventor-head">
      <div><small>Что и когда случилось</small><h1>Eventor</h1></div>
      <div className="eventor-view-switch"><button className={view === 'flow' ? 'active' : ''} onClick={() => changeView('flow')}><IconList size={16}/>Лента</button><button className={view === 'calendar' ? 'active' : ''} onClick={() => changeView('calendar')}><IconCalendar size={16}/>Календарь</button></div>
      <button className="new-event" onClick={() => openCreate()}><IconPlus size={17}/>Новое событие</button>
    </header>
    <div className="eventor-layout">
      <ProjectRail projects={eventProjects} value={filters.project_id} onChange={(project_id) => setFilters((current) => ({ ...current, project_id }))}/>
      <section className="eventor-workspace">
        <EventFilters filters={filters} setFilter={setFilter} types={types} people={peopleData.people ?? []} onReset={() => setFilters({ q: '', project_id: '', type_id: '', created_by: '', requester_id: '', importance: '' })}/>
        {view === 'calendar' && <MonthNavigation month={month} setMonth={setMonth}/>}
        {loading && <div className="eventor-state">Загружаю события…</div>}
        {error && <div className="eventor-state eventor-error">{error.message}</div>}
        {!loading && view === 'flow' && <EventFlow events={events} onOpen={setSelectedId} onComments={setCommentsId} hasMore={flow.hasNextPage} loadingMore={flow.isFetchingNextPage} loadMore={() => flow.fetchNextPage()}/>}
        {!loading && view === 'calendar' && <EventCalendar month={month} events={events} onOpen={setSelectedId} onComments={setCommentsId} onCreate={openCreate} onMove={(event, day) => move.mutate({ event, day })}/>}
      </section>
    </div>
    {createOpen && <EventCreate scopeId={scopeId} types={types} projects={eventProjects} people={peopleData.people ?? []} initialDate={createDate} onClose={() => setCreateOpen(false)} onCreated={(event) => { refresh(); setCreateOpen(false); setSelectedId(event.id); }}/>}
    {selectedId && <><div className="event-backdrop" onClick={() => setSelectedId(null)}/><EventEditor scopeId={scopeId} eventId={selectedId} types={types} projects={eventProjects} people={peopleData.people ?? []} onClose={() => setSelectedId(null)} onChanged={refresh} onComments={() => setCommentsId(selectedId)}/></>}
    {commentsId && <><div className="event-comments-backdrop" onClick={() => setCommentsId(null)}/><EventComments scopeId={scopeId} eventId={commentsId} onClose={() => setCommentsId(null)}/></>}
  </main>;
}

function ProjectRail({ projects, value, onChange }) {
  return <aside className="event-projects"><header><IconFolder size={16}/><strong>Проекты</strong></header><button className={!value ? 'active' : ''} onClick={() => onChange('')}><i/>Все события</button>{projects.map((project) => <button key={project.id} className={value === project.id ? 'active' : ''} onClick={() => onChange(project.id)}><i style={{ background: project.color }}/><span>{project.title}</span><code>{project.key}</code></button>)}</aside>;
}

function EventFilters({ filters, setFilter, types, people, onReset }) {
  return <div className="event-filters"><label className="event-search"><IconSearch size={15}/><input value={filters.q} onChange={setFilter('q')} placeholder="Текст, место или комментарий…"/></label><select value={filters.type_id} onChange={setFilter('type_id')}><option value="">Все типы</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select><select value={filters.importance} onChange={setFilter('importance')}><option value="">Любая важность</option>{importanceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={filters.created_by} onChange={setFilter('created_by')}><option value="">Все авторы</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><select value={filters.requester_id} onChange={setFilter('requester_id')}><option value="">Все заявители</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><button onClick={onReset}>Сбросить</button></div>;
}

function EventFlow({ events, onOpen, onComments, hasMore, loadingMore, loadMore }) {
  const rows = events.map((event, index) => { const divider = monthLabel(eventMoment(event)); return { event, divider, showDivider: index === 0 || divider !== monthLabel(eventMoment(events[index - 1])) }; });
  return <section className="event-flow">{rows.map(({ event, divider, showDivider }) => <div key={event.id}>{showDivider && <h2>{divider}</h2>}<EventCard event={event} onOpen={onOpen} onComments={onComments}/></div>)}{!events.length && <div className="eventor-state">Событий по этим фильтрам пока нет.</div>}{hasMore && <button className="event-load-more" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Загружаю…' : 'Показать ещё 20'}</button>}</section>;
}

function EventCard({ event, onOpen, onComments, compact = false }) {
  const [revealed, setRevealed] = useState(false);
  return <article className={`event-card ${compact ? 'event-card--compact' : ''} ${event.is_pinned ? 'is-pinned' : ''}`} style={{ '--event-color': event.type?.color || '#3975c6', '--event-bg': event.type?.background_color || '#fff' }} draggable={compact} onDragStart={(drag) => drag.dataTransfer.setData('application/x-zuratax-event', event.id)}>
    <button className={`event-card-main ${event.is_blurred && !revealed ? 'is-blurred' : ''}`} onClick={() => event.is_blurred && !revealed ? setRevealed(true) : onOpen(event.id)}>
      {!compact && <time><strong>{eventDate(event)}</strong><small>{eventTime(event)}</small></time>}
      <span className="event-type-line"><i/>{event.type?.name || 'Без типа'}{event.is_pinned && <IconPin size={12}/>} {event.is_locked && <IconLock size={12}/>} {event.visibility === 'private' && <IconEyeOff size={12}/>}</span>
      <strong>{event.title}</strong>
      {!compact && <p>{excerpt(event.content)}</p>}
      <footer>{event.project && <span><i style={{ background: event.project.color }}/>{event.project.key}</span>}{event.requester && <span><IconUser size={12}/>{event.requester.name}</span>}<b className={`importance importance--${event.importance}`}>{importanceMap[event.importance] || event.importance}</b></footer>
      {event.is_blurred && !revealed && <em><IconEye size={14}/>Показать скрытое событие</em>}
    </button>
    {event.comments_allowed && <button className="event-comment-trigger" title="Комментарии" onClick={() => onComments(event.id)}><IconMessageCircle size={15}/><small>{event.comments_count || ''}</small></button>}
  </article>;
}

function MonthNavigation({ month, setMonth }) {
  return <div className="event-month-nav"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><IconChevronLeft size={17}/></button><strong>{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</strong><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><IconChevronRight size={17}/></button><button onClick={() => setMonth(startMonth(new Date()))}>Сегодня</button></div>;
}

function EventCalendar({ month, events, onOpen, onComments, onCreate, onMove }) {
  const days = calendarDays(month);
  const byDay = useMemo(() => { const map = {}; events.forEach((event) => { const key = dateKey(eventMoment(event)); (map[key] ||= []).push(event); }); return map; }, [events]);
  return <><div className="event-weekdays">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <strong key={day}>{day}</strong>)}</div><section className="event-calendar">{days.map((day) => { const key = dateKey(day); return <div key={key} className={`${day.getMonth() !== month.getMonth() ? 'muted' : ''} ${key === dateKey(new Date()) ? 'today' : ''}`} onDoubleClick={(click) => { if (!click.target.closest('.event-card')) onCreate(key); }} onDragOver={(drag) => drag.preventDefault()} onDrop={(drop) => { drop.preventDefault(); const id = drop.dataTransfer.getData('application/x-zuratax-event'); const event = events.find((item) => item.id === id); if (event) onMove(event, key); }}><header><span>{day.getDate()}</span>{day.getDate() === 1 && <small>{day.toLocaleDateString([], { month: 'short' })}</small>}</header><section>{(byDay[key] ?? []).map((event) => <EventCard key={event.id} compact event={event} onOpen={onOpen} onComments={onComments}/>)}</section></div>; })}</section></>;
}

function EventCreate({ scopeId, types, projects, people, initialDate, onClose, onCreated }) {
  const defaultType = types.find((type) => type.code === 'event')?.id || '';
  const [form, setForm] = useState({ title: '', content: '', type_id: defaultType, project_id: '', requester_id: '', importance: 'undefined', visibility: 'scope', starts_at: initialDate ? `${initialDate}T09:00` : '', ends_at: '', location: '', status: 'published', is_all_day: false });
  const create = useMutation({ mutationFn: () => eventApi.create(scopeId, normalizeEventPayload(form)), onSuccess: onCreated });
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  return <div className="event-modal-backdrop" onMouseDown={onClose}><form className="event-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); create.mutate(); }}><header><div><small>Новая запись</small><strong>Событие Eventor</strong></div><button type="button" onClick={onClose}><IconX size={18}/></button></header><label>Название<input autoFocus required value={form.title} onChange={set('title')}/></label><label>Короткое описание<textarea rows="3" value={form.content} onChange={set('content')}/></label><div className="event-form-row"><Select label="Проект" value={form.project_id} onChange={set('project_id')} empty="Без проекта" rows={projects}/><Select label="Тип" value={form.type_id} onChange={set('type_id')} empty="Без типа" rows={types}/></div><div className="event-form-row"><Select label="Заявитель" value={form.requester_id} onChange={set('requester_id')} empty="Не указан" rows={people}/><label>Важность<select value={form.importance} onChange={set('importance')}>{importanceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="event-form-row"><label>Начало<input type="datetime-local" value={form.starts_at} onChange={set('starts_at')}/></label><label>Окончание<input type="datetime-local" value={form.ends_at} onChange={set('ends_at')}/></label></div><div className="event-form-row"><label>Место<input value={form.location} onChange={set('location')}/></label><label>Видимость<select value={form.visibility} onChange={set('visibility')}><option value="private">Только автор</option><option value="scope">Коллеги</option><option value="public">Все</option></select></label></div><label className="event-checkbox"><input type="checkbox" checked={form.is_all_day} onChange={set('is_all_day')}/>Весь день</label>{create.error && <p className="eventor-error">{create.error.message}</p>}<footer><button type="button" onClick={onClose}>Отмена</button><button className="event-primary" disabled={create.isPending}>{create.isPending ? 'Создаю…' : 'Создать'}</button></footer></form></div>;
}

function EventEditor({ scopeId, eventId, types, projects, people, onClose, onChanged, onComments }) {
  const queryClient = useQueryClient();
  const key = ['event', scopeId, eventId];
  const [tab, setTab] = useState('editor');
  const [diagramOpen, setDiagramOpen] = useState(false);
  const { data: event, isLoading, error } = useQuery({ queryKey: key, queryFn: () => eventApi.get(scopeId, eventId) });
  const save = useMutation({ mutationFn: (payload) => eventApi.update(scopeId, eventId, payload), onSuccess: (updated) => { queryClient.setQueryData(key, updated); onChanged(); } });
  const remove = useMutation({ mutationFn: () => eventApi.remove(scopeId, eventId), onSuccess: () => { onChanged(); onClose(); } });
  if (isLoading) return <aside className="event-editor"><div className="eventor-state">Загружаю…</div></aside>;
  if (error) return <aside className="event-editor eventor-error">{error.message}</aside>;
  const local = (patch) => queryClient.setQueryData(key, { ...event, ...patch });
  const change = (keyName, value) => { local({ [keyName]: value }); save.mutate({ [keyName]: value }); };
  const tabs = [['editor', 'Редактор'], ['settings', 'Настройки'], ['diagram', 'Схема'], ['attachments', 'Вложения'], ['photos', 'Фотографии']];
  return <aside className="event-editor"><header><span><IconCalendarEvent size={18}/>Событие</span><div>{event.comments_allowed && <button onClick={onComments}><IconMessageCircle size={17}/>{event.comments_count || ''}</button>}<button onClick={onClose}><IconX size={19}/></button></div></header><input className="event-title" value={event.title} disabled={event.is_locked} onChange={(input) => local({ title: input.target.value })} onBlur={(input) => save.mutate({ title: input.target.value })}/><nav className="event-editor-tabs">{tabs.map(([value, label]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}</nav>{event.is_locked && <p className="event-locked"><IconLock size={15}/>Событие заблокировано от правок.</p>}
    {tab === 'editor' && <Suspense fallback={<div className="eventor-state">Загружаю Markdown…</div>}><MarkdownEditor variant="full" value={event.content || ''} placeholder="Описание, наблюдения и материалы…" onSave={(content) => save.mutate({ content })}/></Suspense>}
    {tab === 'settings' && <div className="event-editor-settings"><Select label="Проект" value={event.project_id || ''} onChange={(input) => change('project_id', input.target.value || null)} empty="Без проекта" rows={projects}/><Select label="Тип" value={event.type_id || ''} onChange={(input) => change('type_id', input.target.value || null)} empty="Без типа" rows={types}/><Select label="Заявитель" value={event.requester_id || ''} onChange={(input) => change('requester_id', input.target.value || null)} empty="Не указан" rows={people}/><label>Важность<select value={event.importance} onChange={(input) => change('importance', input.target.value)}>{importanceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Начало<input type="datetime-local" defaultValue={localDateTime(event.starts_at)} onBlur={(input) => save.mutate({ starts_at: input.target.value || null })}/></label><label>Окончание<input type="datetime-local" defaultValue={localDateTime(event.ends_at)} onBlur={(input) => save.mutate({ ends_at: input.target.value || null })}/></label><label>Место<input defaultValue={event.location || ''} onBlur={(input) => save.mutate({ location: input.target.value || null })}/></label><label>Видимость<select value={event.visibility} onChange={(input) => change('visibility', input.target.value)}><option value="private">Только автор</option><option value="scope">Коллеги</option><option value="public">Все</option></select></label><div className="event-flags"><Check label="Закрепить" checked={event.is_pinned} onChange={(value) => change('is_pinned', value)}/><Check label="Размыть содержимое" checked={event.is_blurred} onChange={(value) => change('is_blurred', value)}/><Check label="Заблокировать правки" checked={event.is_locked} onChange={(value) => change('is_locked', value)}/><Check label="Комментарии" checked={event.comments_enabled ?? event.project?.event_comments_enabled ?? true} onChange={(value) => change('comments_enabled', value)}/></div></div>}
    {tab === 'diagram' && <div className="event-diagram-pane">{event.diagram?.svg ? <img src={svgDataUrl(event.diagram.svg)} alt="Схема события"/> : <div><IconAlertTriangle size={24}/><p>Схема ещё не нарисована.</p></div>}<button onClick={() => setDiagramOpen(true)}>Открыть Excalidraw</button></div>}
    {tab === 'attachments' && <EventResourceLinks icon={IconPaperclip} rows={event.attachments || []} onChange={(rows) => change('attachments', rows)} label="вложение"/>}
    {tab === 'photos' && <EventResourceLinks icon={IconPhoto} rows={event.photos || []} onChange={(rows) => change('photos', rows)} label="фотографию" photos/>}
    {(save.error || remove.error) && <p className="eventor-error">{save.error?.message || remove.error?.message}</p>}
    <footer className="event-editor-footer"><button className="event-delete" onClick={() => window.confirm(`Удалить событие «${event.title}»?`) && remove.mutate()}><IconTrash size={15}/>Удалить</button><small>{save.isPending ? 'Сохраняю…' : save.isSuccess ? 'Сохранено' : 'Изменения сохраняются по полям'}</small></footer>
    {diagramOpen && <EventDiagramEditor event={event} onClose={() => setDiagramOpen(false)} onSave={(diagram) => save.mutateAsync({ diagram }).then(() => setDiagramOpen(false))}/>}
  </aside>;
}

function EventComments({ scopeId, eventId, onClose }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const key = ['event-comments', scopeId, eventId];
  const { data: comments = [], isLoading, error } = useQuery({ queryKey: key, queryFn: () => eventApi.comments(scopeId, eventId) });
  const send = useMutation({ mutationFn: () => eventApi.comment(scopeId, eventId, content), onSuccess: () => { setContent(''); queryClient.invalidateQueries({ queryKey: key }); queryClient.invalidateQueries({ queryKey: ['events', scopeId] }); } });
  return <aside className="event-comments"><header><div><small>Обсуждение</small><strong>Комментарии события</strong></div><button onClick={onClose}><IconX size={18}/></button></header><section>{isLoading && <p>Загружаю…</p>}{error && <p className="eventor-error">{error.message}</p>}{comments.map((comment) => <article key={comment.id}><header><strong>{comment.created_by?.name || 'Пользователь'}</strong><time>{new Date(comment.created_at).toLocaleString()}</time></header><p>{comment.content}</p></article>)}{!isLoading && !comments.length && <p className="event-comments-empty">Комментариев пока нет.</p>}</section><form onSubmit={(event) => { event.preventDefault(); if (content.trim()) send.mutate(); }}><textarea rows="3" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Написать комментарий…"/><button disabled={send.isPending}><IconSend size={16}/></button></form></aside>;
}

function EventDiagramEditor({ event, onClose, onSave }) {
  const [editor, setEditor] = useState(null);
  const [exporter, setExporter] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Автосохранение включено');
  const [initialScene] = useState(() => ({ elements: event.diagram?.elements || [], files: event.diagram?.files || {}, appState: event.diagram?.appState || {} }));
  const scene = useRef(initialScene);
  const timer = useRef(null);
  useEffect(() => { let alive = true; loadExcalidraw().then(({ Excalidraw, exportToSvg }) => { if (alive) { setEditor(() => Excalidraw); setExporter(() => exportToSvg); } }).catch(setError); return () => { alive = false; if (timer.current) window.clearTimeout(timer.current); }; }, []);
  const save = async (close = false) => { if (!exporter) return; if (timer.current) window.clearTimeout(timer.current); setStatus('Сохраняю…'); const svg = await exporter({ elements: scene.current.elements, appState: scene.current.appState, files: scene.current.files }); await onSave({ ...scene.current, svg: svg.outerHTML }); setStatus('Сохранено'); if (close) onClose(); };
  const scheduleSave = (elements, appState, files) => { scene.current = { elements, appState: { viewBackgroundColor: appState.viewBackgroundColor }, files }; setStatus('Есть изменения…'); if (timer.current) window.clearTimeout(timer.current); timer.current = window.setTimeout(() => void save(), 900); };
  const Excalidraw = editor;
  return <div className="excalidraw-editor-backdrop"><section className="excalidraw-editor-modal"><header><div><strong>Схема события</strong><small>{status}</small></div><button onClick={() => void save(true)}><IconX size={18}/></button></header><div className="excalidraw-editor-canvas">{error ? <div className="excalidraw-editor-loading">{error.message}</div> : !Excalidraw ? <div className="excalidraw-editor-loading">Загружаю Excalidraw…</div> : <Excalidraw initialData={initialScene} onChange={scheduleSave}/>}</div><footer><span>{status}</span><button className="primary" disabled={!exporter} onClick={() => void save(true)}>Сохранить и закрыть</button></footer></section></div>;
}

function EventResourceLinks({ icon: Icon, rows, onChange, label, photos = false }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const add = (submit) => { submit.preventDefault(); if (!url.trim()) return; onChange([...rows, { url: url.trim(), label: title.trim() || null }]); setUrl(''); setTitle(''); };
  return <section className={`event-resources ${photos ? 'event-resources--photos' : ''}`}><header><Icon size={18}/><div><strong>{photos ? 'Фотографии' : 'Вложения'}</strong><small>Ссылки сохраняются внутри события</small></div></header><div>{rows.map((row, index) => <article key={`${row.url}-${index}`}>{photos && <img src={row.url} alt={row.label || 'Фотография события'}/>}<a href={row.url} target="_blank" rel="noreferrer">{row.label || row.url}</a><button title="Убрать из события" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}><IconTrash size={14}/></button></article>)}</div>{!rows.length && <p>Пока ничего не прикреплено.</p>}<form onSubmit={add}><input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…"/><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Название или подпись"/><button><IconPlus size={15}/>Добавить {label}</button></form></section>;
}

function Select({ label, value, onChange, empty, rows }) { return <label>{label}<select value={value} onChange={onChange}><option value="">{empty}</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.key ? `${row.key} · ${row.title}` : row.name}</option>)}</select></label>; }
function Check({ label, checked, onChange }) { return <label><input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)}/>{label}</label>; }
function normalizeEventPayload(form) { return { ...form, type_id: form.type_id || null, project_id: form.project_id || null, requester_id: form.requester_id || null, starts_at: form.starts_at || null, ends_at: form.ends_at || null, location: form.location || null }; }
function excerpt(value) { const clean = (value || '').replace(/[#*_`>]/g, '').trim(); return clean.length > 220 ? `${clean.slice(0, 220)}…` : clean; }
function eventMoment(event) { return new Date(event.starts_at || event.occurred_at || event.created_at); }
function eventDate(event) { const value = eventMoment(event); return value.toLocaleDateString([], { day: '2-digit', month: 'short', year: value.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }); }
function eventTime(event) { return event.is_all_day ? 'Весь день' : eventMoment(event).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function monthLabel(date) { return date.toLocaleDateString([], { month: 'long', year: 'numeric' }); }
function startMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function dateKey(date) { const value = new Date(date); const offset = value.getTimezoneOffset() * 60000; return new Date(value.getTime() - offset).toISOString().slice(0, 10); }
function calendarDays(month) { const first = new Date(month.getFullYear(), month.getMonth(), 1); const start = new Date(first); start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; }); }
function localDateTime(value) { if (!value) return ''; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function movedDates(event, day) { const start = eventMoment(event); const target = new Date(`${day}T${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`); const payload = { starts_at: localDateTime(target) }; if (event.ends_at) { const duration = new Date(event.ends_at).getTime() - start.getTime(); payload.ends_at = localDateTime(new Date(target.getTime() + duration)); } return payload; }
function svgDataUrl(svg) { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }
