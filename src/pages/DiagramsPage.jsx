import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { IconArrowLeft, IconCopy, IconDownload, IconEdit, IconLink, IconPlus, IconSchema, IconTrash, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { diagramApi } from '../entities/diagram/api';
import { canEditDiagram, diagramHref, diagramTargetTypes, downloadDiagramXml, svgImageSrc } from '../entities/diagram/model';
import { DiagramEditorModal } from '../shared/ui/DiagramEditorModal';
import { ContentNodeBrowser } from '../shared/ui/ContentNodeBrowser';

export function DiagramsPage() {
  const { activeScope } = useWorkspace();
  const { scopeId, diagramId } = useParams();
  if (!activeScope) return <main className="diagrams-page">Выберите скоуп.</main>;
  if (scopeId && scopeId !== activeScope.id) return <main className="diagrams-page"><p className="diagram-error">Этот скоуп недоступен.</p></main>;
  return diagramId ? <DiagramPage key={`${scopeId}:${diagramId}`} scopeId={scopeId} id={diagramId}/> : <DiagramLibrary key={activeScope.id} scopeId={activeScope.id}/>;
}

function DiagramLibrary({ scopeId }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [project, setProject] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const options = useQuery({ queryKey: ['diagram-options', scopeId], queryFn: () => diagramApi.options(scopeId) });
  const { data, error, isPending } = useQuery({ queryKey: ['diagrams', scopeId, query, project, page], queryFn: ({ signal }) => diagramApi.list(scopeId, { q: query, project_id: project, page }, signal) });
  return <main className="diagrams-page"><header className="diagram-heading"><IconSchema size={24}/><div><h1>Схемы</h1><small>Общая библиотека · XML в нашей базе</small></div>{options.data?.can_create && <button className="diagram-primary" onClick={() => setCreating(true)}><IconPlus size={16}/>Новая схема</button>}</header>
    <div className="diagram-filters"><input aria-label="Найти схему" placeholder="Найти схему…" value={search} onChange={(event) => setSearch(event.target.value)}/><select aria-label="Проект" value={project} onChange={(event) => { setProject(event.target.value); setPage(1); }}><option value="">Все проекты</option>{options.data?.projects.map((item) => <option key={item.id} value={item.id}>{item.key} · {item.title}</option>)}</select></div>
    {(error || options.error) && <p className="diagram-error" role="alert">{error?.message || options.error.message}</p>}
    {isPending ? <p className="diagram-empty">Загружаю схемы…</p> : !error && !data?.data.length ? <p className="diagram-empty">Схем пока нет. Создайте первую — и используйте её в разных модулях.</p> : null}
    {!!data?.data.length && <div className="diagram-table-wrap"><table className="diagram-table"><thead><tr><th>Схема</th><th>Проект / доступ</th><th>Автор</th><th>Изменена</th></tr></thead><tbody>{data.data.map((item) => <tr key={item.id}><td><Link to={diagramHref(scopeId, item.id)}>{item.title}</Link><p>{item.description}</p></td><td>{item.project?.key || 'Без проекта'}<small>{item.visibility === 'private' ? 'Личная' : 'В скоупе'} · v{item.revision}</small></td><td>{item.creator?.name || '—'}</td><td>{new Date(item.updated_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>}
    <footer className="diagram-pagination"><button disabled={page === 1 || isPending} onClick={() => setPage(page - 1)}>Назад</button><span>Страница {page}</span><button disabled={!data?.meta.has_more || isPending} onClick={() => setPage(page + 1)}>Далее</button></footer>
    {creating && <DiagramCreateModal scopeId={scopeId} projects={options.data?.projects || []} onClose={() => setCreating(false)} onCreated={(item) => navigate(`${diagramHref(scopeId, item.id)}?edit=1`)}/>}
  </main>;
}

function DiagramCreateModal({ scopeId, projects, onCreated, onClose }) {
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [allowMemberEditing, setAllowMemberEditing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { onCreated(await diagramApi.save(scopeId, null, { title, project_id: project || null, visibility, allow_member_editing: allowMemberEditing })); }
    catch (failure) { setError(failure.message); setBusy(false); }
  };
  return createPortal(<div className="diagram-backdrop"><form className="diagram-modal" role="dialog" aria-modal="true" aria-label="Новая схема" onSubmit={save}><header><h2>Новая схема</h2><button type="button" disabled={busy} aria-label="Закрыть" onClick={onClose}><IconX size={18}/></button></header>
    <label>Название<input autoFocus required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)}/></label>
    <label>Проект<select value={project} onChange={(event) => setProject(event.target.value)}><option value="">Без проекта</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.key} · {item.title}</option>)}</select></label>
    <label>Доступ<select value={visibility} onChange={(event) => { setVisibility(event.target.value); if (event.target.value === 'private') setAllowMemberEditing(false); }}><option value="private">Личная — только автор</option><option value="scope">В скоупе, с учётом доступа к проекту</option></select></label>
    <DiagramMemberEditingField projectId={project} visibility={visibility} value={allowMemberEditing} onChange={setAllowMemberEditing}/>
    {error && <p className="diagram-error">{error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>Отмена</button><button className="diagram-primary" disabled={busy || !title.trim()}>{busy ? 'Создаю…' : 'Создать и рисовать'}</button></footer>
  </form></div>, document.body);
}

function DiagramPage({ scopeId, id }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(params.get('edit') === '1');
  const [viewing, setViewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(false);
  const [version, setVersion] = useState(null);
  const [linking, setLinking] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const queryKey = ['diagram', scopeId, id];
  const query = useQuery({ queryKey, queryFn: ({ signal }) => diagramApi.get(scopeId, id, signal), refetchOnWindowFocus: !editing });
  const options = useQuery({ queryKey: ['diagram-options', scopeId], queryFn: () => diagramApi.options(scopeId) });
  const versions = useQuery({ queryKey: ['diagram-revisions', scopeId, id], queryFn: () => diagramApi.revisions(scopeId, id), enabled: history });
  const selectedVersion = useQuery({ queryKey: ['diagram-revision', scopeId, id, version], queryFn: () => diagramApi.revision(scopeId, id, version), enabled: Boolean(version) });
  const item = query.data;
  const saved = (result) => { client.setQueryData(queryKey, result); void client.invalidateQueries({ queryKey: ['diagrams', scopeId] }); void client.invalidateQueries({ queryKey: ['diagram-revisions', scopeId, id] }); };
  const perform = async (action) => { setBusy(true); setError(''); try { await action(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } };
  if (query.isPending) return <main className="diagrams-page">Загружаю схему…</main>;
  if (query.error) return <main className="diagrams-page"><Link to="/content/diagrams">← Все схемы</Link><p className="diagram-error" role="alert">{query.error.message}</p></main>;
  const visible = version ? selectedVersion.data : item;
  const copyLink = () => perform(async () => { await navigator.clipboard.writeText(`${window.location.origin}${diagramHref(scopeId, id)}`); setCopied(true); setTimeout(() => setCopied(false), 1800); });
  const duplicate = (title) => perform(async () => { const copy = await diagramApi.duplicate(scopeId, id, title); await client.invalidateQueries({ queryKey: ['diagrams', scopeId] }); setDuplicating(false); navigate(diagramHref(scopeId, copy.id)); });
  return <main className="diagrams-page"><header className="diagram-heading"><Link to="/content/diagrams" aria-label="Все схемы"><IconArrowLeft size={20}/></Link><div><h1>{item.title}</h1><small>{item.creator?.name} · версия {item.revision}</small></div><div className="diagram-actions">
    <button onClick={copyLink}><IconLink size={15}/>{copied ? 'Скопировано' : 'Ссылка'}</button><button onClick={() => downloadDiagramXml(visible?.xml || item.xml, item.title)}><IconDownload size={15}/>XML</button>
    <button onClick={() => setViewing(true)} disabled={Boolean(version && selectedVersion.isPending)}>Просмотр на весь экран</button>
    {options.data?.can_create && <button disabled={busy} onClick={() => { setError(''); setDuplicating(true); }}><IconCopy size={15}/>Дублировать</button>}
    {canEditDiagram(item) && !version && <button className="diagram-primary" onClick={() => setEditing(true)}><IconEdit size={15}/>Редактировать</button>}
  </div></header>{error && <p className="diagram-error" role="alert">{error}</p>}
    {version && <div className="diagram-version-banner">Просмотр сохранённой версии {visible?.number} · без редактирования <button onClick={() => setVersion(null)}>К актуальной схеме</button></div>}
    <div className="diagram-layout"><div className="diagram-canvas" onDoubleClick={() => setViewing(true)}>
      {selectedVersion.isFetching && version ? <p>Загружаю версию…</p> : visible?.preview_svg ? <img src={svgImageSrc(visible.preview_svg)} alt={item.title} draggable={false}/> : <div className="diagram-empty"><IconSchema size={46}/><p>{version ? 'У этой версии нет превью.' : 'Пока нет превью схемы.'}</p>{canEditDiagram(item) && !version && <button onClick={() => setEditing(true)}>Открыть редактор</button>}</div>}
      <small className="diagram-canvas-hint">Двойной клик — просмотр, масштаб и навигация</small>
      {selectedVersion.error && version && <p className="diagram-error">{selectedVersion.error.message}</p>}
    </div><aside className="diagram-properties">
      <DiagramSettings key={`${item.id}:${item.revision}`} item={item} projects={options.data?.projects || []} onSave={(data) => perform(async () => saved(await diagramApi.save(scopeId, id, { ...data, revision: item.revision })))} busy={busy} readOnly={!item.can_manage || editing}/>
      <section><header><h2>Связи</h2>{item.can_manage && <button disabled={busy} onClick={() => setLinking(true)}><IconPlus size={14}/>Связать</button>}</header><p className="diagram-note">Связи не меняют доступ к схеме.</p>{item.attachments.map((attachment) => <div className="diagram-attachment" key={attachment.attachment_id}><Link to={attachment.href}>{diagramTargetTypes[attachment.type]}: {attachment.code || attachment.title}</Link>{item.can_manage && <button disabled={busy} title="Убрать связь" onClick={() => perform(async () => { await diagramApi.detach(scopeId, id, attachment.attachment_id); await client.invalidateQueries({ queryKey }); })}><IconX size={14}/></button>}</div>)}</section>
      <section><button className="diagram-history-toggle" aria-expanded={history} onClick={() => setHistory(!history)}>История версий {history ? '▴' : '▾'}</button>{history && <div className="diagram-history">{versions.isPending && <small>Загружаю…</small>}{versions.error && <p className="diagram-error">{versions.error.message}</p>}{versions.data?.map((revision) => <button key={revision.id} className={version === revision.id ? 'active' : ''} onClick={() => setVersion(revision.number === item.revision ? null : revision.id)}>v{revision.number} · {new Date(revision.created_at).toLocaleString()}<small>{revision.creator?.name}</small></button>)}</div>}</section>
      {item.can_delete && <button className="diagram-delete" disabled={busy} onClick={() => { if (window.confirm('Удалить схему из библиотеки и всех мест прикрепления? История останется в базе.')) void perform(async () => { await diagramApi.remove(scopeId, id); await client.invalidateQueries({ queryKey: ['diagrams', scopeId] }); navigate('/content/diagrams'); }); }}><IconTrash size={14}/>Удалить схему</button>}
    </aside></div>
    {editing && canEditDiagram(item) && <DiagramEditorModal scopeId={scopeId} diagram={item} onSaved={saved} onClose={() => { setEditing(false); if (params.has('edit')) setParams({}, { replace: true }); }}/>}
    {viewing && <ContentNodeBrowser scopeId={scopeId} initialNode={{ type: 'diagram', id, title: item.title, versionId: version || undefined }} onClose={() => { setViewing(false); void client.invalidateQueries({ queryKey }); }}/>}
    {linking && <DiagramLinkModal scopeId={scopeId} diagramId={id} onClose={() => setLinking(false)} onSaved={saved}/>}
    {duplicating && <DiagramDuplicateModal title={item.title} busy={busy} error={error} onClose={() => setDuplicating(false)} onConfirm={duplicate}/>}
  </main>;
}

function DiagramDuplicateModal({ title, busy, error, onClose, onConfirm }) {
  const [value, setValue] = useState(`${title.slice(0, 245)} — копия`);
  return createPortal(<div className="diagram-backdrop"><form className="diagram-modal" role="dialog" aria-modal="true" aria-label="Дублировать схему" onSubmit={(event) => { event.preventDefault(); onConfirm(value); }}><header><h2>Независимая копия</h2><button type="button" disabled={busy} aria-label="Закрыть" onClick={onClose}><IconX size={18}/></button></header><label>Название копии<input autoFocus required maxLength={255} value={value} onChange={(event) => setValue(event.target.value)}/></label><p className="diagram-note">Скопируются схема и описание. Доступ будет личным, история начнётся заново, связи оригинала не переносятся.</p>{error && <p className="diagram-error">{error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>Отмена</button><button disabled={busy || !value.trim()} className="diagram-primary">{busy ? 'Копирую…' : 'Создать копию'}</button></footer></form></div>, document.body);
}

function DiagramSettings({ item, projects, onSave, busy, readOnly }) {
  const [draft, setDraft] = useState({ title: item.title, description: item.description || '', project_id: item.project_id || '', visibility: item.visibility, allow_member_editing: Boolean(item.allow_member_editing) });
  const change = (key) => (event) => setDraft((value) => ({ ...value, [key]: event.target.value, ...(key === 'visibility' && event.target.value === 'private' ? { allow_member_editing: false } : {}) }));
  return <form onSubmit={(event) => { event.preventDefault(); onSave({ ...draft, project_id: draft.project_id || null }); }}><h2>Настройки</h2><fieldset disabled={busy || readOnly}>
    <label>Название<input required maxLength={255} value={draft.title} onChange={change('title')}/></label><label>Описание<textarea rows={3} maxLength={10000} value={draft.description} onChange={change('description')}/></label>
    <label>Проект<select value={draft.project_id} onChange={change('project_id')}><option value="">Без проекта</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.title}</option>)}</select></label>
    <label>Доступ<select value={draft.visibility} onChange={change('visibility')}><option value="private">Личная — только автор</option><option value="scope">В скоупе, с учётом проекта</option></select></label>
    <DiagramMemberEditingField projectId={draft.project_id} visibility={draft.visibility} value={draft.allow_member_editing} onChange={(allow_member_editing) => setDraft((value) => ({ ...value, allow_member_editing }))}/>
    {!readOnly && <button disabled={busy} className="diagram-primary">Сохранить настройки</button>}
  </fieldset></form>;
}

function DiagramMemberEditingField({ projectId, visibility, value, onChange }) {
  return <label>Совместное редактирование<select disabled={visibility === 'private'} value={value ? 'members' : 'owner'} onChange={(event) => onChange(event.target.value === 'members')}>
    <option value="owner">Только автор и владелец скоупа</option>
    <option value="members">{projectId ? 'Разрешить участникам проекта' : 'Разрешить участникам скоупа'}</option>
  </select><small className="diagram-note">{visibility === 'private' ? 'Сначала откройте схему скоупу. Личные схемы не видны коллегам.' : 'С учётом прав аккаунта. Настройки доступа и удаление остаются у автора и владельца.'}</small></label>;
}

export function DiagramLinkModal({ scopeId, diagramId, onClose, onSaved }) {
  const [type, setType] = useState('task');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const timer = setTimeout(() => setQuery(search), 250); return () => clearTimeout(timer); }, [search]);
  const candidates = useQuery({ queryKey: ['diagram-targets', scopeId, type, query], queryFn: ({ signal }) => diagramApi.targets(scopeId, type, query, signal) });
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { onSaved(await diagramApi.attach(scopeId, diagramId, type, target)); onClose(); }
    catch (failure) { setError(failure.message); setBusy(false); }
  };
  return createPortal(<div className="diagram-backdrop"><form className="diagram-modal" role="dialog" aria-modal="true" aria-label="Прикрепить схему" onSubmit={save}><header><h2>Прикрепить схему</h2><button type="button" disabled={busy} aria-label="Закрыть" onClick={onClose}><IconX size={18}/></button></header>
    <label>Тип<select value={type} onChange={(event) => { setType(event.target.value); setTarget(''); setSearch(''); }}>{Object.entries(diagramTargetTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label>Поиск<input value={search} onChange={(event) => { setSearch(event.target.value); setTarget(''); }} placeholder="Название или код…"/></label><label>Объект<select required value={target} onChange={(event) => setTarget(event.target.value)}><option value="">{candidates.isFetching ? 'Загружаю…' : 'Выберите объект'}</option>{candidates.data?.map((item) => <option key={item.id} value={item.id}>{item.code ? `${item.code} · ` : ''}{item.title}</option>)}</select></label>
    <p className="diagram-note">Это ссылка, не копия. Приватная схема останется приватной. Для прикрепления нужен доступ к изменению объекта.</p>
    {(error || candidates.error) && <p className="diagram-error">{error || candidates.error.message}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>Отмена</button><button className="diagram-primary" disabled={busy || !target || candidates.isFetching}>Прикрепить</button></footer>
  </form></div>, document.body);
}
