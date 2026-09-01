import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  IconAdjustments,
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
  ['project', 'Проекты', IconFolder],
  ['book', 'Книги', IconBook2],
  ['book_page', 'Страницы', IconFileText],
  ['book_block', 'Блоки Booker', IconCode],
];

const statusOptions = [
  ['todo', 'К выполнению'],
  ['planned', 'Запланировано'],
  ['in_progress', 'В работе'],
  ['review', 'Проверка'],
  ['done', 'Готово'],
  ['blocked', 'Заблокировано'],
  ['planning', 'Проект: планируется'],
  ['active', 'Проект: активный'],
  ['on_hold', 'Проект: на паузе'],
  ['completed', 'Проект: завершён'],
];

export function SearchPage() {
  const { activeScope } = useWorkspace();
  const scopeId = activeScope?.id;
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [types, setTypes] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters = useMemo(() => ({
    q: query,
    types: types.join(','),
    project_id: projectId,
    user_id: userId,
    status,
    date_from: dateFrom,
    date_to: dateTo,
    limit: 200,
  }), [dateFrom, dateTo, projectId, query, status, types, userId]);

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
  const { data: users = [] } = useQuery({
    queryKey: ['contractors-assignable', scopeId],
    queryFn: () => contractorApi.assignable(scopeId),
    enabled: Boolean(scopeId),
  });

  const counts = Object.fromEntries((search.data?.facets ?? []).map((facet) => [facet.type, facet.count]));
  const hasFilters = Boolean(types.length || projectId || userId || status || dateFrom || dateTo);
  const toggleType = (type) => setTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  const reset = () => {
    setTypes([]);
    setProjectId('');
    setUserId('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
  };
  return (
    <main className="search-page">
      <header className="search-page-header">
        <div><IconSearch size={22} /><span><small>По всему скоупу</small><h1>Поиск</h1></span></div>
        <SearchForm key={query} query={query} onSearch={(next) => setParams(next ? { q: next } : {})} />
      </header>

      <section className="search-type-filters">
        <button className={!types.length ? 'active' : ''} onClick={() => setTypes([])}>
          Всё <small>{search.data?.total ?? 0}</small>
        </button>
        {entityTypes.map(([type, label, Icon]) => (
          <button key={type} className={types.includes(type) ? 'active' : ''} onClick={() => toggleType(type)}>
            <Icon size={14} />{label}<small>{counts[type] ?? 0}</small>
          </button>
        ))}
      </section>

      <div className="search-layout">
        <aside className="search-refinements">
          <header><IconAdjustments size={16} /><strong>Уточнить</strong>{hasFilters && <button onClick={reset}>Сбросить</button>}</header>
          <label>Проект<select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Все проекты</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.title}</option>)}</select></label>
          <label>Участник<select value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Все участники</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}{user.position ? ` · ${user.position}` : ''}</option>)}</select></label>
          <label>Статус<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Любой статус</option>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="search-date-range"><label>Создано от<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label>до<input type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label></div>
          <p>Поиск учитывает только доступные вам проекты и книги.</p>
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
      <footer>{item.meta?.status && <span>{item.meta.status}</span>}{item.meta?.project?.title && <span><i style={{ background: item.meta.project.color }} />{item.meta.project.key} · {item.meta.project.title}</span>}<time>{formatDate(item.updated_at)}</time></footer>
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
  return <div className="search-welcome"><IconSearch size={38} /><h2>Найдём что угодно</h2><p>Ищем в названиях, описаниях и результатах задач и проектов, а также по книгам, страницам и содержимому блоков Booker.</p></div>;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}
