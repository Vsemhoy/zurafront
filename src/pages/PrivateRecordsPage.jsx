import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { IconAddressBook, IconBolt, IconCheck, IconCopy, IconEdit, IconPlus, IconStar, IconTrash, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { useAuth } from '../auth';
import { factApi } from '../entities/fact/api';
import { contactApi } from '../entities/contact/api';
import { factExpired, factFormats, factKinds, factModes, recordForm, recordPayload, visibilityLabels } from '../entities/fact/model';
import { EditorSaveBar } from '../shared/ui/EditorSaveBar';
import { useGuardedEditorAction } from '../shared/ui/editorGuard';
import { useSaveForm } from '../shared/ui/useSaveForm';
import { FactValueViewer } from '../shared/ui/FactValueViewer';
import { PrivateRecordLinks } from '../shared/ui/PrivateRecordLinks';
import MarkdownRenderer from '../shared/ui/MarkdownRenderer';
import './FactorPage.css';

const MarkdownEditor = lazy(() => import('../shared/ui/CompactMarkdownEditor'));
const apis = { fact: factApi, contact: contactApi };
const emptyNote = { content: '', title: '' };
const defaults = { q: '', kind: '', format: '', project_id: '', visibility: '', pinned: '', expert: '', archived: '', trash: '', view: 'table', page: 1 };

export function PrivateRecordsPage({ type }) {
  const { activeScope } = useWorkspace();
  const { user } = useAuth();
  const params = useParams();
  const [query] = useSearchParams();
  const routeKey = params.factId || params.contactId || query.get(type) || '';
  if (!activeScope) return <main className="records-page">Выберите скоуп.</main>;
  return <RecordsWorkspace key={`${type}:${activeScope.id}:${user?.id}:${user?.acting_as?.id || ''}:${routeKey}`} type={type} scope={activeScope} actorKey={`${user?.id}:${user?.acting_as?.id || ''}`}/>;
}

function RecordsWorkspace({ type, scope, actorKey }) {
  const api = apis[type];
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const storageKey = `zuratax:${type}:filters:${scope.id}:${actorKey}`;
  const [filters, setFilters] = useState(() => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}'), q: '', page: 1 }; } catch { return defaults; } });
  const deepId = (type === 'fact' ? params.factId : params.contactId) || searchParams.get(type);
  const [selection, setSelection] = useState(deepId ? { id: deepId } : null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(null);
  const [actionError, setActionError] = useState('');
  const key = ['records', type, scope.id, actorKey];
  const page = useQuery({ queryKey: [...key, filters], queryFn: () => api.page(scope.id, { ...filters, view: undefined }), gcTime: 0 });
  const options = useQuery({ queryKey: ['record-options', type, scope.id, actorKey], queryFn: () => api.options(scope.id), gcTime: 0 });
  useEffect(() => { const { q: _q, page: _page, ...saved } = filters; try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* Storage may be disabled. */ } }, [filters, storageKey]);
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(null), 1500); return () => clearTimeout(timer); }, [copied]);
  const change = (field, value) => setFilters((old) => ({ ...old, [field]: value, page: 1 }));
  const base = type === 'fact' ? '/factor' : '/contacts';
  const refresh = () => client.invalidateQueries({ queryKey: key });
  const open = (record, edit = false) => { setSelection(record ? { id: record.id, record } : { id: null }); setEditing(edit || !record); };
  const close = () => { setSelection(null); setEditing(false); if (deepId) navigate(base, { replace: true }); };
  const copy = async (event, record) => {
    event.stopPropagation(); setActionError('');
    if (record.is_sensitive || record.display_mode === 'masked') { open(record); return; }
    try { await navigator.clipboard.writeText(record.value ?? ''); setCopied(record.id); } catch { setActionError('Не удалось скопировать значение.'); }
  };
  const restore = useMutation({ mutationFn: (record) => api.restore(scope.id, record.id, record.revision), onSuccess: refresh });
  const title = type === 'fact' ? 'Factor' : 'Contactor';
  const Icon = type === 'fact' ? IconBolt : IconAddressBook;
  return <main className="records-page">
    <header className="records-header"><Icon size={21}/><h1>{title}</h1><small>{page.data?.meta?.total ?? 0} записей</small><button className="record-primary" disabled={!options.data?.can_create} onClick={() => open(null, true)}><IconPlus size={16}/>{type === 'fact' ? 'Новый факт' : 'Новый контакт'}</button></header>
    {type === 'contact' && <p className="record-hint">Контакты — адресная книга, а не учётки. Дополнительные реквизиты хранятся в связанных фактах.</p>}
    <section className="records-filters" aria-label="Фильтры записей"><input aria-label="Поиск" placeholder="Найти…" value={filters.q} onChange={(event) => change('q', event.target.value)}/>
      <select aria-label="Тип" value={filters.kind} onChange={(event) => change('kind', event.target.value)}><option value="">Все типы</option>{Object.entries(type === 'fact' ? factKinds : { person: 'Люди', organization: 'Организации' }).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
      {type === 'fact' && <select aria-label="Формат" value={filters.format} onChange={(event) => change('format', event.target.value)}><option value="">Все форматы</option>{Object.entries(factFormats).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>}
      <select aria-label="Проект" value={filters.project_id} onChange={(event) => change('project_id', event.target.value)}><option value="">Все проекты</option>{options.data?.projects?.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.title}</option>)}</select>
      <select aria-label="Видимость" value={filters.visibility} onChange={(event) => change('visibility', event.target.value)}><option value="">Любая видимость</option>{Object.entries(visibilityLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
      <button aria-pressed={filters.pinned === '1'} onClick={() => change('pinned', filters.pinned ? '' : '1')}><IconStar size={15}/>Избранное</button>
      <button aria-pressed={(type === 'fact' ? filters.expert : filters.archived) === '1'} onClick={() => { const field = type === 'fact' ? 'expert' : 'archived'; change(field, filters[field] ? '' : '1'); }}>{type === 'fact' ? 'Экспертные' : 'Архив'}</button>
      <button aria-pressed={filters.trash === '1'} onClick={() => change('trash', filters.trash ? '' : '1')}><IconTrash size={15}/>Корзина</button>
      <select aria-label="Вид списка" value={filters.view} onChange={(event) => change('view', event.target.value)}><option value="table">Таблица</option><option value="cards">Карточки</option></select>
      <button onClick={() => setFilters(defaults)}>Сбросить</button>
    </section>
    {(page.error || options.error || restore.error || actionError) && <p role="alert" className="record-error">{page.error?.message || options.error?.message || restore.error?.message || actionError}</p>}
    {page.isPending && <p>Загружаю…</p>}
    {!page.error && <section className={`records-list records-list--${filters.view}`} aria-label={title}>
      {filters.view === 'table' && <div className="records-list-head"><span>Название</span><span>{type === 'fact' ? 'Значение' : 'Должность · организация'}</span><span>{type === 'fact' ? 'Тип · формат' : 'Контакты'}</span><span>Доступ</span><span/></div>}
      {page.data?.data.map((record) => <article key={record.id} className={`record-row ${type === 'fact' && factExpired(record) ? 'record-row--expired' : ''}`} tabIndex={0} role="button" onClick={() => open(record)} onKeyDown={(event) => { if (event.target === event.currentTarget && event.key === 'Enter') open(record); }}>
        <strong>{record.is_pinned && <IconStar size={13}/>} {record.label || record.name}{record.nickname && <small>{record.nickname}</small>}</strong>
        <span className="record-preview">{type === 'fact' ? record.is_sensitive || record.display_mode === 'masked' ? '••••••••' : record.value : [record.role, record.company].filter(Boolean).join(' · ') || '—'}</span>
        <span>{type === 'fact' ? `${factKinds[record.kind] || record.kind} · ${factFormats[record.format] || record.format}` : [record.phone, record.email].filter(Boolean).join(' · ') || '—'}{type === 'fact' && factExpired(record) && <small>Срок истёк</small>}</span>
        <span>{visibilityLabels[record.visibility] || '—'}</span>
        <div className="record-row-actions">{type === 'fact' && !record.deleted_at && <button title="Скопировать значение" onClick={(event) => copy(event, record)}>{copied === record.id ? <IconCheck size={16}/> : <IconCopy size={16}/>}</button>}{record.can_write && !record.deleted_at && <button title="Редактировать" onClick={(event) => { event.stopPropagation(); open(record, true); }}><IconEdit size={16}/></button>}{record.deleted_at && record.can_manage && <button disabled={restore.isPending} onClick={(event) => { event.stopPropagation(); restore.mutate(record); }}>Восстановить</button>}</div>
      </article>)}
      {!page.isPending && !page.data?.data.length && <p>По этим фильтрам записей нет.</p>}
    </section>}
    <footer className="record-pagination"><button disabled={filters.page <= 1 || page.isFetching} onClick={() => setFilters((old) => ({ ...old, page: old.page - 1 }))}>←</button><span>{filters.page} / {page.data?.meta?.last_page || 1}</span><button disabled={!page.data || filters.page >= page.data.meta.last_page || page.isFetching} onClick={() => setFilters((old) => ({ ...old, page: old.page + 1 }))}>→</button></footer>
    {selection && <RecordDialog key={selection.id || 'new'} type={type} scopeId={scope.id} actorKey={actorKey} selection={selection} editing={editing} onEditing={setEditing} options={options.data || { projects: [], users: [] }} onClose={close} onChanged={refresh}/>}
  </main>;
}

function RecordDialog({ type, scopeId, actorKey, selection, editing, onEditing, options, onClose, onChanged }) {
  const dialog = useRef(null);
  const [container, setContainer] = useState(null);
  const bind = useCallback((element) => { dialog.current = element; setContainer(element); }, []);
  const api = apis[type];
  const query = useQuery({ queryKey: ['private-record', type, scopeId, actorKey, selection.id], queryFn: () => api.get(scopeId, selection.id), enabled: Boolean(selection.id) && !selection.record?.deleted_at, gcTime: 0, refetchOnWindowFocus: false });
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  const record = query.data || selection.record;
  const initial = useMemo(() => recordForm(type, record), [type, record]);
  const pending = selection.id && query.isPending && !selection.record?.deleted_at;
  return <dialog ref={bind} className={`record-dialog ${!editing ? 'record-dialog--viewer' : ''}`} aria-label={type === 'fact' ? 'Факт' : 'Контакт'} onCancel={(event) => { event.preventDefault(); const button = dialog.current.querySelector('[data-record-close]'); if (button) button.click(); else onClose(); }}>
    {query.error || pending ? <div className="record-loading"><p role={query.error ? 'alert' : undefined}>{query.error?.message || 'Загружаю запись…'}</p><button onClick={onClose}>Закрыть</button></div>
      : <RecordForm key={`${selection.id || 'new'}:${editing}`} type={type} scopeId={scopeId} actorKey={actorKey} initial={initial} editing={editing && !record?.deleted_at && (!record || record.can_write)} options={options} container={container} onClose={onClose} onEditing={onEditing} onSaved={() => { if (selection.id && !selection.record?.deleted_at) void query.refetch(); onChanged(); }}/>}</dialog>;
}

function RecordForm({ type, scopeId, actorKey, initial, editing, options, container, onClose, onEditing, onSaved }) {
  const api = apis[type];
  const native = useRef(null);
  const guardAction = useGuardedEditorAction();
  const [tab, setTab] = useState('main');
  const [revealError, setRevealError] = useState('');
  const [revealing, setRevealing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const form = useSaveForm({ initial, active: editing, label: type === 'fact' ? 'Факт' : 'Контакт',
    persist: async (draft, baseline) => recordForm(type, await api.save(scopeId, baseline.id, recordPayload(type, draft, baseline))),
    onSaved, onSubmitted: () => { if (!initial.id) onClose(); },
    validate: () => { const invalid = native.current?.querySelector(':invalid:not(fieldset)'); if (invalid) { setTab('main'); requestAnimationFrame(() => invalid.reportValidity()); return false; } return true; },
  });
  const draft = form.draft;
  const set = (key, value) => form.change((old) => ({ ...old, [key]: value }));
  const close = () => editing ? form.leave(onClose) : guardAction(onClose);
  const remove = useMutation({ mutationFn: () => api.remove(scopeId, initial.id, draft.revision), onSuccess: () => { onSaved(); onClose(); } });
  const reveal = async () => { setRevealing(true); setRevealError(''); try { const result = await factApi.reveal(scopeId, initial.id); if (result.revision !== draft.revision) throw new Error('Факт изменён. Откройте запись заново.'); set('value', result.value); } catch (error) { setRevealError(error.message); } finally { setRevealing(false); } };
  const textField = (key, label, inputType = 'text', extra = {}) => <label>{label}<input type={inputType} value={draft[key] ?? ''} onChange={(event) => set(key, event.target.value)} {...extra}/></label>;
  const checkbox = (key, label) => <label className="record-check"><input type="checkbox" checked={Boolean(draft[key])} onChange={(event) => set(key, event.target.checked)}/>{label}</label>;
  const select = (key, label, choices) => <label>{label}<select value={draft[key] ?? ''} onChange={(event) => set(key, event.target.value)}>{Object.entries(choices).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
  const heading = draft.label || draft.name || (type === 'fact' ? 'Новый факт' : 'Новый контакт');
  return <form ref={native} noValidate className="record-editor" onSubmit={(event) => { event.preventDefault(); if (editing) void form.save(); }}>
    <header><div><small>{type === 'fact' ? 'Factor' : 'Contactor'} · {visibilityLabels[draft.visibility]}</small><h2>{heading}</h2></div><div className="record-header-actions">{initial.id && <button type="button" title="Скопировать ссылку" onClick={async () => { try { await navigator.clipboard.writeText(`${location.origin}/${type === 'fact' ? 'factor' : 'contacts'}/${scopeId}/${initial.id}`); setLinkCopied(true); } catch { setRevealError('Не удалось скопировать ссылку.'); } }}>{linkCopied ? <IconCheck size={17}/> : <IconCopy size={17}/>}</button>}{!editing && initial.can_write && !initial.deleted_at && <button type="button" onClick={() => guardAction(() => onEditing(true))}><IconEdit size={17}/>Редактировать</button>}<button type="button" data-record-close disabled={form.busy} onClick={close} aria-label="Закрыть"><IconX size={20}/></button></div></header>
    {type === 'contact' && initial.id && !editing && <nav className="record-tabs">{[['main', 'Карточка'], ['notes', 'История общения'], ['links', 'Факты и связи']].map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>}
    <div className="record-editor-body">
      {editing ? <fieldset disabled={form.busy} hidden={tab !== 'main'}><legend>{type === 'fact' ? 'Свойства факта' : 'Карточка контакта'}</legend>
        {textField(type === 'fact' ? 'label' : 'name', 'Название *', 'text', { required: true, autoFocus: !initial.id, maxLength: type === 'fact' ? 160 : 255 })}
        <div className="record-form-grid">
          {type === 'fact' ? <>{select('kind', 'Тип', factKinds)}{select('format', 'Формат', factFormats)}{select('display_mode', 'Показ', factModes)}{textField('unit', 'Единица')}{textField('language', 'Язык кода')}{textField('valid_from', 'Действует с', 'date')}{textField('valid_to', 'Действует до', 'date')}</>
            : <>{select('kind', 'Тип', { person: 'Человек', organization: 'Организация' })}{textField('nickname', 'Псевдоним')}{textField('role', 'Должность')}{textField('company', 'Организация')}{textField('phone', 'Телефон', 'tel')}{textField('email', 'Почта', 'email')}{textField('birthday_on', 'Дата рождения', 'date')}{textField('met_at', 'Дата знакомства', 'date')}{textField('last_contact_at', 'Последний контакт', 'datetime-local')}<label>Связанная учётка<select value={draft.user_id} onChange={(event) => set('user_id', event.target.value)}><option value="">Не связана</option>{options.users?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></>}
        </div>
        {type === 'fact' ? <>
          {draft.value == null ? <div className="record-secret-editor"><p>Значение не загружено. Можно менять метаданные, не раскрывая его.</p><button type="button" disabled={revealing || !initial.can_reveal} onClick={reveal}>Раскрыть для редактирования</button></div>
            : draft.format === 'markdown' ? <Suspense fallback={<p>Загружаю Markdown…</p>}><MarkdownEditor key={`${draft.id}:${draft.format}`} value={draft.value} onChange={(value) => set('value', value)} readOnly={form.busy} toolbarInitiallyOpen hideToolbarTrigger overlayContainer={container}/></Suspense>
              : <label>Значение *<textarea className="record-value-input" required value={draft.value} onChange={(event) => set('value', event.target.value)}/></label>}
          <label>Контекст<textarea rows="2" value={draft.context || ''} onChange={(event) => set('context', event.target.value)}/></label><label>Ключевые слова (через запятую)<input value={draft.search_keywords.join(', ')} onChange={(event) => set('search_keywords', event.target.value.split(',').map((s) => s.trim()))}/></label>
          <div className="record-flag-row">{checkbox('is_sensitive', 'Чувствительные данные')}{checkbox('is_expert', 'Экспертный')}{checkbox('is_pinned', 'Избранное')}</div>
        </> : <><label>Обстоятельства знакомства<textarea rows="2" value={draft.met_context || ''} onChange={(event) => set('met_context', event.target.value)}/></label><label>Заметка</label><Suspense fallback={<p>Загружаю Markdown…</p>}><MarkdownEditor value={draft.note_md} onChange={(value) => set('note_md', value)} toolbarInitiallyOpen hideToolbarTrigger readOnly={form.busy} overlayContainer={container}/></Suspense><div className="record-flag-row">{checkbox('is_pinned', 'Избранное')}{checkbox('is_archived', 'В архиве')}</div></>}
        <section className="record-access"><h3>Доступ</h3><fieldset disabled={Boolean(initial.id && !initial.can_manage)}><div className="record-form-grid">{select('visibility', 'Кто видит', visibilityLabels)}<label>Проект<select required={draft.visibility === 'project'} value={draft.project_id} onChange={(event) => set('project_id', event.target.value)}><option value="">Без проекта</option>{options.projects?.map((item) => <option key={item.id} value={item.id}>{item.key} · {item.title}</option>)}</select></label>{textField('sort_order', 'Порядок', 'number', { min: 0, max: 1000000 })}</div>{checkbox('allow_member_editing', 'Участники с правом записи могут редактировать')}</fieldset><small>«Только я» скрывает запись и от владельца скоупа. Проект дополнительно ограничивает доступ; связь с другой записью его не расширяет.</small></section>
      </fieldset>
        : tab === 'main' && (type === 'fact' ? <><div className="record-badges"><span>{factKinds[draft.kind] || draft.kind}</span><span>{factFormats[draft.format]}</span>{draft.is_sensitive && <span>Чувствительный</span>}{draft.is_expert && <span>Экспертный</span>}{factExpired(draft) && <span>Срок истёк</span>}</div>{draft.context && <p className="record-hint">{draft.context}</p>}<FactValueViewer key={`${draft.id}:${draft.revision}`} fact={draft} scopeId={scopeId}/><div className="record-keywords">{draft.search_keywords.filter(Boolean).map((word, index) => <span key={`${word}:${index}`}>#{word}</span>)}</div></>
          : <><dl className="contact-details">{[['nickname', 'Псевдоним'], ['role', 'Должность'], ['company', 'Организация'], ['phone', 'Телефон'], ['email', 'Почта'], ['birthday_on', 'День рождения'], ['met_at', 'Знакомство'], ['met_context', 'Обстоятельства'], ['last_contact_at', 'Последнее общение']].filter(([key]) => draft[key]).map(([key, name]) => <div key={key}><dt>{name}</dt><dd>{draft[key]}</dd></div>)}</dl><MarkdownRenderer>{draft.note_md || 'Заметок пока нет.'}</MarkdownRenderer></>)}
      {type === 'contact' && initial.id && !editing && <div hidden={tab !== 'notes'}><ContactNotes scopeId={scopeId} actorKey={actorKey} contact={initial} container={container}/></div>}
      {initial.id && !initial.deleted_at && (type === 'fact' ? !editing : tab === 'links') && <PrivateRecordLinks scopeId={scopeId} type={type} record={initial}/>}
    </div>
    {(form.error || revealError || remove.error) && <p role="alert" className="record-error">{form.error || revealError || remove.error?.message}</p>}
    <footer>{editing ? <EditorSaveBar {...form} onSave={form.save}><button type="button" disabled={form.busy} onClick={close}>Закрыть редактор</button></EditorSaveBar> : <button type="button" onClick={close}>Закрыть</button>}{initial.id && initial.can_manage && !initial.deleted_at && <button className="record-delete" type="button" disabled={form.busy || form.dirty || remove.isPending} onClick={() => guardAction(() => { if (window.confirm('Переместить запись в корзину?')) remove.mutate(); })}><IconTrash size={16}/>Удалить</button>}</footer>
  </form>;
}

function ContactNotes({ scopeId, actorKey, contact, container }) {
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const key = ['contact-notes', scopeId, actorKey, contact.id];
  const notes = useQuery({ queryKey: [...key, page], queryFn: () => contactApi.notes(scopeId, contact.id, page), enabled: !contact.deleted_at, gcTime: 0 });
  const noteForm = useSaveForm({ initial: emptyNote, active: contact.can_write && !contact.deleted_at, label: 'Заметка контакта',
    validate: () => Boolean(noteForm.draft.content.trim()),
    persist: async (draft) => { await contactApi.addNote(scopeId, contact.id, { content: draft.content, title: draft.title || null }); return emptyNote; },
    onSaved: () => { setPage(1); void client.invalidateQueries({ queryKey: key }); },
  });
  const remove = useMutation({ mutationFn: (id) => contactApi.removeNote(scopeId, contact.id, id), onSuccess: () => client.invalidateQueries({ queryKey: key }) });
  const { user } = useAuth();
  const actorId = user?.acting_as?.id || user?.id;
  return <section className="contact-notes"><h3>История общения</h3>{contact.can_write && !contact.deleted_at && <div className="contact-note-new"><input aria-label="Заголовок заметки" placeholder="Тема разговора (необязательно)" maxLength={255} disabled={noteForm.busy} value={noteForm.draft.title} onChange={(event) => noteForm.change((draft) => ({ ...draft, title: event.target.value }))}/><Suspense fallback={<p>Загружаю редактор…</p>}><MarkdownEditor key={noteForm.savedCount} value={noteForm.draft.content} onChange={(content) => noteForm.change((draft) => ({ ...draft, content }))} toolbarInitiallyOpen hideToolbarTrigger readOnly={noteForm.busy} overlayContainer={container}/></Suspense><EditorSaveBar {...noteForm} onSave={noteForm.save} label="Добавить заметку" disabled={!noteForm.draft.content.trim()}/></div>}
    {(notes.error || noteForm.error || remove.error) && <p className="record-error" role="alert">{notes.error?.message || noteForm.error || remove.error?.message}</p>}
    {!notes.error && notes.data?.data.map((note) => <article key={note.id}><header><strong>{note.title || note.creator?.name || 'Заметка'}</strong><time>{new Date(note.occurred_at).toLocaleString('ru-RU')}</time>{contact.can_write && (contact.can_manage || note.created_by === actorId) && <button type="button" title="Удалить заметку" disabled={remove.isPending} onClick={() => { if (window.confirm('Удалить заметку?')) remove.mutate(note.id); }}><IconTrash size={15}/></button>}</header><MarkdownRenderer>{note.content}</MarkdownRenderer><small>{note.creator?.name}</small></article>)}
    <div className="record-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>←</button><span>{page} / {notes.data?.last_page || 1}</span><button type="button" disabled={!notes.data || page >= notes.data.last_page} onClick={() => setPage((value) => value + 1)}>→</button></div>
  </section>;
}
