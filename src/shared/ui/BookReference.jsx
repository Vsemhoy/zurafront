import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api';
import { diagramApi } from '../../entities/diagram/api';
import { loreApi } from '../../entities/lore/api';
import { svgImageSrc, downloadDiagramXml } from '../../entities/diagram/model';
import { ContentNodeBrowser } from './ContentNodeBrowser';
import { findReferenceFile, referenceKinds } from './bookReferenceData';
import './BookReference.css';

const files = (scope, params, signal) => apiRequest(`/scopes/${scope}/files?${new URLSearchParams(params)}`, { signal });
const titleOf = (kind, item) => kind === 'lore' ? `${item.code} · ${item.current_revision?.title || 'Нет актуальной версии'}` : item.title || item.name;

export function BookReferenceFields({ scopeId, value, onChange }) {
    const kind = value.reference_type || 'url';
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
    const result = useQuery({ queryKey: ['book-reference-picker', scopeId, kind, query, page], enabled: Boolean(scopeId && referenceKinds[kind]), queryFn: async ({ signal }) => {
        if (kind === 'file') return files(scopeId, { q: query, page }, signal);
        if (kind === 'diagram') return diagramApi.list(scopeId, { q: query, page }, signal);
        return { data: await loreApi.list(scopeId, { q: query }) };
    } });
    return <div className="booker-data-fields book-reference-fields">
        <label>Источник<select value={kind} onChange={(event) => { onChange({ reference_type: event.target.value, scope_id: scopeId }); setSearch(''); setQuery(''); setPage(1); }}><option value="url">Внешняя ссылка</option>{Object.entries(referenceKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        {kind === 'url' ? <><label>Заголовок<input value={value.title || ''} onChange={(e) => onChange({ ...value, title: e.target.value })}/></label><label>Ссылка<input type="url" value={value.url || ''} onChange={(e) => onChange({ ...value, url: e.target.value })}/></label><label>Описание<textarea value={value.description || ''} onChange={(e) => onChange({ ...value, description: e.target.value })}/></label></> : <>
            <label>Поиск<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Название или текст…"/></label>
            <p>Выберите доступный объект. Встраивание сохраняет его текущие права доступа.</p>
            {result.isFetching && <p role="status">Загружаю…</p>}{result.error && <p role="alert">{result.error.message}</p>}
            <div className="book-reference-options">{result.data?.data.map((item) => <button type="button" key={item.id} aria-pressed={value.reference_id === item.id} onClick={() => onChange({ reference_type: kind, reference_id: item.id, scope_id: scopeId })}>{titleOf(kind, item)}{value.reference_id === item.id && ' ✓'}</button>)}</div>
            {result.data?.data.length === 0 && <p>Ничего не найдено.</p>}
            {kind !== 'lore' && <div><button type="button" disabled={page === 1 || result.isFetching} onClick={() => setPage(page - 1)}>Назад</button><span> {page} </span><button type="button" disabled={!result.data?.meta?.has_more || result.isFetching} onClick={() => setPage(page + 1)}>Далее</button></div>}
            {value.reference_id && <small>Объект выбран. Закройте редактор, чтобы просмотреть блок.</small>}
        </>}
    </div>;
}

export function BookReference({ payload, editing = false }) {
    const { scope_id: scopeId, reference_type: kind, reference_id: id } = payload;
    const [open, setOpen] = useState(false);
    const result = useQuery({ queryKey: ['book-reference', scopeId, kind, id], enabled: Boolean(scopeId && id), retry: false, queryFn: ({ signal }) => {
        if (kind === 'diagram') return diagramApi.get(scopeId, id, signal);
        if (kind === 'lore') return loreApi.get(scopeId, id);
        return findReferenceFile(id, (page) => files(scopeId, { page }, signal));
    } });
    const item = result.data;
    if (!id) return <p className="book-block-placeholder">Выберите {referenceKinds[kind]?.toLowerCase()} в редакторе блока.</p>;
    if (result.isPending) return <p role="status">Загружаю {referenceKinds[kind]?.toLowerCase()}…</p>;
    if (result.error) return <div className="book-reference-unavailable" role="alert">Объект удалён или недоступен. <button type="button" onClick={() => result.refetch()}>Повторить</button></div>;
    if (!item) return null;
    const title = titleOf(kind, item);
    const content = item.current_revision?.content || '';
    const show = async () => { if (editing) return; const fresh = await result.refetch(); if (!fresh.error) setOpen(true); };
    return <div className={`book-reference book-reference--${kind}`} onDoubleClick={editing ? undefined : (event) => { event.stopPropagation(); show(); }}>
        <small>{referenceKinds[kind]}</small>
        {kind === 'lore' ? <button type="button" className="book-reference-spoiler" onClick={show} disabled={editing}><strong>▸ {title}</strong><span>{content.slice(0, 260)}{content.length > 260 ? '…' : ''}</span><small>Открыть полный текст</small></button> : <><strong>{title}</strong>{kind === 'diagram' && item.preview_svg && <img className="book-reference-thumbnail" src={svgImageSrc(item.preview_svg)} alt={title}/>}<button type="button" onClick={show} disabled={editing}>Открыть</button>{!editing && <small>Двойной клик — просмотр</small>}</>}
        {open && <ContentNodeBrowser scopeId={scopeId} initialNode={{ type: kind, id, title }} onClose={() => setOpen(false)}/>}
    </div>;
}

export function ReferenceDialog({ title, onClose, children }) {
    const ref = useRef(null);
    useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
    return createPortal(<dialog ref={ref} className="book-reference-dialog" onCancel={onClose} aria-label={title} onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }} onDoubleClick={(e) => e.stopPropagation()}><header><strong>{title}</strong><button type="button" aria-label="Закрыть просмотр" onClick={onClose}>✕</button></header><div className="book-reference-dialog-body">{children}</div></dialog>, document.body);
}

export function DiagramReadOnly({ item }) {
    const [zoom, setZoom] = useState(1);
    return <><div className="book-reference-zoom"><button type="button" aria-label="Уменьшить" onClick={() => setZoom(Math.max(.25, zoom - .25))}>−</button><button type="button" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button><button type="button" aria-label="Увеличить" onClick={() => setZoom(Math.min(4, zoom + .25))}>+</button><button type="button" onClick={() => downloadDiagramXml(item.xml, item.title)}>Скачать draw.io</button></div>{item.preview_svg ? <div className="book-reference-diagram"><img src={svgImageSrc(item.preview_svg)} alt={item.title} style={{ width: `${zoom * 100}%` }}/></div> : <p>У диаграммы нет превью. Исходник можно скачать в формате draw.io.</p>}</>;
}
