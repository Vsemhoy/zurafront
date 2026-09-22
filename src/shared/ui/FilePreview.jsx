import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IconDownload, IconX } from '@tabler/icons-react';
import { apiRequest } from '../../api';
import { filePreviewFormat } from './filePreviewFormat';
import './MarkdownRenderer.css';
import './FilePreview.css';

const markdownComponents = {
    img: ({ alt }) => <span className="file-viewer-note">[Изображение: {alt || 'внешняя ссылка'}]</span>,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    table: ({ children }) => <div className="markdown-table-scroll"><table>{children}</table></div>,
};

export function FilePreview({ scopeId, file, onClose, onDownload }) {
    const { kind, mime } = filePreviewFormat(file);
    const [content, setContent] = useState({});
    const [attempt, setAttempt] = useState(0);
    const [source, setSource] = useState(false);
    const [zoom, setZoom] = useState(1);
    const dialog = useRef(null);
    const close = useRef(onClose);
    useEffect(() => { close.current = onClose; }, [onClose]);
    useEffect(() => {
        const previous = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialog.current?.focus();
        const keyboard = (event) => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
            if (event.key === 'Tab') {
                const items = [...dialog.current.querySelectorAll('button:not(:disabled), a[href], iframe, [tabindex="0"]')];
                const index = items.indexOf(document.activeElement);
                if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1)?.focus(); }
                else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0]?.focus(); }
            }
        };
        document.addEventListener('keydown', keyboard, true);
        return () => { document.removeEventListener('keydown', keyboard, true); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
    }, []);
    useEffect(() => {
        if (kind === 'unsupported') return;
        const controller = new AbortController();
        let active = true; let objectUrl; let timer;
        const base = `/scopes/${scopeId}/files/${file.id}`;
        const started = Date.now();
        const fail = (error) => { if (active) setContent({ error: error.message }); };
        const load = async (path) => {
            const blob = await apiRequest(path, { responseType: 'blob', signal: controller.signal });
            if (!active) return;
            if (kind === 'text' || kind === 'markdown') {
                const bytes = await blob.slice(0, 200000).arrayBuffer();
                const prefix = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 2));
                const encoding = prefix[0] === 255 && prefix[1] === 254 ? 'utf-16le' : prefix[0] === 254 && prefix[1] === 255 ? 'utf-16be' : 'utf-8';
                const text = new TextDecoder(encoding).decode(bytes);
                if (active) setContent({ text, truncated: blob.size > 200000 });
            } else {
                objectUrl = URL.createObjectURL(new Blob([blob], { type: mime }));
                setContent({ url: objectUrl });
            }
        };
        const poll = async (first = false) => {
            const result = await apiRequest(`${base}/preview`, { method: first ? 'POST' : 'GET', ...(first ? { body: '{}' } : {}), signal: controller.signal });
            if (!active) return;
            if (result.data.status === 'ready') return load(`${base}/preview/content`);
            if (result.data.status === 'pending' && Date.now() - started < 120000) {
                timer = setTimeout(() => poll().catch(fail), 3000); return;
            }
            const messages = { unavailable: 'Сервис Office-превью пока недоступен. Оригинал можно скачать.', failed: 'Не удалось создать превью. Возможно, документ повреждён, защищён паролем или слишком сложный.', unsupported: 'Этот формат не поддерживается конвертером.', pending: 'Превью ещё готовится. Попробуйте открыть его немного позже.' };
            throw new Error(messages[result.data.status] || 'Превью недоступно.');
        };
        (kind === 'office' ? poll(true) : load(`${base}/download`)).catch(fail);
        return () => { active = false; controller.abort(); clearTimeout(timer); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [scopeId, file.id, kind, mime, attempt]);
    return createPortal(<section className="file-viewer" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Просмотр: ${file.name}`} onClick={(event) => event.stopPropagation()}>
        <header className="file-viewer-header"><div className="file-viewer-title"><strong>{file.name}</strong><small>Только просмотр{kind === 'office' ? ' · PDF-копия · листы Excel без разбиения по ширине' : ''}</small></div>
            {kind === 'markdown' && <button type="button" aria-pressed={source} onClick={() => setSource(!source)}>{source ? 'Markdown' : 'Исходник'}</button>}
            {kind === 'image' && <><button type="button" aria-label="Уменьшить" onClick={() => setZoom(Math.max(.25, zoom - .25))}>−</button><button type="button" title="Вписать в экран" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button><button type="button" aria-label="Увеличить" onClick={() => setZoom(Math.min(4, zoom + .25))}>+</button></>}
            <button type="button" onClick={onDownload} title="Скачать оригинал"><IconDownload size={17}/><span>Скачать</span></button><button type="button" aria-label="Закрыть просмотр" onClick={onClose}><IconX size={22}/></button>
        </header>
        <div className="file-viewer-body">
            {content.error ? <div className="file-viewer-message" role="alert"><p>{content.error}</p><button type="button" onClick={() => { setContent({}); setAttempt(attempt + 1); }}>Повторить</button></div>
                : kind === 'unsupported' ? <p className="file-viewer-message">Просмотр этого формата недоступен. Скачайте оригинал.</p>
                    : kind === 'image' && content.url ? <div className="file-viewer-image"><img style={{ width: `${zoom * 100}%`, maxWidth: 'none', height: `${zoom * 100}%` }} src={content.url} alt={file.name} onError={() => setContent({ error: 'Браузер не смог прочитать изображение. Скачайте оригинал.' })}/></div>
                        : content.url ? <iframe src={`${content.url}#view=FitH`} title={file.name}/>
                            : content.text !== undefined ? <div className="file-viewer-text" tabIndex={0}>{content.truncated && <p className="file-viewer-note">Показаны первые 200 КБ. Полный файл доступен для скачивания.</p>}{kind === 'markdown' && !source ? <article className="markdown-renderer"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={markdownComponents}>{content.text}</ReactMarkdown></article> : <pre><code>{content.text}</code></pre>}</div>
                                : <p className="file-viewer-message" role="status">{kind === 'office' ? 'Готовлю PDF-превью документа…' : 'Загружаю файл…'}</p>}
        </div>
    </section>, document.body);
}
