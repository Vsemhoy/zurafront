import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { IconDownload, IconEye, IconFiles, IconLink, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { apiRequest } from '../api';
import { useWorkspace } from '../app/workspace';
import { FilePreview } from '../shared/ui/FilePreview';
import './FilerPage.css';

const fileCategories = { documentation: 'Документация', general: 'Общие файлы', task: 'Вложения задач', event: 'Вложения событий', book: 'Вложения Букера', project: 'Вложения проектов', user: 'Вложения контакторов' };
const subjectTypes = { task: 'Задача', event: 'Событие', book: 'Книга', project: 'Проект', user: 'Контактор' };
const sizeLabel = (value) => value >= 1048576 ? `${(value / 1048576).toFixed(1)} МБ` : `${Math.ceil(value / 1024)} КБ`;
const endpoint = (scopeId) => `/scopes/${scopeId}/files`;
const attachmentHref = (attachment) => ({ task: `/tasks/${attachment.id}/edit`, book: `/books/${attachment.id}`, project: '/projects', event: '/events', user: '/contractors' })[attachment.type];

export function FilerPage() {
    const { activeScope } = useWorkspace();
    const [params, setParams] = useSearchParams();
    const category = params.get('category') || '';
    const type = params.get('type') || '';
    const id = params.get('id') || '';
    if (!activeScope) return <main className="filer-page">Выберите скоуп.</main>;
    return <main className="filer-page"><header className="filer-heading"><IconFiles size={25}/><div><h1>Filer</h1><p>Файлы · {activeScope.name}</p></div></header><div className="filer-layout"><nav className="filer-nav">
        {Object.entries({ '': 'Все файлы', ...fileCategories }).map(([key, title]) => <button key={key} className={category === key ? 'active' : ''} onClick={() => setParams(key ? { category: key } : {})}>{title}</button>)}
    </nav><FilePanel key={`${activeScope.id}:${category}:${type}:${id}`} scopeId={activeScope.id} category={category} subjectType={type} subjectId={id}/></div></main>;
}

export function FilePanel({ scopeId, category = '', subjectType = '', subjectId = '' }) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [linking, setLinking] = useState(null);
    const [busy, setBusy] = useState(null);
    const [actionError, setActionError] = useState('');
    useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
    const { data, error, isPending } = useQuery({
        queryKey: ['filer', scopeId, category, subjectType, subjectId, query, page],
        queryFn: ({ signal }) => {
            const params = new URLSearchParams({ page, q: query });
            if (category) params.set('category', category);
            if (subjectType && subjectId) { params.set('subject_type', subjectType); params.set('subject_id', subjectId); }
            return apiRequest(`${endpoint(scopeId)}?${params}`, { signal });
        }, enabled: Boolean(scopeId),
    });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['filer', scopeId] });
    const download = async (file) => {
        setBusy(file.id); setActionError('');
        try {
            const blob = await apiRequest(`${endpoint(scopeId)}/${file.id}/download`, { responseType: 'blob' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a'); link.href = url; link.download = file.name; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (failure) { setActionError(failure.message); } finally { setBusy(null); }
    };
    const remove = async (file) => {
        if (!window.confirm(`Удалить «${file.name}» навсегда? Файл исчезнет из всех связанных объектов.`)) return;
        setBusy(file.id); setActionError('');
        try { await apiRequest(`${endpoint(scopeId)}/${file.id}`, { method: 'DELETE' }); await refresh(); }
        catch (failure) { setActionError(failure.message); } finally { setBusy(null); }
    };
    return <section className="filer-panel"><header className="filer-tools"><input aria-label="Поиск файлов" placeholder="Найти файл…" value={search} onChange={(event) => setSearch(event.target.value)}/><button className="filer-primary" onClick={() => setUploading(true)}><IconPlus size={16}/>Загрузить</button></header>
        {subjectId && <p className="filer-caption">Вложения выбранного объекта · <Link to="/files">Вся библиотека</Link></p>}
        {(error || actionError) && <p className="filer-error" role="alert">{actionError || error.message}</p>}
        {isPending ? <p className="filer-empty">Загружаю файлы…</p> : !error && !data?.data.length ? <p className="filer-empty">Файлов пока нет. Загрузите первый файл.</p> : null}
        {Boolean(data?.data.length) && <div className="filer-table-wrap"><table className="filer-table"><thead><tr><th>Файл</th><th>Раздел / связи</th><th>Размер</th><th>Автор / дата</th><th>Действия</th></tr></thead><tbody>{data.data.map((file) => <tr key={file.id}>
            <td><button className="filer-name" onClick={() => setPreview(file)}>{file.name}</button><FileDescription key={`${file.id}:${file.description ?? ''}`} file={file} scopeId={scopeId} onSaved={refresh}/><small>{file.visibility === 'private' ? 'Личный' : file.attachments.length ? 'По доступу к связям' : 'Общий в скоупе'}</small></td>
            <td><span>{fileCategories[file.category]}</span><div className="filer-links">{file.attachments.map((attachment) => <Link key={`${attachment.type}:${attachment.id}`} to={attachmentHref(attachment)}>{subjectTypes[attachment.type]}: {attachment.title}</Link>)}</div></td>
            <td>{sizeLabel(file.size)}</td><td>{file.creator?.name || '—'}<small>{new Date(file.created_at).toLocaleDateString()}</small></td>
            <td><div className="filer-actions"><button title="Посмотреть" aria-label="Посмотреть" onClick={() => setPreview(file)}><IconEye size={16}/></button><button title="Скачать" aria-label="Скачать" disabled={busy === file.id} onClick={() => download(file)}><IconDownload size={16}/></button>{file.can_manage && <><button title="Связать с объектом" aria-label="Связать с объектом" onClick={() => setLinking(file)}><IconLink size={16}/></button><button title="Удалить файл" aria-label="Удалить файл" disabled={busy === file.id} onClick={() => remove(file)}><IconTrash size={16}/></button></>}</div></td>
        </tr>)}</tbody></table></div>}
        <footer className="filer-pagination"><button disabled={page === 1 || isPending} onClick={() => setPage(page - 1)}>Назад</button><span>Страница {page}</span><button disabled={!data?.meta.has_more || isPending} onClick={() => setPage(page + 1)}>Далее</button></footer>
        {uploading && <FileUploadModal scopeId={scopeId} category={category || subjectType || 'general'} subjectType={subjectType} subjectId={subjectId} onClose={() => setUploading(false)} onUploaded={refresh}/>}
        {linking && <FileLinkModal scopeId={scopeId} file={linking} onClose={() => setLinking(null)} onSaved={refresh}/>}
        {preview && <FilePreview key={preview.id} scopeId={scopeId} file={preview} onClose={() => setPreview(null)} onDownload={() => download(preview)}/>}
    </section>;
}

function TargetPicker({ scopeId, type, id, onType, onId }) {
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    useEffect(() => { const timer = setTimeout(() => setQuery(search), 250); return () => clearTimeout(timer); }, [search]);
    const { data = [], error, isFetching } = useQuery({
        queryKey: ['filer-targets', scopeId, type, query],
        queryFn: async ({ signal }) => (await apiRequest(`${endpoint(scopeId)}/targets?${new URLSearchParams({ type, q: query })}`, { signal })).data,
        enabled: Boolean(type),
    });
    return <><label>Тип объекта<select value={type} onChange={(event) => { onType(event.target.value); onId(''); setSearch(''); }}>{!type && <option value="">Без связи</option>}{Object.entries(subjectTypes).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label>{type && <>
        <label>Найти объект<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по названию"/></label>
        <label>Объект<select required value={id} onChange={(event) => onId(event.target.value)}><option value="">{isFetching ? 'Загружаю…' : 'Выберите объект'}</option>{data.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><small>Показаны до 50 доступных для изменения объектов. Используйте поиск.</small></>}{error && <p className="filer-error">{error.message}</p>}</>;
}

function FileUploadModal({ scopeId, category: initialCategory, subjectType, subjectId, onClose, onUploaded }) {
    const [category, setCategory] = useState(initialCategory);
    const [type, setType] = useState(subjectType || (subjectTypes[initialCategory] ? initialCategory : ''));
    const [id, setId] = useState(subjectId);
    const [visibility, setVisibility] = useState(subjectId ? 'scope' : 'private');
    const [files, setFiles] = useState([]);
    const [busy, setBusy] = useState(false);
    const [messages, setMessages] = useState([]);
    const upload = async (event) => {
        event.preventDefault(); setBusy(true); setMessages([]);
        let successful = true;
        for (const file of files) {
            try {
                if (file.size > 20 * 1024 * 1024) throw new Error('Максимум 20 МБ на файл.');
                const body = new FormData(); body.append('file', file); body.append('category', category); body.append('visibility', visibility);
                if (type && id) { body.append('subject_type', type); body.append('subject_id', id); }
                await apiRequest(endpoint(scopeId), { method: 'POST', body });
                setMessages((current) => [...current, { name: file.name, ok: true }]);
            } catch (failure) { successful = false; setMessages((current) => [...current, { name: file.name, error: failure.message }]); }
        }
        await onUploaded(); setBusy(false);
        if (successful) onClose();
        else setFiles([]);
    };
    return <div className="filer-backdrop"><form className="filer-modal" onSubmit={upload}><header><h2>Загрузить файлы</h2><button type="button" disabled={busy} aria-label="Закрыть" onClick={onClose}><IconX size={19}/></button></header>
        <label>Раздел<select value={category} disabled={Boolean(subjectId)} onChange={(event) => { setCategory(event.target.value); setType(subjectTypes[event.target.value] ? event.target.value : ''); setId(''); }}>{Object.entries(fileCategories).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label>
        {!subjectId && <TargetPicker scopeId={scopeId} type={type} id={id} onType={(value) => { setType(value); if (subjectTypes[category]) setCategory(value); }} onId={setId}/>}
        <label>Доступ<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="private">Личный — только я</option><option value="scope">{type ? 'По доступу к связанным объектам' : 'Все участники скоупа с правом просмотра'}</option></select></label>
        <label className="filer-drop">Выберите файлы<input required type="file" multiple disabled={busy} onChange={(event) => setFiles([...event.target.files])}/><small>До 20 МБ каждый. Оригиналы хранятся в закрытом хранилище.</small></label>
        {messages.map((message, index) => <p className={message.ok ? 'filer-success' : 'filer-error'} key={index}>{message.name}: {message.ok ? 'загружен' : message.error}</p>)}
        <footer><button type="button" disabled={busy} onClick={onClose}>Закрыть</button><button className="filer-primary" disabled={busy || !files.length || (Boolean(type) && !id)}>{busy ? 'Загружаю…' : `Загрузить (${files.length})`}</button></footer>
    </form></div>;
}

function FileLinkModal({ scopeId, file, onClose, onSaved }) {
    const [type, setType] = useState('task');
    const [id, setId] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const save = async (event) => {
        event.preventDefault(); setBusy(true); setError('');
        try { await apiRequest(`${endpoint(scopeId)}/${file.id}/attachments`, { method: 'POST', body: JSON.stringify({ subject_type: type, subject_id: id }) }); await onSaved(); onClose(); }
        catch (failure) { setError(failure.message); } finally { setBusy(false); }
    };
    return <div className="filer-backdrop"><form className="filer-modal" onSubmit={save}><header><h2>Связать файл</h2><button type="button" disabled={busy} onClick={onClose}><IconX size={19}/></button></header><p>{file.name}</p><TargetPicker scopeId={scopeId} type={type} id={id} onType={setType} onId={setId}/><small>Файл будет виден только тем, кому доступны все его связи. Личный файл остаётся личным.</small>{error && <p className="filer-error">{error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>Отмена</button><button className="filer-primary" disabled={busy || !id}>Связать</button></footer></form></div>;
}

function FileDescription({ scopeId, file, onSaved }) {
    const [value, setValue] = useState(file.description ?? '');
    const [saved, setSaved] = useState(file.description ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const save = async () => {
        if (busy || value === saved) return;
        setBusy(true); setError('');
        try {
            const response = await apiRequest(`${endpoint(scopeId)}/${file.id}`, { method: 'PATCH', body: JSON.stringify({ description: value || null }) });
            const description = response.data.description ?? '';
            setSaved(description); setValue(description); await onSaved();
        } catch (failure) { setError(failure.message); } finally { setBusy(false); }
    };
    if (!file.can_manage) return file.description ? <p className="filer-description-text">{file.description}</p> : null;
    return <div className="filer-description"><textarea aria-label={`Описание файла ${file.name}`} placeholder="Добавить описание…" rows={1} maxLength={2000} value={value} disabled={busy} onChange={(event) => setValue(event.target.value)} onBlur={save} onKeyDown={(event) => {
        if (event.key === 'Escape') { event.stopPropagation(); setValue(saved); setError(''); }
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.blur(); }
    }}/>{busy && <small role="status">Сохраняю…</small>}{error && <div role="alert" className="filer-error">{error} <button type="button" onClick={save}>Повторить</button></div>}</div>;
}
