import { Link } from 'react-router-dom';
import { IconFileDescription, IconPlus } from '@tabler/icons-react';
import { defaultStructureFilters } from '../entities/content-navigation/structure';

export function LightbookLibrary({ scopeId, list, filters, setFilters, projects, catalog, onCreate }) {
  const section = catalog.sections?.find((row) => row.id === filters.section_id);
  const title = section?.name || (filters.section_id === 'none' ? 'Без секции' : filters.section_id ? 'Выбранная секция' : 'Все документы');
  const setFilter = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  return <div className="lightbook-library">
    <header className="lightbook-library-heading"><div><h1>{title}</h1><small>Lightbook{list.data ? ` · Документов: ${list.data.length}` : ''}</small></div><button type="button" disabled={!scopeId} onClick={onCreate}><IconPlus size={16}/>Новый документ</button></header>
    <div className="lightbook-filters">
      <input type="search" aria-label="Поиск документов" value={filters.q} onChange={setFilter('q')} placeholder="Найти документ…"/>
      <select aria-label="Фильтр по проекту" value={filters.project_id} onChange={setFilter('project_id')}><option value="">Все проекты</option><option value="none">Без проекта</option>{projects.map((row) => <option key={row.id} value={row.id}>{row.key} · {row.title}</option>)}</select>
      <select aria-label="Фильтр по категории" value={filters.category_id} onChange={setFilter('category_id')}><option value="">Все категории</option><option value="none">Без категории</option>{catalog.categories?.map((row) => <option key={row.id} value={row.id}>{row.name}{row.is_archived ? ' (архив)' : ''}</option>)}</select>
      <button type="button" onClick={() => setFilters(defaultStructureFilters())}>Сбросить фильтры</button>
    </div>
    {!scopeId ? <p className="lightbook-library-state">Выберите скоуп для просмотра документов.</p> : <>
      {list.isPending && <p className="lightbook-library-state" role="status">Загружаю документы…</p>}
      {list.error && <p className="booker-error" role="alert">{list.error.message} <button type="button" onClick={() => list.refetch()}>Повторить</button></p>}
      <div className="lightbook-documents" aria-label="Документы Lightbook" aria-busy={list.isFetching}>
        {list.data?.map((entry) => {
          const sectionName = catalog.sections?.find((row) => row.id === entry.section_id)?.name;
          const categoryName = catalog.categories?.find((row) => row.id === entry.category_id)?.name;
          const updated = entry.updated_at ? new Date(entry.updated_at) : null;
          return <Link key={entry.id} className="lightbook-document-card" to={`/content/lightbooks/${entry.id}`}>
            <div className="lightbook-document-heading"><IconFileDescription size={20}/><h2>{entry.title}</h2></div>
            {entry.description && <p>{entry.description}</p>}
            <div className="lightbook-document-meta"><span>{entry.project ? [entry.project.key, entry.project.title].filter(Boolean).join(' · ') : 'Без проекта'}</span><span>{sectionName || 'Без секции'}{categoryName ? ` · ${categoryName}` : ''}</span></div>
            <footer><span>{entry.visibility === 'public' ? 'Публичный' : entry.visibility === 'scope' ? 'В скоупе' : 'Приватный'}</span>{updated && !Number.isNaN(updated.getTime()) && <time dateTime={entry.updated_at}>Обновлён {updated.toLocaleDateString()}</time>}</footer>
          </Link>;
        })}
      </div>
      {!list.isPending && !list.error && !list.data?.length && <div className="lightbook-library-state"><IconFileDescription size={32}/><h2>Документов не найдено</h2><p>Попробуйте другую секцию или сбросьте фильтры. Новый документ можно создать в выбранной секции.</p><button type="button" onClick={() => setFilters(defaultStructureFilters())}>Сбросить фильтры</button></div>}
    </>}
  </div>;
}
