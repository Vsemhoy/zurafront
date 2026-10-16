import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { IconLink, IconSchema } from '@tabler/icons-react';
import { diagramApi } from '../../entities/diagram/api';
import { diagramHref } from '../../entities/diagram/model';
import '../../pages/ContentPage.css';

export function DiagramAttachmentsPanel({ scopeId, type, id, readOnly = false }) {
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const timer = setTimeout(() => setQuery(search), 250); return () => clearTimeout(timer); }, [search]);
  const key = ['diagram-attachments', scopeId, type, id];
  const linked = useQuery({ queryKey: [...key, page], queryFn: ({ signal }) => diagramApi.list(scopeId, { subject_type: type, subject_id: id, page }, signal) });
  const candidates = useQuery({ queryKey: ['diagrams', scopeId, 'attach', query], queryFn: ({ signal }) => diagramApi.list(scopeId, { q: query }, signal), enabled: !readOnly });
  const attach = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await diagramApi.attach(scopeId, selected, type, id); await client.invalidateQueries({ queryKey: key }); await client.invalidateQueries({ queryKey: ['diagram', scopeId, selected] }); setSelected(''); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  return <section className="diagram-attachments-panel"><header><IconSchema size={19}/><strong>Прикреплённые схемы</strong><Link to="/content/diagrams">Вся библиотека</Link></header>
    {!readOnly && <form onSubmit={attach}><input aria-label="Поиск схемы для прикрепления" placeholder="Найти схему…" value={search} onChange={(event) => { setSearch(event.target.value); setSelected(''); }}/><select aria-label="Схема" required value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">{candidates.isFetching ? 'Загружаю…' : 'Выберите схему'}</option>{candidates.data?.data.filter((item) => item.can_manage).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><button disabled={busy || !selected || candidates.isFetching}><IconLink size={15}/>Прикрепить</button></form>}
    {(error || linked.error || candidates.error) && <p className="diagram-error" role="alert">{error || linked.error?.message || candidates.error.message}</p>}
    <p className="diagram-note">Схемы не копируются. Их доступы проверяются независимо от места прикрепления.</p>
    <div className="diagram-attachments-list">{linked.isPending ? <p>Загружаю…</p> : !linked.data?.data.length && !linked.error ? <p>Схем пока нет.</p> : linked.data?.data.map((item) => <div key={item.id}><Link to={diagramHref(scopeId, item.id)}>{item.title}</Link><small>v{item.revision}</small></div>)}</div>
    <footer className="diagram-pagination"><button disabled={page === 1 || linked.isPending} onClick={() => setPage(page - 1)}>Назад</button><span>Страница {page}</span><button disabled={!linked.data?.meta.has_more || linked.isPending} onClick={() => setPage(page + 1)}>Далее</button></footer>
  </section>;
}
