import { isSupportedBookBlock, visibleBookGroups } from '../../entities/book/blocks';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft, IconArrowRight, IconChevronRight, IconEdit, IconLink, IconPlus, IconRoute, IconSelect, IconX } from '@tabler/icons-react';
import { apiRequest } from '../../api';
import { contentNavigationApi } from '../../entities/content-navigation/api';
import { createTrail, followNode, moveTrail, nodeFromHref, nodeKey, nodeTypes, rememberVisit } from '../../entities/content-navigation/model';
import { diagramApi } from '../../entities/diagram/api';
import { canEditDiagram } from '../../entities/diagram/model';
import { DiagramViewport } from './DiagramViewport';
import { DiagramEditorModal } from './DiagramEditorModal';
import { FilePreview } from './FilePreview';
import MarkdownRenderer from './MarkdownRenderer';
import './ContentNodeBrowser.css';

export function ContentNodeBrowser({ scopeId, initialNode, onClose }) {
  const client = useQueryClient();
  const root = useRef(null);
  const [trail, setTrail] = useState(() => createTrail(initialNode));
  const [showLinks, setShowLinks] = useState(true);
  const [managing, setManaging] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const callbacks = useRef({ onClose, subModal: false });
  useEffect(() => { callbacks.current = { onClose, subModal: Boolean(form || editing) }; }, [onClose, form, editing]);
  const visit = trail.visits[trail.cursor];
  const queryKey = ['content-node', scopeId, visit.type, visit.id, visit.versionId || 'current'];
  const query = useQuery({ queryKey, queryFn: async ({ signal }) => {
    const node = await contentNavigationApi.get(scopeId, visit, signal);
    if (visit.type === 'diagram' && visit.versionId) {
      const version = await diagramApi.revision(scopeId, visit.id, visit.versionId);
      return { ...node, title: version.title, can_manage: false, can_edit: false, links: [], document: { ...node.document, ...version, id: visit.id, revision: version.number } };
    }
    return node;
  }, refetchOnWindowFocus: !editing });
  const node = query.error ? null : query.data;
  useEffect(() => {
    const dialog = root.current;
    const focus = document.activeElement;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    const app = document.getElementById('root');
    const wasInert = app?.inert;
    if (app) app.inert = true;
    document.body.style.overflow = 'hidden';
    root.current?.focus();
    const keyboard = (event) => {
      if (callbacks.current.subModal) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); callbacks.current.onClose(); }
      if (event.key === 'Tab') {
        const items = [...root.current.querySelectorAll('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]')].filter((item) => item.getClientRects().length);
        const index = items.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1)?.focus(); }
        else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0]?.focus(); }
      }
    };
    document.addEventListener('keydown', keyboard, true);
    return () => { document.removeEventListener('keydown', keyboard, true); dialog.close(); document.body.style.overflow = overflow; if (app) app.inert = wasInert; if (focus?.isConnected) focus.focus(); };
  }, []);
  const resetTools = () => { setDrawing(false); setManaging(false); setForm(null); setError(''); };
  const go = (target) => { resetTools(); setTrail((value) => followNode(node ? rememberVisit(value, { title: node.title }) : value, target)); };
  const jump = (cursor) => { resetTools(); setTrail((value) => moveTrail(node ? rememberVisit(value, { title: node.title }) : value, cursor)); };
  const internalLink = (href) => {
    const target = nodeFromHref(href, scopeId, window.location.origin);
    if (!target) return false;
    go(target); return true;
  };
  const remember = (patch) => setTrail((value) => {
    if (nodeKey(value.visits[value.cursor]) !== nodeKey(visit) || value.cursor !== trail.cursor) return value;
    return rememberVisit(value, { view: { ...value.visits[value.cursor].view, ...patch } });
  });
  const changed = (result) => { client.setQueryData(queryKey, result); void client.invalidateQueries({ queryKey: ['content-node', scopeId, visit.type, visit.id] }); };
  const remove = async (link) => {
    if (!window.confirm('Убрать эту навигационную ссылку? Сам документ останется.')) return;
    setBusy(true); setError('');
    try { await contentNavigationApi.remove(scopeId, visit, link.id); await client.invalidateQueries({ queryKey }); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const download = async () => {
    try {
      const blob = await apiRequest(`/scopes/${scopeId}/files/${visit.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob), anchor = document.createElement('a');
      anchor.href = url; anchor.download = node.document.name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { setError(failure.message); }
  };
  return createPortal(<dialog ref={root} className="document-browser" tabIndex={-1} aria-label="Браузер документов" onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); if (!callbacks.current.subModal) onClose(); }}>
    <header className="document-browser-header"><div className="document-history-buttons"><button aria-label="Назад по документам" disabled={trail.cursor === 0} onClick={() => jump(trail.cursor - 1)}><IconArrowLeft size={19}/></button><button aria-label="Вперёд по документам" disabled={trail.cursor === trail.visits.length - 1} onClick={() => jump(trail.cursor + 1)}><IconArrowRight size={19}/></button></div>
      <div className="document-browser-title"><small>{nodeTypes[visit.type]}{visit.versionId ? ' · сохранённая версия' : ''}</small><strong>{node?.title || visit.title || 'Загрузка…'}</strong></div>
      <button aria-pressed={showLinks} title="Показать или скрыть навигацию по документам" onClick={() => setShowLinks(!showLinks)}><IconRoute size={17}/><span>Навигация</span></button>
      {node?.can_manage && !visit.versionId && <button aria-label="Настроить связи" title="Настроить связи" aria-pressed={managing} onClick={() => { setManaging(!managing); setShowLinks(true); setDrawing(false); }}><IconLink size={17}/><span>Настроить связи</span></button>}
      {visit.type === 'diagram' && canEditDiagram(node) && !visit.versionId && <button aria-label="Редактировать схему" title="Редактировать схему" onClick={() => setEditing(node.document)}><IconEdit size={17}/><span>Редактировать схему</span></button>}
      <button aria-label="Закрыть браузер документов" onClick={onClose}><IconX size={22}/></button>
    </header>
    <nav className="document-breadcrumbs" aria-label="Путь просмотра">{trail.visits.slice(0, trail.cursor + 1).map((item, index, path) => <span key={index}>{index > 0 && <IconChevronRight size={13}/>}<button aria-current={index === trail.cursor ? 'page' : undefined} title={item.title || nodeTypes[item.type]} onClick={() => jump(index)}>{path.slice(0, index).some((previous) => nodeKey(previous) === nodeKey(item)) && <IconRoute size={12}/>}<small>{nodeTypes[item.type]}</small>{item.code || item.title || (index === trail.cursor ? node?.title : '') || item.id}</button></span>)}<em>Путь переходов, не иерархия</em></nav>
    {(error || query.error) && <div className="diagram-error" role="alert">{error || query.error.message}<button onClick={() => query.refetch()}>Повторить</button></div>}
    <div className={`document-browser-layout${showLinks && node && (node.links.length > 0 || managing) ? ' with-navigation' : ''}`}>
      <div className="document-browser-content" key={`${trail.cursor}:${nodeKey(visit)}`}>
        {query.isPending ? <p className="document-reader-state">Загружаю документ…</p> : !node ? <p className="document-reader-state">Документ недоступен или удалён. Можно вернуться к предыдущему.</p> : visit.type === 'diagram'
          ? <DiagramViewport diagram={node.document} links={node.links} showLinks={showLinks} drawing={drawing} onRegion={(region) => { setDrawing(false); setForm((value) => ({ ...value, region, sourceRevision: node.document.revision })); }} onFollow={go} remembered={visit.view} onRemember={remember}/>
          : visit.type === 'file' ? <FilePreview key={visit.id} embedded scopeId={scopeId} file={node.document} onDownload={download} onLink={internalLink}/>
            : <div className="document-reader-scroll" ref={(element) => { if (element && visit.view.scrollTop && element.scrollTop === 0) element.scrollTop = visit.view.scrollTop; }} onScroll={(event) => remember({ scrollTop: event.currentTarget.scrollTop })}><DocumentText node={node} onLink={internalLink}/></div>}
      </div>
      {showLinks && node && (node.links.length > 0 || managing) && <aside className="document-node-links"><header><strong>Переходы</strong><small>{node.links.length}</small></header>
        {managing && node.can_manage && <div className="document-link-tools"><button onClick={() => { setDrawing(false); setForm({ region: null }); }}><IconPlus size={16}/>Привязать документ</button>{visit.type === 'diagram' && <button aria-pressed={drawing} onClick={() => { setDrawing(!drawing); setForm(null); }}><IconSelect size={16}/>{drawing ? 'Отменить выделение' : 'Выделить рамку'}</button>}</div>}
        {drawing && <p>Протяните рамку на нужной области схемы. Затем выберите документ.</p>}
        {node.links.some((link) => link.region && link.source_revision !== node.document.revision) && <p className="document-stale-warning">Схема менялась после расстановки рамок. Проверьте их положение.</p>}
        {!node.links.length && <p>Ссылок пока нет. Настройка навигации необязательна.</p>}
        {node.links.map((link) => <div className="document-node-link" key={link.id}><button onClick={() => go(link.target)}><small>{nodeTypes[link.target.type]}{link.region ? ' · рамка' : ''}</small><strong>{link.label || link.target.title}</strong>{link.label && <span>{link.target.title}</span>}</button>{managing && node.can_manage && <div><button aria-label={`Изменить ссылку ${link.label || link.target.title}`} disabled={busy} onClick={() => setForm({ link, region: link.region })}><IconEdit size={14}/></button><button aria-label={`Убрать ссылку ${link.label || link.target.title}`} disabled={busy} onClick={() => remove(link)}><IconX size={14}/></button></div>}</div>)}
      </aside>}
    </div>
    {form && !drawing && <NavigationLinkForm key={form.link?.id || 'new'} scopeId={scopeId} node={node} form={form} onClose={() => setForm(null)} onRedraw={(draft) => { setForm((value) => ({ ...value, draft })); setDrawing(true); }} onDone={(result) => { changed(result); setForm(null); }}/>} 
    {editing && <DiagramEditorModal nativeDialog scopeId={scopeId} diagram={editing} onSaved={(result) => { client.setQueryData(['diagram', scopeId, visit.id], result); void client.invalidateQueries({ queryKey: ['content-node', scopeId, 'diagram', visit.id] }); void client.invalidateQueries({ queryKey: ['diagrams', scopeId] }); void client.invalidateQueries({ queryKey: ['diagram-revisions', scopeId, visit.id] }); }} onClose={() => { setEditing(null); void query.refetch(); }}/>} 
  </dialog>, document.body);
}

function DocumentText({ node, onLink }) {
  const item = node.document;
  if (node.type === 'lore') {
    const revision = item.current_revision;
    return <article className="document-reader"><small>{item.code}{revision ? ` · v${revision.version}` : ''}</small><h1>{node.title}</h1>{revision ? <><MarkdownRenderer onLink={onLink}>{revision.content}</MarkdownRenderer>{revision.reason && <blockquote><strong>Почему</strong><MarkdownRenderer onLink={onLink}>{revision.reason}</MarkdownRenderer></blockquote>}</> : <p>У этой записи пока нет актуальной опубликованной версии.</p>}</article>;
  }
  if (node.type === 'lightbook') return <LightbookDocument item={item} onLink={onLink}/>;
  return <article className="document-reader"><small>{item.task_key} · {item.status} · {item.priority}</small><h1>{item.title}</h1><h2>Описание</h2><MarkdownRenderer onLink={onLink}>{item.description}</MarkdownRenderer>{item.agent_notes && <><h2>От агента</h2><MarkdownRenderer onLink={onLink}>{item.agent_notes}</MarkdownRenderer></>}{item.result && <><h2>Результат</h2><MarkdownRenderer onLink={onLink}>{item.result}</MarkdownRenderer></>}{item.completed_at && <small>Завершено: {new Date(item.completed_at).toLocaleString()}</small>}</article>;
}


function LightbookDocument({ item, onLink }) {
  const page = item.page;
  return <article className="document-reader document-lightbook"><small>Lightbook · {item.visibility}</small><h1>{item.title}</h1>{item.description && <p className="document-lightbook-description">{item.description}</p>}{!page ? <p>Страница документа недоступна.</p> : <div className="document-lightbook-blocks">{visibleBookGroups(page.groups).map((group) => <LightbookBlock key={group.id} group={group} onLink={onLink}/>)}</div>}{page && !visibleBookGroups(page.groups).length && <p>В документе пока нет блоков.</p>}</article>;
}

function LightbookBlock({ group, onLink }) {
  if (!isSupportedBookBlock(group.type)) return null;
  const block = group.master_block ?? {};
  const payload = block.payload ?? {};
  if (group.type === 'divider') return <hr/>;
  if (group.type === 'markdown') return <section><MarkdownRenderer onLink={onLink}>{block.content}</MarkdownRenderer></section>;
  if (group.type === 'code') return <section><small>{payload.caption}{payload.language ? ` · ${payload.language}` : ''}</small><pre><code>{payload.code || block.content}</code></pre></section>;
  if (group.type === 'callout') return <aside><strong>{payload.title || 'Заметка'}</strong><p>{payload.text || block.content}</p></aside>;
  if (group.type === 'checklist') return <section className="document-lightbook-checklist">{(payload.items ?? []).map((entry, index) => <label key={index}><input type="checkbox" checked={Boolean(entry.checked)} disabled/>{entry.text}</label>)}</section>;
  if (group.type === 'table') return <div className="document-lightbook-table"><table><thead><tr>{(payload.columns ?? []).map((column, index) => <th key={index}>{column}</th>)}</tr></thead><tbody>{(payload.rows ?? []).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
  if (group.type === 'svg') { const source = payload.url || (payload.svg_text ? svgData(payload.svg_text) : payload.svg ? svgData(payload.svg) : ''); return <figure>{source ? <img src={source} alt={payload.caption || 'Схема'}/> : <p>Изображение не задано.</p>}{payload.caption && <figcaption>{payload.caption}</figcaption>}</figure>; }
  if (group.type === 'photo') return <figure><p>Фотография из файлов Lightbook</p>{payload.caption && <figcaption>{payload.caption}</figcaption>}</figure>;
  if (group.type === 'embed') return <section><strong>{payload.title || (payload.reference_type ? `Встроенный объект: ${payload.reference_type}` : 'Ссылка')}</strong>{payload.description && <p>{payload.description}</p>}{payload.url && <a href={payload.url} onClick={(event) => { if (onLink(payload.url)) event.preventDefault(); }}>{payload.url}</a>}</section>;
  return <section><p>{block.content || payload.label || 'Пустой блок'}</p></section>;
}

const svgData = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function NavigationLinkForm({ scopeId, node, form, onClose, onDone, onRedraw }) {
  const [type, setType] = useState(form.draft?.type || form.link?.target.type || 'diagram');
  const [target, setTarget] = useState(form.draft?.target || form.link?.target.id || '');
  const [label, setLabel] = useState(form.draft?.label ?? form.link?.label ?? '');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const element = useRef(null);
  useEffect(() => { const timeout = setTimeout(() => { setTerm(search); setPage(1); }, 250); return () => clearTimeout(timeout); }, [search]);
  useEffect(() => {
    const previous = document.activeElement;
    const formElement = element.current;
    formElement.querySelector('select')?.focus();
    const keyboard = (event) => {
      if (event.key !== 'Tab') return;
      const controls = [...formElement.querySelectorAll('button:not(:disabled),input,select')].filter((item) => item.getClientRects().length);
      const index = controls.indexOf(document.activeElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && (index < 0 || index === controls.length - 1)) { event.preventDefault(); controls[0]?.focus(); }
    };
    document.addEventListener('keydown', keyboard, true);
    return () => { document.removeEventListener('keydown', keyboard, true); if (previous?.isConnected) previous.focus(); };
  }, []);
  const candidates = useQuery({ queryKey: ['content-node-candidates', scopeId, type, term, page], queryFn: ({ signal }) => contentNavigationApi.candidates(scopeId, { type, q: term, page }, signal) });
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { onDone(await contentNavigationApi.save(scopeId, node, { target_type: type, target_id: target, label: label || null, region: form.region || null, ...(form.region ? { source_revision: form.sourceRevision ?? form.link?.source_revision } : {}) }, form.link?.id)); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  return <div className="document-link-form-backdrop"><form ref={element} className="document-link-form" role="dialog" aria-modal="true" aria-label="Навигационная ссылка" onSubmit={submit} onKeyDown={(event) => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); } }}><header><h2>{form.region ? 'Ссылка из рамки' : 'Связать документы'}</h2><button type="button" aria-label="Закрыть настройку ссылки" disabled={busy} onClick={onClose}><IconX size={20}/></button></header>
    <label>Тип документа<select value={type} onChange={(event) => { setType(event.target.value); setTarget(''); setSearch(''); setTerm(''); setPage(1); }}>{Object.entries(nodeTypes).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
    <label>Поиск<input value={search} onChange={(event) => { setSearch(event.target.value); setTarget(''); }} placeholder="Название или код…"/></label>
    <label>Документ<select value={target} required onChange={(event) => setTarget(event.target.value)}><option value="">Выберите документ</option>{form.link?.target.type === type && !candidates.data?.data.some((item) => item.id === form.link.target.id) && <option value={form.link.target.id}>{form.link.target.title}</option>}{candidates.data?.data.map((item) => <option key={item.id} value={item.id}>{item.code ? item.code + ' · ' : ''}{item.title}</option>)}</select></label>
    <div className="document-candidate-pages"><button type="button" disabled={page === 1 || candidates.isFetching} onClick={() => { setPage(page - 1); setTarget(''); }}>Назад</button><small>{candidates.isFetching ? 'Загружаю…' : `Страница ${page}`}</small><button type="button" disabled={!candidates.data?.meta.has_more || candidates.isFetching} onClick={() => { setPage(page + 1); setTarget(''); }}>Далее</button></div>
    <label>Подпись (необязательно)<input value={label} maxLength={160} onChange={(event) => setLabel(event.target.value)}/></label>
    <p>Ссылка не выдаёт доступ к документу. Переходы по кругу разрешены.</p>
    {form.region && <button type="button" disabled={busy} onClick={() => onRedraw({ type, target, label })}><IconSelect size={15}/>Перерисовать рамку</button>}
    {(error || candidates.error) && <p className="diagram-error" role="alert">{error || candidates.error.message}</p>}
    <footer><button type="button" disabled={busy} onClick={onClose}>Отмена</button><button disabled={busy || !target || candidates.isFetching}>{busy ? 'Сохраняю…' : 'Сохранить ссылку'}</button></footer>
  </form></div>;
}
