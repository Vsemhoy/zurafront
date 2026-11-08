import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft, IconCheck, IconEdit, IconFileDescription, IconHistory, IconListDetails, IconPlus, IconSettings, IconTrash, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { useAuth } from '../auth';
import { specifierApi } from '../entities/specifier/api';
import { acceptanceStates, agreementStates, changedSpecificationFields, implementationStates, itemDescendants, itemKinds, specificationDraftKey, specificationItemLink, specificationLevel, specificationOutline } from '../entities/specifier/model';
import { documentBlocks, specificationBlockTypes, specificationPlacementOrder } from '../entities/specifier/composition';
import { PointBlockStructure, SpecificationBlockFields, StructureBlockList } from './SpecificationStructure';
import { SpecificationReader } from './SpecificationReader';
import BaseMarkdownEditor from '../shared/ui/CompactMarkdownEditor';
import MarkdownRenderer from '../shared/ui/MarkdownRenderer';
import { CommentAuthor } from '../shared/ui/CommentAuthor';
import { EditorSaveBar } from '../shared/ui/EditorSaveBar';
import { useSaveForm } from '../shared/ui/useSaveForm';
import { useEditorLeaveGuard, useGuardedEditorAction } from '../shared/ui/editorGuard';
import './SpecifierPage.css';

const SpecifierOverlayContext = createContext(null);
function CompactMarkdownEditor(props) {
  const overlayContainer = useContext(SpecifierOverlayContext);
  return overlayContainer ? <BaseMarkdownEditor {...props} overlayContainer={overlayContainer}/> : null;
}

export function SpecifierPage() {
  const { activeScope } = useWorkspace();
  const { scopeId, specificationId } = useParams();
  const user = useAuth((state) => state.user);
  if (!activeScope) return <main className="sp-page">Выберите скоуп.</main>;
  if (scopeId && scopeId !== activeScope.id) return <main className="sp-page" role="alert">Этот скоуп недоступен. <Link to="/specifications">К спецификациям</Link></main>;
  return <SpecifierWorkspace key={`${user?.id}:${activeScope.id}:${specificationId ?? 'library'}`} scope={activeScope} id={specificationId}/>;
}

function SpecifierWorkspace({ scope, id }) {
  const navigate = useNavigate(), client = useQueryClient(), guard = useGuardedEditorAction();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({ q: '', project_id: '', status: '', page: 1 });
  const [dialog, setDialog] = useState(null);
  const pageTop = useRef(null);
  const outlinePanel = useRef(null);
  const [outlineOpen, setOutlineOpen] = useState(() => window.innerWidth > 700);
  const [inspectorOpen, setInspectorOpen] = useState(() => window.innerWidth > 1100);
  const [tab, setTab] = useState('structure');
  const options = useQuery({ queryKey: ['specifier-options', scope.id], queryFn: () => specifierApi.options(scope.id) });
  const library = useQuery({ queryKey: ['specifications', scope.id, filters], queryFn: ({ signal }) => specifierApi.list(scope.id, filters, signal), enabled: !id });
  const document = useQuery({ queryKey: ['specification', scope.id, id], queryFn: () => specifierApi.show(scope.id, id), enabled: Boolean(id), refetchInterval: 15000 });
  const record = document.data;
  const accept = (value) => { client.setQueryData(['specification', scope.id, value.id], value); client.invalidateQueries({ queryKey: ['specifications', scope.id] }); };
  const compositionInitial = useMemo(() => ({ revision: record?.revision, blocks: documentBlocks(record, record?.items) }), [record]);
  const canCompose = record?.can_write && record.status === 'draft';
  const linkedItemId = params.get('item');
  const showStructure = tab === 'structure' || linkedItemId === null;
  const composition = useSaveForm({ initial: compositionInitial, key: specificationDraftKey, label: 'Структура документа',
    active: Boolean(canCompose && inspectorOpen && linkedItemId === null && !dialog),
    persist: async (draft, baseline) => {
      const value = await specifierApi.composition(scope.id, id, baseline.revision, draft.blocks);
      accept(value);
      return { revision: value.revision, blocks: value.composition };
    } });
  const blocks = composition.dirty ? composition.draft.blocks : compositionInitial.blocks;
  const outline = useMemo(() => specificationOutline(record?.items, specificationPlacementOrder(record?.items, blocks)), [record?.items, blocks]);
  const level = useMemo(() => specificationLevel(outline, linkedItemId), [outline, linkedItemId]);
  const selected = level.point;
  const childrenById = useMemo(() => new Map(level.children.map((item) => [item.id, item])), [level.children]);
  useEffect(() => {
    if (id) pageTop.current?.scrollIntoView({ block: 'start' });
  }, [id, linkedItemId]);
  useEffect(() => {
    const panel = outlinePanel.current;
    const active = panel?.querySelector('[aria-current="location"]');
    if (!active) return;
    const viewport = panel.getBoundingClientRect();
    const row = active.getBoundingClientRect();
    if (row.top < viewport.top) panel.scrollTop += row.top - viewport.top;
    else if (row.bottom > viewport.bottom) panel.scrollTop += row.bottom - viewport.bottom;
  }, [outlineOpen, linkedItemId, selected?.id]);
  const update = useMutation({ mutationFn: async (operation) => { const value = await operation(); accept(value); return value; } });
  const select = (itemId) => {
    if (itemId === linkedItemId) return;
    guard(() => {
      setTab('structure');
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        if (itemId === null) next.delete('item');
        else next.set('item', itemId);
        return next;
      }, { preventScrollReset: true });
    });
  };
  const open = (value) => guard(() => setDialog(value));
  const refresh = () => { document.refetch(); options.refetch(); };
  const canEditLevel = record?.status === 'draft' && (selected ? selected.can_write : record?.can_write);
  return <main className="sp-page" ref={pageTop}>
    <header className="sp-heading"><div><small>{scope.name} · {record?.code || 'Требования и проверяемые результаты'}</small><h1>{selected?.title || record?.title || 'Specifier'}</h1></div>
      {id ? <div className="sp-actions"><Link to="/specifications"><IconArrowLeft size={16}/>Все документы</Link><button onClick={() => setOutlineOpen(!outlineOpen)} aria-pressed={outlineOpen}><IconListDetails size={16}/>Оглавление</button><button onClick={() => guard(() => setInspectorOpen(!inspectorOpen))} aria-pressed={inspectorOpen}><IconSettings size={16}/>Панель</button>{record?.can_write && linkedItemId === null && <button onClick={() => open({ type: 'document' })}><IconSettings size={16}/>Свойства</button>}</div>
        : options.data?.can_create && <button className="sp-primary" onClick={() => open({ type: 'document' })}><IconPlus size={16}/>Новая спецификация</button>}
    </header>
    {(options.error || library.error || document.error || update.error) && <p className="sp-error" role="alert">{options.error?.message || library.error?.message || document.error?.message || update.error?.message} <button onClick={() => id ? refresh() : library.refetch()}>Обновить данные</button></p>}
    {!id && <>
      <div className="sp-filters"><input aria-label="Поиск спецификаций" placeholder="Название документа…" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value, page: 1 })}/><select aria-label="Проект" value={filters.project_id} onChange={(event) => setFilters({ ...filters, project_id: event.target.value, page: 1 })}><option value="">Все проекты</option>{options.data?.projects.map((row) => <option key={row.id} value={row.id}>{row.key} · {row.title}</option>)}</select><select aria-label="Состояние документа" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}><option value="">Все редакции</option><option value="draft">Черновики</option><option value="approved">Утверждённые</option></select></div>
      <p className="sp-hint">Спецификация фиксирует, что должно получиться. Закрытые задачи не заменяют проверку и приёмку требований.</p>
      {library.isPending && <p role="status">Загружаю спецификации…</p>}
      <div className="sp-library">{library.data?.data.map((row) => <Link key={row.id} to={`/specifications/${scope.id}/${row.id}`} className="sp-card"><header><span>{row.code}</span><small>{row.status === 'approved' ? 'Утверждено' : 'Черновик'}</small></header><h2>{row.title}</h2>{row.description && <p>{row.description}</p>}<footer><span>{row.project?.key || 'Без проекта'}</span><span>Принято {row.accepted_count ?? 0} / {row.requirements_count ?? 0}</span></footer></Link>)}</div>
      {!library.isPending && !library.error && !library.data?.data.length && <div className="sp-empty"><IconFileDescription size={32}/><h2>Здесь появятся спецификации</h2><p>Создайте документ, добавьте разделы и требования, назначьте ответственных.</p></div>}
      {library.data?.meta?.last_page > 1 && <div className="sp-pagination"><button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Назад</button><span>{filters.page} / {library.data.meta.last_page}</span><button disabled={filters.page >= library.data.meta.last_page} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Далее</button></div>}
    </>}
    {id && document.isPending && <p role="status">Загружаю документ…</p>}
    {id && record && <>
      <div className="sp-document-bar"><span className={`sp-document-state ${record.status}`}>{record.status === 'approved' ? 'Утверждённая редакция · контент защищён' : 'Рабочий черновик'}</span><span>Принято {record.summary.accepted} из {record.summary.requirements} требований</span>
        <SpecificationExportActions key={record.id} scope={scope} specification={record}/>
        <div className="sp-actions">{record.can_write && record.status === 'draft' && <button className="sp-primary" onClick={() => open({ type: 'item', parent_id: selected?.id ?? null })}><IconPlus size={15}/>Новый пункт</button>}{record.can_approve && <button disabled={update.isPending} onClick={() => guard(() => { if (window.confirm(record.status === 'approved' ? 'Открыть рабочую редакцию? Утверждённый снимок останется неизменным.' : 'Зафиксировать и утвердить текущее содержимое всего документа?')) update.mutate(() => specifierApi.approve(scope.id, id, record.revision, record.status === 'approved')); })}><IconCheck size={15}/>{record.status === 'approved' ? 'Новая редакция' : 'Утвердить редакцию'}</button>}</div>
      </div>
      <div className={`sp-document-layout ${outlineOpen ? 'has-outline' : ''} ${inspectorOpen ? 'has-inspector' : ''}`}>
        {outlineOpen && <aside className="sp-outline" ref={outlinePanel}><header><strong>Дерево спецификации</strong><small>{outline.length}</small></header>
          <nav aria-label="Дерево спецификации">
            <button type="button" className="sp-outline-root" aria-current={linkedItemId === null ? 'location' : undefined} onClick={() => select(null)}><IconFileDescription size={15}/><strong>{record.title}</strong></button>
            {outline.map((item) => <button type="button" key={item.id} style={{ '--sp-depth': Math.min(item.depth, 6) }} aria-current={selected?.id === item.id ? 'location' : undefined} onClick={() => select(item.id)}><span>{item.outline}</span><strong>{item.title}</strong><i className={`sp-dot ${item.acceptance_status}`}/></button>)}
          </nav>
          {!outline.length && <p>Добавьте первый пункт.</p>}
          <div className="sp-versions"><strong><IconHistory size={14}/>Утверждённые версии</strong>{record.revisions.map((version) => <button key={version.id} onClick={() => open({ type: 'version', version })}>Версия {version.version} · {new Date(version.created_at).toLocaleDateString()}</button>)}{!record.revisions.length && <p>Снимков пока нет.</p>}</div>
        </aside>}
        <SpecificationReader document={record} level={level} blocks={blocks} onNavigate={select}
          onEditBlock={canEditLevel && !level.missing ? (blockId) => open({ type: 'block', itemId: selected?.id, blockId }) : undefined}
          onEditPoint={canEditLevel && selected ? (item) => open({ type: 'item', item }) : undefined}
          onCopyPoint={(itemId) => void navigator.clipboard.writeText(new URL(specificationItemLink(scope.id, id, itemId), window.location.origin).href)}/>
        {inspectorOpen && !level.missing && <aside className="sp-inspector"><header><div><small>{selected ? `${record.code} · P-${selected.number}` : record.code}</small><strong>{selected?.title || 'Документ'}</strong></div><button aria-label="Скрыть панель" onClick={() => guard(() => setInspectorOpen(false))}><IconX size={17}/></button></header>
          <nav className="sp-inspector-tabs">{[['structure', 'Структура'], ...(selected ? [['properties', 'Свойства'], ['tasks', `Задачи (${selected.tasks.length})`], ['comments', 'Обсуждение']] : [])].map(([value, title]) => <button key={value} className={tab === value || (!selected && value === 'structure') ? 'active' : ''} onClick={() => { if (value !== tab) guard(() => setTab(value)); }}>{title}</button>)}</nav>
          {showStructure && selected && <PointBlockStructure key={selected.id} scope={scope} document={record} item={selected} childrenById={childrenById} onSelect={select}
            onAddPoint={(subpointsGroupId) => open({ type: 'item', subpointsGroupId, parent_id: selected.id })} active={!dialog} onPersisted={accept}/>}
          {showStructure && !selected && <>
            <StructureBlockList key="root" blocks={blocks} editable={Boolean(canCompose && !composition.busy)} itemsById={childrenById} onSelect={select}
              onChange={(next) => composition.change((old) => ({ ...old, blocks: next }))}
              onAddPoint={(masterId) => open({ type: 'item', masterId, parent_id: null })}
              savedGroupIds={new Set(compositionInitial.blocks.filter(({ type }) => type === 'master').map(({ id: masterId }) => masterId))}/>
            {composition.error && <p className="sp-error" role="alert">{composition.error}</p>}
            {canCompose && <EditorSaveBar {...composition} onSave={composition.save}/>}
          </>}
          {selected && <>
            {tab === 'properties' && <PointProperties key={selected.id} scope={scope} document={record} item={selected} options={options.data} onChanged={accept} active={!dialog} onEdit={() => open({ type: 'item', item: selected })} onDelete={() => guard(() => { if (window.confirm('Удалить пункт и его дочерние пункты? Задачи и утверждённые снимки останутся.')) update.mutate(() => specifierApi.removeItem(scope.id, id, selected.id, record.revision)); })}/>}
            {tab === 'tasks' && <div className="sp-item-tasks"><p className="sp-hint">Задачи описывают работу. Их завершение не меняет приёмку пункта.</p>{selected.can_write && <div className="sp-actions">{record.can_derive_tasks && <button onClick={() => open({ type: 'task', item: selected })}><IconPlus size={15}/>Создать задачу</button>}{record.can_link_tasks && <button onClick={() => open({ type: 'link', item: selected })}>Привязать</button>}</div>}{selected.tasks.map((task) => <Link key={task.id} to={`/tasks/${task.id}/edit`}><small>{task.task_key} · {task.status}</small><strong>{task.title}</strong></Link>)}{!selected.tasks.length && <p className="sp-hint">Связанных доступных задач пока нет.</p>}</div>}
            {tab === 'comments' && <PointComments key={selected.id} scope={scope} document={record} item={selected} active={!dialog} onChanged={accept}/>}</>}
        </aside>}
      </div>
    </>}
    {dialog?.type === 'document' && <SpecificationForm scope={scope} document={record} options={options.data} onPersisted={accept} onClose={() => setDialog(null)} onSaved={(value) => { setDialog(null); if (!id) navigate(`/specifications/${scope.id}/${value.id}`); }} onDeleted={() => { client.invalidateQueries({ queryKey: ['specifications', scope.id] }); navigate('/specifications'); }}/>} 
    {dialog?.type === 'item' && record && <PointEditor scope={scope} document={record} item={dialog.item} parentId={dialog.parent_id} masterId={dialog.masterId} subpointsGroupId={dialog.subpointsGroupId} options={options.data} onPersisted={accept} onClose={() => setDialog(null)} onSaved={() => setDialog(null)}/>}
    {dialog?.type === 'block' && record && <SpecificationBlockEditor scope={scope} document={record} itemId={dialog.itemId} blockId={dialog.blockId} onPersisted={accept} onClose={() => setDialog(null)}/>}
    {dialog?.type === 'task' && <DerivedTaskForm scope={scope} document={record} item={dialog.item} onClose={() => setDialog(null)} onPersisted={(value) => { accept(value.specification); ['tasks', 'task-assignable', 'planner'].forEach((key) => client.invalidateQueries({ queryKey: [key, scope.id] })); }} onSaved={() => setDialog(null)}/>} 
    {dialog?.type === 'link' && <TaskLinkPicker scope={scope} document={record} item={dialog.item} onClose={() => setDialog(null)} onSaved={(value) => { accept(value); setDialog(null); }}/>} 
    {dialog?.type === 'version' && <SpecificationVersion scope={scope} document={record} version={dialog.version} onClose={() => setDialog(null)}/>} 
  </main>;
}

const pointProperties = (document, item) => ({ revision: document.revision, responsible_id: item.responsible_id ?? '', agreement_status: item.agreement_status, implementation_status: item.implementation_status, acceptance_status: item.acceptance_status, acceptance_note: item.acceptance_note ?? '' });
function PointProperties({ scope, document, item, options, onChanged, active, onEdit, onDelete }) {
  const initial = useMemo(() => pointProperties(document, item), [document, item]);
  const form = useSaveForm({ initial, key: specificationDraftKey, label: 'Свойства пункта', active: active && (item.can_write || document.can_review), persist: async (draft, baseline) => {
    const changed = changedSpecificationFields(draft, baseline);
    if ('responsible_id' in changed) changed.responsible_id ||= null;
    const value = await specifierApi.item(scope.id, document.id, item.id, { ...changed, revision: baseline.revision });
    onChanged(value); return pointProperties(value, value.items.find((row) => row.id === item.id));
  } });
  const draft = form.draft;
  const set = (key) => (event) => form.change((old) => ({ ...old, [key]: event.target.value }));
  return <div className="sp-properties"><label>Ответственный<select value={draft.responsible_id} disabled={!document.can_write || form.busy} onChange={set('responsible_id')}><option value="">Не назначен</option>{options?.people.map((person) => <option key={person.id} value={person.id}>{person.name}{person.type === 'agent' ? ' · агент' : ''}</option>)}</select></label>
    {[[agreementStates, 'agreement_status', 'Согласование', !document.can_review], [implementationStates, 'implementation_status', 'Исполнение', !item.can_write], [acceptanceStates, 'acceptance_status', 'Приёмка', !document.can_review || item.kind !== 'requirement']].map(([states, key, title, disabled]) => <label key={key}>{title}<select value={draft[key]} disabled={disabled || form.busy} onChange={set(key)}>{Object.entries(states).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>)}
    <label>Основание проверки<textarea rows={4} value={draft.acceptance_note} disabled={!document.can_review || form.busy} onChange={set('acceptance_note')} placeholder="Что проверили, результат, ссылки на подтверждения…"/></label>
    {item.accepted_revision && <p className="sp-hint">Принята редакция содержимого {item.accepted_revision}. Сейчас — {item.content_revision}.</p>}
    {form.error && <p role="alert" className="sp-error">{form.error}</p>}{(item.can_write || document.can_review) && <EditorSaveBar {...form} onSave={form.save}/>}
    {document.status === 'draft' && item.can_write && <button className="sp-wide" onClick={onEdit}><IconEdit size={15}/>Редактировать содержимое</button>}
    {document.status === 'draft' && document.can_write && <div className="sp-actions"><button className="sp-danger" onClick={onDelete}><IconTrash size={15}/>Удалить ветку</button></div>}
  </div>;
}

function SpecifierModal({ title, onClose, children, wide = false, markdown = false }) {
  const [element, setElement] = useState(null);
  useEffect(() => { if (!element) return; element.showModal(); element.querySelector('input:not([disabled]), textarea:not([disabled])')?.focus(); return () => element.close(); }, [element]);
  return <dialog ref={setElement} className={`sp-dialog ${wide ? 'sp-dialog--wide' : ''} ${markdown ? 'sp-dialog--markdown' : ''}`} aria-labelledby="sp-dialog-title" onCancel={(event) => { event.preventDefault(); onClose(); }}><header><h2 id="sp-dialog-title">{title}</h2><button type="button" aria-label="Закрыть" onClick={onClose}><IconX size={19}/></button></header><SpecifierOverlayContext.Provider value={element}>{children}</SpecifierOverlayContext.Provider></dialog>;
}

function SpecificationBlockEditor({ scope, document, itemId, blockId, onPersisted, onClose }) {
  const ref = useRef(null);
  const [controlsContainer, setControlsContainer] = useState(null);
  const [initial] = useState(() => {
    const item = itemId ? document.items.find(({ id }) => id === itemId) : null;
    const blocks = itemId ? (item?.blocks ?? []) : documentBlocks(document, document.items);
    const lead = itemId ? item?.content : document.description;
    return {
      revision: document.revision,
      blocks,
      block: itemId && !item ? null : blockId === null ? { type: 'markdown', text: lead ?? '' } : blocks.find(({ id }) => id === blockId) ?? null,
    };
  });
  const label = blockId === null ? (itemId ? 'Основной текст' : 'Введение') : specificationBlockTypes[initial.block?.type];
  const form = useSaveForm({ initial, key: specificationDraftKey, label: label || 'Блок', active: Boolean(initial.block),
    validate: () => Boolean(ref.current?.reportValidity()),
    persist: async (draft, baseline) => {
      const nextBlocks = baseline.blocks.map((block) => block.id === blockId ? draft.block : block);
      const value = itemId
        ? await specifierApi.item(scope.id, document.id, itemId, { revision: baseline.revision, ...(blockId === null ? { content: draft.block.text } : { blocks: nextBlocks }) })
        : blockId === null
          ? await specifierApi.update(scope.id, document.id, { revision: baseline.revision, description: draft.block.text })
          : await specifierApi.composition(scope.id, document.id, baseline.revision, nextBlocks);
      onPersisted(value);
      return { ...draft, revision: value.revision, blocks: nextBlocks };
    },
    onSubmitted: onClose,
  });
  if (!initial.block) return <SpecifierModal title="Блок недоступен" onClose={onClose}><p>Блок удалён или не был сохранён.</p></SpecifierModal>;
  const change = (patch) => form.change((draft) => ({ ...draft, block: { ...draft.block, ...patch } }));
  const isMarkdown = ['markdown', 'callout'].includes(initial.block.type);
  const markdown = isMarkdown && <div className="sp-markdown">
    {controlsContainer && <CompactMarkdownEditor value={initial.block.text} onChange={(text) => change({ text })} onSave={() => Promise.resolve()} controlsContainer={controlsContainer} toolbarInitiallyOpen hideToolbarTrigger variant="full" placeholder="Текст блока…"/>}
  </div>;
  return <SpecifierModal title={`Редактировать блок: ${label}`} onClose={() => form.leave(onClose)} wide={isMarkdown || ['code', 'svg'].includes(initial.block.type)} markdown={isMarkdown}>
    <form ref={ref} onSubmit={(event) => { event.preventDefault(); void form.save(); }}>
      <fieldset disabled={form.busy}><SpecificationBlockFields block={form.draft.block} lead={blockId === null} onChange={change} markdown={markdown} markdownControlsRef={isMarkdown ? setControlsContainer : undefined}/></fieldset>
      {form.error && <p className="sp-error" role="alert">{form.error}</p>}
      <EditorSaveBar {...form} onSave={form.save}/>
    </form>
  </SpecifierModal>;
}

function SpecificationForm({ scope, document, options, onClose, onSaved, onPersisted, onDeleted }) {
  const ref = useRef(null);
  const savedDocument = useRef(null);
  const initial = useMemo(() => ({ title: document?.title ?? '', description: document?.description ?? '', project_id: document?.project_id ?? '', visibility: document?.visibility ?? 'private', revision: document?.revision }), [document]);
  const form = useSaveForm({ initial, key: specificationDraftKey, label: 'Спецификация', validate: () => ref.current.reportValidity(), persist: async (draft, baseline) => {
    const changed = changedSpecificationFields(draft, baseline);
    if ('project_id' in changed) changed.project_id ||= null;
    const value = document ? await specifierApi.update(scope.id, document.id, { ...changed, revision: baseline.revision }) : await specifierApi.create(scope.id, { ...draft, project_id: draft.project_id || null });
    savedDocument.current = value; onPersisted(value); return { ...draft, revision: value.revision };
  }, onSubmitted: () => { if (savedDocument.current) onSaved(savedDocument.current); } });
  const remove = useMutation({ mutationFn: () => specifierApi.remove(scope.id, document.id, document.revision), onSuccess: onDeleted });
  return <SpecifierModal title={document ? 'Свойства спецификации' : 'Новая спецификация'} onClose={() => form.leave(onClose)}><form ref={ref} onSubmit={(event) => { event.preventDefault(); void form.save(); }}><fieldset disabled={form.busy || (document && document.status === 'approved')}>
    <label>Название<input autoFocus required maxLength={255} value={form.draft.title} onChange={(event) => form.change({ ...form.draft, title: event.target.value })}/></label><label>Проект<select disabled={Boolean(document?.items.length)} value={form.draft.project_id} onChange={(event) => form.change({ ...form.draft, project_id: event.target.value })}><option value="">Без проекта</option>{options?.projects.map((row) => <option key={row.id} value={row.id}>{row.key} · {row.title}</option>)}</select></label><label>Видимость<select value={form.draft.visibility} onChange={(event) => form.change({ ...form.draft, visibility: event.target.value })}><option value="private">Только создатель</option><option value="scope">В скоупе с учётом проекта</option></select></label><label>Введение · Markdown<textarea rows={5} maxLength={50000} value={form.draft.description} onChange={(event) => form.change({ ...form.draft, description: event.target.value })}/></label>
  </fieldset>{document?.status === 'approved' && <p className="sp-hint">Для изменения содержимого откройте новую редакцию.</p>}{(form.error || remove.error) && <p className="sp-error" role="alert">{form.error || remove.error.message}</p>}<footer>{document?.can_delete && <button type="button" className="sp-danger" disabled={form.dirty || form.busy || remove.isPending} onClick={() => window.confirm('Удалить спецификацию? Задачи и исторические данные не будут удалены.') && remove.mutate()}><IconTrash size={15}/>Удалить</button>}<EditorSaveBar {...form} disabled={document?.status === 'approved'} onSave={form.save}/></footer></form></SpecifierModal>;
}

function PointEditor({ scope, document, item, parentId, masterId, subpointsGroupId, options, onClose, onSaved, onPersisted }) {
  const ref = useRef(null);
  const savedDocument = useRef(null);
  const initial = useMemo(() => ({ revision: document.revision, title: item?.title ?? '', kind: item?.kind ?? 'requirement', parent_id: item?.parent_id ?? parentId ?? '', content: item?.content ?? '', acceptance_criteria_text: (item?.acceptance_criteria ?? []).join('\n'), responsible_id: item?.responsible_id ?? '' }), [document.revision, item, parentId]);
  const forbidden = item ? itemDescendants(document.items, item.id) : new Set();
  const form = useSaveForm({ initial, key: specificationDraftKey, label: 'Содержимое пункта', validate: () => ref.current.reportValidity(), persist: async (draft, baseline) => {
    const fields = item ? changedSpecificationFields(draft, baseline) : { ...draft };
    if ('acceptance_criteria_text' in fields) { fields.acceptance_criteria = fields.acceptance_criteria_text.split('\n').map((line) => line.trim()).filter(Boolean); delete fields.acceptance_criteria_text; }
    for (const key of ['parent_id', 'responsible_id']) if (key in fields) fields[key] ||= null;
    const placement = item ? {} : subpointsGroupId ? { subpoints_group_id: subpointsGroupId } : masterId ? { master_id: masterId } : {};
    const value = await specifierApi.item(scope.id, document.id, item?.id, { ...fields, ...placement, revision: baseline.revision });
    savedDocument.current = value; onPersisted(value); return { ...draft, revision: value.revision };
  }, onSubmitted: () => { if (savedDocument.current) onSaved(savedDocument.current); } });
  const set = (key) => (event) => form.change((old) => ({ ...old, [key]: event.target.value }));
  return <SpecifierModal title={item ? `Редактировать P-${item.number}` : subpointsGroupId ? 'Новый подпункт' : 'Новый пункт'} onClose={() => form.leave(onClose)} wide><form ref={ref} onSubmit={(event) => { event.preventDefault(); void form.save(); }}><div className="sp-modal-save"><EditorSaveBar {...form} onSave={form.save}/></div><fieldset disabled={form.busy}><label>Название<input autoFocus required maxLength={255} value={form.draft.title} onChange={set('title')}/></label><div className="sp-form-row"><label>Тип<select value={form.draft.kind} onChange={set('kind')}>{Object.entries(itemKinds).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label><label>Родитель<select disabled={!document.can_write || Boolean(subpointsGroupId)} value={form.draft.parent_id} onChange={set('parent_id')}><option value="">В корне</option>{specificationOutline(document.items).filter((row) => !forbidden.has(row.id)).map((row) => <option key={row.id} value={row.id}>{row.outline} · {row.title}</option>)}</select></label></div><label>Ответственный<select disabled={!document.can_write} value={form.draft.responsible_id} onChange={set('responsible_id')}><option value="">Не назначен</option>{options?.people.map((row) => <option key={row.id} value={row.id}>{row.name}{row.type === 'agent' ? ' · агент' : ''}</option>)}</select></label></fieldset><div className="sp-markdown"><CompactMarkdownEditor value={initial.content} onChange={(content) => form.change((old) => ({ ...old, content }))} onSave={() => Promise.resolve()} toolbarInitiallyOpen hideToolbarTrigger variant="full" placeholder="Суть пункта, ограничения, примеры, ссылки на схемы…"/></div><label>Критерии приёмки · по одному на строку<textarea rows={4} maxLength={100000} value={form.draft.acceptance_criteria_text} onChange={set('acceptance_criteria_text')}/></label>{form.error && <p className="sp-error" role="alert">{form.error}</p>}<p className="sp-hint">Изменение определения пункта сбрасывает согласование и приёмку, но сохраняет историю и связи с задачами.</p></form></SpecifierModal>;
}

function DerivedTaskForm({ scope, document, item, onClose, onSaved, onPersisted }) {
  const ref = useRef(null), identity = useRef(crypto.randomUUID());
  const savedTask = useRef(null);
  const initial = useMemo(() => ({ title: '', description: '', revision: document.revision }), [document.revision]);
  const form = useSaveForm({ initial, key: specificationDraftKey, label: 'Новая задача из пункта', validate: () => ref.current.reportValidity(), persist: async (draft) => { savedTask.current = await specifierApi.deriveTask(scope.id, document.id, item.id, { ...draft, idempotency_key: identity.current }); onPersisted(savedTask.current); return draft; }, onSubmitted: () => { if (savedTask.current) onSaved(savedTask.current); } });
  const changeDraft = form.change;
  useEffect(() => { changeDraft((draft) => ({ ...draft, title: item.title.slice(0, 255), description: `Источник: [${document.code} · P-${item.number}](${specificationItemLink(scope.id, document.id, item.id)})` })); }, [changeDraft, document.code, document.id, item.id, item.number, item.title, scope.id]);
  return <SpecifierModal title={`Задача из P-${item.number}`} onClose={() => form.leave(onClose)}><form ref={ref} onSubmit={(event) => { event.preventDefault(); void form.save(); }}><label>Задача<input autoFocus required maxLength={255} value={form.draft.title} onChange={(event) => form.change({ ...form.draft, title: event.target.value })}/></label><label>Описание · Markdown<textarea rows={7} value={form.draft.description} onChange={(event) => form.change({ ...form.draft, description: event.target.value })}/></label><p className="sp-hint">Проект наследуется от спецификации. Ответственный человек подставляется исполнителем, агент — делегатом. Приватность документа не переносится на задачу: её видимость определяет Таскер. Содержимое пункта не копируется автоматически.</p>{form.error && <p role="alert" className="sp-error">{form.error}</p>}<button type="submit" className="sp-primary" disabled={form.busy}>{form.busy ? 'Создаю…' : 'Создать задачу'}</button></form></SpecifierModal>;
}

function TaskLinkPicker({ scope, document, item, onClose, onSaved }) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(1);
  const candidates = useQuery({ queryKey: ['specifier-candidates', scope.id, document.id, search, page], queryFn: () => specifierApi.candidates(scope.id, document.id, search, page) });
  const link = useMutation({ mutationFn: (id) => specifierApi.linkTask(scope.id, document.id, item.id, document.revision, id), onSuccess: onSaved });
  const available = candidates.data?.data.filter((row) => !item.tasks.some((task) => task.id === row.id)) ?? [];
  return <SpecifierModal title="Привязать задачу" onClose={() => { if (!link.isPending) onClose(); }}>
    <input autoFocus aria-label="Найти задачу" placeholder="Код или название…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/>
    {(candidates.error || link.error) && <p role="alert" className="sp-error">{candidates.error?.message || link.error?.message}</p>}
    <div className="sp-candidates">{available.map((task) => <button key={task.id} disabled={link.isPending} onClick={() => link.mutate(task.id)}><small>{task.task_key} · {task.status}</small><strong>{task.title}</strong></button>)}{candidates.isPending && <p>Загружаю…</p>}{!candidates.isPending && !available.length && <p>На этой странице нет непривязанных доступных задач.</p>}</div>
    {candidates.data?.meta.last_page > 1 && <div className="sp-pagination"><button disabled={page <= 1 || link.isPending} onClick={() => setPage(page - 1)}>Назад</button><span>{page} / {candidates.data.meta.last_page}</span><button disabled={page >= candidates.data.meta.last_page || link.isPending} onClick={() => setPage(page + 1)}>Далее</button></div>}
  </SpecifierModal>;
}

function PointComments({ scope, document, item, active, onChanged }) {
  const client = useQueryClient();
  const [page, setPage] = useState(1), [content, setContent] = useState(''), [parent, setParent] = useState(null);
  const key = ['specifier-comments', scope.id, document.id, item.id];
  const comments = useQuery({ queryKey: [...key, page], queryFn: () => specifierApi.comments(scope.id, document.id, item.id, page) });
  const change = useMutation({ mutationFn: ({ commentId, text, parentId }) => specifierApi.comment(scope.id, document.id, item.id, { revision: document.revision, ...(commentId ? {} : { content: text, parent_id: parentId }) }, commentId), onSuccess: (value, variables) => { onChanged(value); client.invalidateQueries({ queryKey: key }); if (!variables.commentId) { setContent((current) => current === variables.text ? '' : current); setParent(null); setPage(1); } } });
  useEditorLeaveGuard({ label: 'Комментарий к пункту', dirty: Boolean(content.trim()), busy: change.isPending,
    isDirty: () => Boolean(content.trim()), isBusy: () => change.isPending,
    save: async () => { if (!content.trim()) return true; try { await change.mutateAsync({ text: content, parentId: parent?.id ?? null }); return true; } catch { return false; } },
    discard: () => { setContent(''); setParent(null); } }, active && item.can_write);
  return <div className="sp-comments">
    {(comments.error || change.error) && <p role="alert" className="sp-error">{comments.error?.message || change.error?.message}</p>}
    {comments.data?.data.map((comment) => <article key={comment.id} className={comment.parent_id ? 'reply' : ''}>
      <header><CommentAuthor author={comment.creator}/><time>{new Date(comment.created_at).toLocaleDateString()}</time></header>
      {comment.parent_id && <small>Ответ на комментарий</small>}<MarkdownRenderer>{comment.content}</MarkdownRenderer>
      <footer>{!comment.parent_id && item.can_write && <button disabled={change.isPending} onClick={() => setParent(comment)}>Ответить</button>}{comment.can_delete && <button disabled={change.isPending} onClick={() => window.confirm('Удалить комментарий и ответы на него?') && change.mutate({ commentId: comment.id })}>Удалить</button>}</footer>
    </article>)}
    {comments.isPending && <p>Загружаю обсуждение…</p>}{!comments.isPending && !comments.data?.data.length && <p className="sp-hint">Обсуждения пока нет.</p>}
    {comments.data?.meta.last_page > 1 && <div className="sp-pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Назад</button><span>{page}</span><button disabled={page >= comments.data.meta.last_page} onClick={() => setPage(page + 1)}>Далее</button></div>}
    {item.can_write && <form onSubmit={(event) => { event.preventDefault(); if (!change.isPending && content.trim()) change.mutate({ text: content, parentId: parent?.id ?? null }); }}>
      {parent && <p className="sp-hint">Ответ: {parent.content.slice(0, 60)} <button type="button" disabled={change.isPending} onClick={() => setParent(null)}>Отмена</button></p>}
      <textarea aria-label="Комментарий к пункту" required maxLength={20000} rows={4} disabled={change.isPending} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Комментарий · Markdown"/>
      <button className="sp-primary" disabled={!content.trim() || change.isPending}>Отправить</button>
    </form>}
  </div>;
}

function SpecificationExportActions({ scope, specification, version }) {
  const download = useMutation({ mutationFn: async (format) => {
    const response = await specifierApi.download(scope.id, specification.id, format, version?.id);
    const filename = response.headers.get('Content-Disposition')?.match(/filename="?([\w.-]+)"?/i)?.[1];
    const url = URL.createObjectURL(await response.blob());
    const link = window.document.createElement('a');
    link.href = url;
    link.download = filename ?? `${specification.code}.${format}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } });
  return <div className="sp-export" role="group" aria-label="Экспорт всей спецификации">
    <span>Экспорт</span>
    <button type="button" disabled={download.isPending} onClick={() => download.mutate('docx')} title="Скачать всё дерево в Word">Word</button>
    <button type="button" disabled={download.isPending} onClick={() => download.mutate('pdf')} title="Скачать всё дерево в PDF">PDF</button>
    {download.isPending && <span role="status">Готовлю файл…</span>}
    {download.error && <span className="sp-export-error" role="alert">{download.error.message}</span>}
  </div>;
}

function SpecificationVersion({ scope, document, version, onClose }) {
  const [itemId, setItemId] = useState(null);
  const query = useQuery({ queryKey: ['specification-version', scope.id, document.id, version.id], queryFn: () => specifierApi.version(scope.id, document.id, version.id) });
  const snapshot = query.data?.snapshot;
  const blocks = documentBlocks(snapshot ? { ...snapshot.document, composition: snapshot.composition } : null, snapshot?.items);
  const level = specificationLevel(specificationOutline(snapshot?.items, specificationPlacementOrder(snapshot?.items, blocks)), itemId);
  return <SpecifierModal title={`Утверждённая версия ${version.version}`} onClose={onClose} wide>
    {query.isPending && <p>Загружаю снимок…</p>}{query.error && <p role="alert" className="sp-error">{query.error.message}</p>}
    {snapshot && <>
      <p className="sp-hint">Неизменяемый снимок · {new Date(query.data.created_at).toLocaleString()} · SHA-256 {query.data.content_hash.slice(0, 12)}…</p>
      <SpecificationExportActions scope={scope} specification={document} version={version}/>
      <SpecificationReader document={{ ...snapshot.document, code: document.code }} level={level} blocks={blocks} onNavigate={setItemId} snapshot/>
    </>}
  </SpecifierModal>;
}
