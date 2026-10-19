import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { IconFileDescription, IconPlus, IconSettings, IconTrash, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { lightbookApi } from '../entities/lightbook/api';
import { projectApi } from '../entities/project/api';
import { BookPage, PageStructure } from './BookerPage';
import './LightbookPage.css';

export function LightbookPage() {
  const { activeScope } = useWorkspace();
  const { lightbookId, blockId } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState(false);
  const scopeId = activeScope?.id;
  const listKey = ['lightbooks', scopeId];
  const itemKey = ['lightbook', scopeId, lightbookId];
  const list = useQuery({ queryKey: listKey, queryFn: () => lightbookApi.list(scopeId), enabled: Boolean(scopeId) });
  const item = useQuery({ queryKey: itemKey, queryFn: () => lightbookApi.show(scopeId, lightbookId), enabled: Boolean(scopeId && lightbookId), refetchInterval: 15000 });
  const lightbook = item.data;
  const pageId = lightbook?.page_id;
  const pageKey = ['lightbook-page', scopeId, lightbookId, pageId];
  const pageQuery = useQuery({ queryKey: pageKey, queryFn: () => lightbookApi.page(scopeId, lightbookId, pageId), enabled: Boolean(scopeId && lightbookId && pageId), refetchInterval: 15000 });
  const page = pageQuery.data;
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: itemKey }),
      client.invalidateQueries({ queryKey: pageKey }),
      client.invalidateQueries({ queryKey: listKey }),
    ]);
  };
  useEffect(() => {
    if (!blockId || !page?.id) return;
    const frame = requestAnimationFrame(() => document.getElementById(`block-${blockId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    return () => cancelAnimationFrame(frame);
  }, [blockId, page?.id, page?.groups?.length]);
  return <main className="lightbook-page">
    <aside className="lightbook-list"><header><span><IconFileDescription size={18}/><strong>Lightbook</strong></span><button title="Новый документ" aria-label="Новый документ" onClick={() => setCreating(true)}><IconPlus size={17}/></button></header>
      <div>{list.isPending && <p>Загружаю документы…</p>}{list.error && <p className="booker-error">{list.error.message}</p>}{list.data?.map((entry) => <button key={entry.id} className={entry.id === lightbookId ? 'active' : ''} onClick={() => navigate(`/content/lightbooks/${entry.id}`)}><strong>{entry.title}</strong><small>{entry.project?.key || 'Без проекта'} · {new Date(entry.updated_at).toLocaleDateString()}</small></button>)}{!list.isPending && !list.data?.length && <p>Создайте первый одностраничный документ.</p>}</div>
    </aside>
    <section className="booker-content lightbook-content">{!lightbookId && <div className="lightbook-welcome"><IconFileDescription size={42}/><h1>Lightbook</h1><p>Инструкции, регламенты и другие самостоятельные документы без дерева страниц.</p><button onClick={() => setCreating(true)}><IconPlus size={16}/>Создать документ</button></div>}{(item.isPending || pageQuery.isPending) && lightbookId && <div className="booker-empty">Загружаю документ…</div>}{(item.error || pageQuery.error) && <p className="booker-error">{item.error?.message || pageQuery.error?.message}</p>}{lightbook && page && <><div className="lightbook-toolbar"><span>{lightbook.project?.key || 'Без проекта'} · {visibilityLabel(lightbook.visibility)}</span><button onClick={() => setSettings(true)}><IconSettings size={15}/>Свойства</button></div><BookPage scopeId={scopeId} scopeOwnerId={activeScope.owner_id} book={lightbook} bookCreatedBy={lightbook.created_by} bookId={lightbook.id} page={page} refresh={refresh} api={lightbookApi} cacheKey={pageKey}/></>}{lightbook && !pageQuery.isPending && !page && <div className="booker-empty">Страница документа не найдена.</div>}</section>
    {lightbook && page ? <PageStructure scopeId={scopeId} bookId={lightbook.id} pageId={page.id} page={page} editingBy={page.editing_by} groups={page.groups ?? []} refresh={refresh} api={lightbookApi} basePath={`/content/lightbooks/${lightbook.id}`}/> : <aside className="booker-structure"/>}
    {creating && <LightbookForm title="Новый Lightbook" submitLabel="Создать" onClose={() => setCreating(false)} onSubmit={async (payload) => { const created = await lightbookApi.create(scopeId, payload); await client.invalidateQueries({ queryKey: listKey }); setCreating(false); navigate(`/content/lightbooks/${created.id}`); }}/>} 
    {settings && lightbook && <LightbookForm title="Свойства документа" initial={lightbook} submitLabel="Сохранить" allowDelete onClose={() => setSettings(false)} onDelete={async () => { if (!window.confirm('Удалить Lightbook? Документ можно будет восстановить только из базы.')) return; await lightbookApi.delete(scopeId, lightbook.id); await client.invalidateQueries({ queryKey: listKey }); setSettings(false); navigate('/content/lightbooks'); }} onSubmit={async (payload) => { const updated = await lightbookApi.update(scopeId, lightbook.id, payload); client.setQueryData(itemKey, updated); client.setQueryData(['lightbook-page', scopeId, lightbook.id, updated.page_id], updated.page); await client.invalidateQueries({ queryKey: listKey }); setSettings(false); }}/>} 
  </main>;
}

function LightbookForm({ title, initial, submitLabel, onClose, onSubmit, onDelete, allowDelete }) {
  const { activeScope } = useWorkspace();
  const projects = useQuery({ queryKey: ['projects', activeScope?.id], queryFn: () => projectApi.list(activeScope.id), enabled: Boolean(activeScope) });
  const [draft, setDraft] = useState({ title: initial?.title ?? '', description: initial?.description ?? '', project_id: initial?.project_id ?? '', visibility: initial?.visibility ?? 'private', comments_enabled: initial?.comments_enabled !== false, version_depth: initial?.version_depth ?? 25 });
  const save = useMutation({ mutationFn: () => onSubmit({ ...draft, project_id: draft.project_id || null, version_depth: Number(draft.version_depth) }) });
  const remove = useMutation({ mutationFn: onDelete });
  return <div className="booker-modal-backdrop"><form className="booker-modal lightbook-form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><header><h2>{title}</h2><button type="button" aria-label="Закрыть" onClick={onClose}><IconX size={19}/></button></header><label>Название<input autoFocus required maxLength="255" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/></label><label>Проект<select value={draft.project_id} onChange={(event) => setDraft({ ...draft, project_id: event.target.value })}><option value="">Без проекта</option>{projects.data?.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.title}</option>)}</select></label><label>Видимость<select value={draft.visibility} onChange={(event) => setDraft({ ...draft, visibility: event.target.value })}><option value="private">Приватный</option><option value="scope">В скоупе</option><option value="public">Публичный</option></select></label><label>Глубина истории<input type="number" min="1" max="100" value={draft.version_depth} onChange={(event) => setDraft({ ...draft, version_depth: event.target.value })}/></label><label className="lightbook-checkbox"><input type="checkbox" checked={draft.comments_enabled} onChange={(event) => setDraft({ ...draft, comments_enabled: event.target.checked })}/>Комментарии включены</label><label>Описание<textarea rows="4" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/></label>{(save.error || remove.error) && <p className="booker-error">{save.error?.message || remove.error?.message}</p>}<footer>{allowDelete && <button className="lightbook-delete" type="button" disabled={remove.isPending} onClick={() => remove.mutate()}><IconTrash size={15}/>Удалить</button>}<span/><button type="button" onClick={onClose}>Отмена</button><button className="booker-primary" disabled={save.isPending}>{save.isPending ? 'Сохраняю…' : submitLabel}</button></footer></form></div>;
}

const visibilityLabel = (value) => value === 'public' ? 'публичный' : value === 'scope' ? 'в скоупе' : 'приватный';
