import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  IconAdjustments,
  IconCalendarEvent,
  IconBook2,
  IconChecklist,
  IconCode,
  IconFileText,
  IconFolder,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../app/workspace';
import { contractorApi } from '../entities/contractor/api';
import { projectApi } from '../entities/project/api';
import { searchApi } from '../entities/search/api';
import './SearchPage.css';

const entityTypes = [
  ['task', 'Задачи', IconChecklist],
  ['lore', 'ЛОР', IconFileText],
  ['event', 'Ивентор', IconCalendarEvent],
  ['project', 'Проекты', IconFolder],
  ['book', 'Книги', IconBook2],
  ['book_page', 'Страницы', IconFileText],
  ['book_block', 'Блоки Booker', IconCode],
];

const statusOptions = [
  ['todo', 'К выполнению'],
  ['scheduled', 'Запланировано'],
  ['in_progress', 'В работе'],
  ['review', 'Проверка'],
  ['done', 'Готово'],
  ['blocked', 'Заблокировано'],
  ['planning', 'Проект: планируется'],
  ['active', 'Проект: активный'],
  ['on_hold', 'Проект: на паузе'],
  ['completed', 'Проект: завершён'],
  ['draft', 'Черновик'],
  ['published', 'Опубликовано'],
  ['archived', 'В архиве'],
  ['cancelled', 'Отменено'],
];

export function SearchPage() {
  const { activeScope } = useWorkspace();
  const scopeId = activeScope?.id;
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const requestedMode = params.get('type');
  const mode = requestedMode === 'all' || entityTypes.some(([type]) => type === requestedMode) ? requestedMode : 'task';
  const projectId = params.get('project_id') || '';
  const userId = params.get('user_id') || '';
  const taskMode = ['task', 'all'].includes(mode);
  const completedBy = taskMode ? params.get('completed_by') || '' : '';
  const createdBy = taskMode ? params.get('created_by') || '' : '';
  const status = params.get('status') || '';
  const dateFrom = params.get('date_from') || '';
  const dateTo = params.get('date_to') || '';
  const updateParam = (key, value) => setParams((current) => {
    const next = new URLSearchParams(current);
    next.set('type', mode);
    if (value) next.set(key, value); else next.delete(key);
    return next;
  });
  const selectMode = (type) => setParams((current) => {
    const next = new URLSearchParams(current);
    next.set('type', type);
    if (!['task', 'all'].includes(type)) {
      next.delete('completed_by');
      next.delete('created_by');
    }
    next.delete('status');
    return next;
  });
  const filters = useMemo(() => ({
    q: query, types: mode === 'all' ? '' : mode,
    project_id: projectId, user_id: userId,
    completed_by: completedBy, created_by: createdBy,
    status, date_from: dateFrom, date_to: dateTo, limit: 200,
  }), [query, mode, projectId, userId, completedBy, createdBy, status, dateFrom, dateTo]);

  const search = useQuery({
    queryKey: ['global-search', scopeId, filters],
    queryFn: () => searchApi.find(scopeId, filters),
    enabled: Boolean(scopeId && query.trim().length >= 2),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', scopeId],
    queryFn: () => projectApi.list(scopeId),
    enabled: Boolean(scopeId),
  });
  const { data: userOptions } = useQuery({
    queryKey: ['contractors-assignable', scopeId],
    queryFn: () => contractorApi.assignable(scopeId),
    enabled: Boolean(scopeId),
  });
  const users = Array.isArray(userOptions?.people) ? userOptions.people : [];

  const visibleStatuses = { task: ['todo', 'scheduled', 'in_progress', 'review', 'done', 'blocked', 'cancelled'], project: ['planning', 'active', 'on_hold', 'completed'], lore: ['draft', 'scheduled', 'active', 'cancelled'], event: ['draft', 'published', 'archived'] };
  const statuses = mode === 'all' ? statusOptions : statusOptions.filter(([value]) => visibleStatuses[mode]?.includes(value));
  const counts = Object.fromEntries((search.data?.facets ?? []).map((facet) => [facet.type, facet.count]));
  const hasFilters = Boolean(projectId || userId || completedBy || createdBy || status || dateFrom || dateTo);
  const reset = () => setParams(query ? { q: query, type: mode } : { type: mode });
  return (
    <main className="search-page">
      <header className="search-page-header">
        <div><IconSearch size={22} /><span><small>По всему скоупу</small><h1>Поиск</h1></span></div>
        <SearchForm key={query} query={query} onSearch={(next) => updateParam('q', next)} />
      </header>

      <section className="search-type-filters">
        <button className={mode === 'all' ? 'active' : ''} onClick={() => selectMode('all')}>
          Всё {mode === 'all' && search.data && <small>{search.data.total}</small>}
        </button>
        {entityTypes.map(([type, label, Icon]) => (
          <button key={type} className={mode === type ? 'active' : ''} onClick={() => selectMode(type)}>
            <Icon size={14} />{label}{search.data && (mode === type || mode === 'all') && <small>{counts[type] ?? 0}</small>}
          </button>
        ))}
      </section>

      <div className="search-layout">
        <aside className="search-refinements">
          <header><IconAdjustments size={16} /><strong>Уточнить</strong>{hasFilters && <button onClick={reset}>Сбросить</button>}</header>
          <label>Проект<select value={projectId} onChange={(event) => updateParam('project_id', event.target.value)}><option value="">Все проекты</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.title}</option>)}</select></label>
          <label>Участник<select value={userId} onChange={(event) => updateParam('user_id', event.target.value)}><option value="">Все участники</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}{user.position ? ` · ${user.position}` : ''}</option>)}</select></label>
          {['task', 'all'].includes(mode) && <>
            <label>Выполнил<select value={completedBy} onChange={(event) => updateParam('completed_by', event.target.value)}><option value="">Любой исполнитель</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label>Поставил задачу<select value={createdBy} onChange={(event) => updateParam('created_by', event.target.value)}><option value="">Любой автор</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            {completedBy && <p>Только завершённые задачи выбранного исполнителя.</p>}
          </>}
          {statuses.length > 0 && <label>Статус<select value={status} onChange={(event) => updateParam('status', event.target.value)}><option value="">Любой статус</option>{statuses.map(([value, label]) => <option key={value} value={value}>{mode === 'lore' && value === 'active' ? 'Действует' : mode === 'lore' && value === 'scheduled' ? 'Запланировано' : label}</option>)}</select></label>}
          <div className="search-date-range"><label>Создано от<input type="date" value={dateFrom} onChange={(event) => updateParam('date_from', event.target.value)} /></label><label>до<input type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => updateParam('date_to', event.target.value)} /></label></div>
          <p>Поиск учитывает ваши права доступа к записям.</p>
        </aside>

        <section className="search-results">
          {query.trim().length < 2 && <SearchWelcome />}
          {search.isLoading && <div className="search-state">Ищу по скоупу…</div>}
          {search.error && <div className="search-state error">{search.error.message}</div>}
          {search.data && <header><strong>{search.data.total} результатов</strong><span>по запросу «{search.data.query}»</span></header>}
          {search.data?.results.map((item) => <SearchResult key={`${item.type}:${item.id}`} item={item} query={query} />)}
          {search.data && !search.data.results.length && <div className="search-state"><IconSearch size={30} /><strong>Ничего не нашли</strong><span>Попробуйте убрать часть фильтров или сократить запрос.</span></div>}
        </section>
      </div>
    </main>
  );
}

function SearchForm({ query, onSearch }) {
  const [draft, setDraft] = useState(query);
  return <form onSubmit={(event) => { event.preventDefault(); onSearch(draft.trim()); }}>
    <IconSearch size={18} />
    <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Задача, проект, текст из ТЗ…" />
    {draft && <button type="button" title="Очистить" onClick={() => setDraft('')}><IconX size={16} /></button>}
    <button type="submit">Найти</button>
  </form>;
}

function SearchResult({ item, query }) {
  const config = entityTypes.find(([type]) => type === item.type);
  const Icon = config?.[2] ?? IconSearch;
  return <Link className="search-result" to={item.href}>
    <span className={`search-result-icon type-${item.type}`}><Icon size={17} /></span>
    <span className="search-result-content">
      <header><strong><Highlight value={item.title} query={query} /></strong><small>{config?.[1] ?? item.type}</small></header>
      {item.subtitle && <div className="search-result-subtitle">{item.subtitle}</div>}
      {item.snippet && <p><Highlight value={item.snippet} query={query} /></p>}
      <footer>{item.type === 'task' && item.meta?.status === 'done' && item.meta?.user?.name && <span>Выполнил: {item.meta.user.name}</span>}{item.meta?.status && <span>{item.meta.status}</span>}{item.meta?.project?.title && <span><i style={{ background: item.meta.project.color }} />{item.meta.project.key} · {item.meta.project.title}</span>}<time>{formatDate(item.updated_at)}</time></footer>
    </span>
  </Link>;
}

function Highlight({ value, query }) {
  const text = String(value ?? '');
  const index = text.toLocaleLowerCase().indexOf(query.trim().toLocaleLowerCase());
  if (index < 0 || !query.trim()) return text;
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + query.trim().length)}</mark>{text.slice(index + query.trim().length)}</>;
}

function SearchWelcome() {
  return <div className="search-welcome"><IconSearch size={38} /><h2>Найдём что угодно</h2><p>Ищем в названиях, описаниях и результатах задач и проектов, а также по книгам, страницам, блокам Booker, записям ЛОР и событиям Ивентора.</p></div>;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}
