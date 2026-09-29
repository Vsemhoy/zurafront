import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api';
import { FilePreview } from './FilePreview';
import './PhotoPanel.css';

export function FileImage({ scopeId, fileId, alt = '', className = '' }) {
    const [loaded, setLoaded] = useState({});
    const identity = `${scopeId}:${fileId}`;
    const src = loaded.identity === identity ? loaded.src : null;
    const failed = loaded.identity === identity && loaded.failed;
    useEffect(() => {
        if (!scopeId || !fileId) return;
        const controller = new AbortController();
        let objectUrl;
        apiRequest(`/scopes/${scopeId}/files/${fileId}/image`, { signal: controller.signal, responseType: 'blob' })
            .then((blob) => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setLoaded({ identity, src: objectUrl }); } })
            .catch((error) => { if (!controller.signal.aborted && error.name !== 'AbortError') setLoaded({ identity, failed: true }); });
        return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [scopeId, fileId, identity]);
    return src ? <img className={className} src={src} alt={alt}/> : <span className={className} title={failed ? 'Фото недоступно' : 'Загрузка фото'}>{failed ? 'Фото недоступно' : '…'}</span>;
}

export function PhotoPanel({ scopeId, type, id, selectedId, onSelect, featuredId, onChanged, feature = false }) {
    const client = useQueryClient();
    const [page, setPage] = useState(1);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const query = useQuery({
        queryKey: ['filer', scopeId, 'photos', type, id, page],
        queryFn: () => apiRequest(`/scopes/${scopeId}/files?${new URLSearchParams({ subject_type: type, subject_id: id, photos: '1', page })}`),
    });
    const refresh = async () => { await client.invalidateQueries({ queryKey: ['filer', scopeId] }); await onChanged?.(); };
    const upload = async (input) => {
        const files = [...(input.files ?? [])]; input.value = '';
        setBusy(true); setError('');
        const failures = [];
        for (const file of files) {
            try {
                const body = new FormData();
                Object.entries({ file, category: type, subject_type: type, subject_id: id, visibility: 'scope', photo: '1' }).forEach(([key, value]) => body.append(key, value));
                const result = await apiRequest(`/scopes/${scopeId}/files`, { method: 'POST', body });
                if (onSelect) onSelect(result.data);
            } catch (failure) { failures.push(`${file.name}: ${failure.message}`); }
        }
        setPage(1); await refresh(); setError(failures.join('\n')); setBusy(false);
    };
    const mark = async (file) => {
        setBusy(true); setError('');
        try {
            await apiRequest(`/scopes/${scopeId}/files/${file.id}/feature`, { method: 'POST', body: JSON.stringify({ subject_type: type, subject_id: id, enabled: featuredId !== file.id }) });
            await refresh();
        } catch (failure) { setError(failure.message); }
        finally { setBusy(false); }
    };
    const remove = async (file) => {
        if (!window.confirm('Удалить фотографию из хранилища? Она исчезнет из всех мест, где использована.')) return;
        setBusy(true); setError('');
        try { await apiRequest(`/scopes/${scopeId}/files/${file.id}`, { method: 'DELETE' }); await refresh(); }
        catch (failure) { setError(failure.message); }
        finally { setBusy(false); }
    };
    return <section className="photo-panel"><header><strong>{type === 'user' ? 'Фото профиля' : 'Фотографии'}</strong><label className="photo-upload">{busy ? 'Обрабатываю…' : 'Добавить фото'}<input disabled={busy} type="file" multiple={!onSelect && type !== 'user'} accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target)}/></label></header>
        <small>JPEG, PNG, WebP · до 20 МБ и 24 Мп · сжатие WebP, {type === 'user' ? '512' : '2000'} px. Оригинал не сохраняется; для него используйте «Файлы».</small>
        {(error || query.error) && <p role="alert" className="photo-error">{error || query.error.message}</p>}
        {query.isPending && <p>Загружаю…</p>}
        <div className="photo-grid">{query.data?.data.map((file) => <article key={file.id} className={selectedId === file.id || featuredId === file.id ? 'is-selected' : ''}>
            <button type="button" className="photo-open" onClick={() => onSelect ? onSelect(file) : setPreview(file)}><FileImage scopeId={scopeId} fileId={file.id} alt={file.description || file.name}/></button>
            <small>{file.name}</small>
            {feature && <button type="button" disabled={busy} onClick={() => mark(file)}>{featuredId === file.id ? '✓ Убрать выбор' : type === 'user' ? 'На аватарку' : 'Сделать обложкой'}</button>}
            {file.can_manage && !onSelect && <button type="button" disabled={busy} onClick={() => remove(file)}>Удалить</button>}
        </article>)}</div>
        {!query.isPending && !query.data?.data.length && <p>Фотографий пока нет.</p>}
        {(page > 1 || query.data?.meta.has_more) && <footer><button disabled={page === 1} onClick={() => setPage(page - 1)}>Назад</button><span>{page}</span><button disabled={!query.data?.meta.has_more} onClick={() => setPage(page + 1)}>Далее</button></footer>}
        {preview && <FilePreview scopeId={scopeId} file={preview} onClose={() => setPreview(null)} onDownload={async () => { const blob = await apiRequest(`/scopes/${scopeId}/files/${preview.id}/download`, { responseType: 'blob' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = preview.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}/>}
    </section>;
}
