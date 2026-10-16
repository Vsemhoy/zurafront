import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconDeviceFloppy, IconDownload, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { diagramApi } from '../../entities/diagram/api';
import { downloadDiagramXml, editorMarker, editorMessage, editorUrl, svgDataToText } from '../../entities/diagram/model';
import './DiagramEditorModal.css';

export function DiagramEditorModal({ scopeId, diagram, onSaved, onClose }) {
  const { i18n } = useTranslation();
  const frame = useRef(null);
  const state = useRef({ xml: diagram.xml, revision: diagram.revision, sequence: 0, savedSequence: 0, busy: false, ready: false, stopped: false });
  const callbacks = useRef({ onSaved, onClose });
  useEffect(() => { callbacks.current = { onSaved, onClose }; }, [onSaved, onClose]);
  const actions = useRef({});
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Запускаю локальный редактор…');
  const url = editorUrl(window.location.origin, i18n.resolvedLanguage?.split('-')[0]);

  useEffect(() => {
    const session = state.current;
    const origin = window.location.origin;
    let disposed = false;
    let autosave;
    let timeout;
    let exportJob = null;
    let queued = false;
    let queuedExit = false;
    const post = (message) => frame.current?.contentWindow?.postMessage(JSON.stringify(message), origin);
    const stopBusy = () => { session.busy = false; if (!disposed) setBusy(false); clearTimeout(timeout); };
    const fail = (failure) => {
      exportJob = null; queued = false; queuedExit = false; session.stopped = true; stopBusy();
      if (!disposed) { setError(failure.message); setStatus('Не сохранено. Исходник можно скачать.'); }
      post({ action: 'spinner', show: false });
    };
    const close = () => {
      if (session.busy) return;
      if (session.sequence !== session.savedSequence && !window.confirm('Закрыть редактор без сохранения последних изменений? Уже сохранённые изменения останутся.')) return;
      callbacks.current.onClose();
    };
    const save = (exit = false, manual = false) => {
      clearTimeout(autosave);
      if (!session.ready || (session.stopped && !manual)) return;
      if (session.busy) { queued = true; queuedExit ||= exit; return; }
      session.stopped = false; session.busy = true; setBusy(true); setError(''); setStatus('Сохраняю схему…');
      exportJob = { sequence: session.sequence, exit };
      timeout = setTimeout(() => fail(new Error('Редактор не вернул схему вовремя. Скачайте XML и попробуйте сохранить ещё раз.')), 30000);
      // The response contains both the full multi-page XML and the current-page SVG.
      post({ action: 'export', format: 'svg', embedImages: true, theme: 'light', spinKey: 'saving' });
    };
    actions.current = { close, save: () => save(false, true) };
    const receive = async (event) => {
      const message = editorMessage(event, frame.current?.contentWindow, origin);
      if (!message || disposed) return;
      if (message.event === 'init') {
        clearTimeout(timeout);
        post({ action: 'load', xml: session.xml, title: diagram.title, autosave: 1 });
      } else if (message.event === 'load') {
        session.ready = true; setReady(true); setStatus('Автосохранение после изменений');
      } else if ((message.event === 'autosave' || message.event === 'save') && typeof message.xml === 'string') {
        session.xml = message.xml; session.sequence++; setDirty(true); setStatus('Есть изменения · готовлю сохранение…');
        clearTimeout(autosave);
        if (message.event === 'save') save(Boolean(message.exit), true);
        else autosave = setTimeout(() => save(), 1200);
      } else if (message.event === 'exit') close();
      else if (message.event === 'export' && exportJob) {
        const job = exportJob; exportJob = null; clearTimeout(timeout);
        try {
          if (typeof message.xml !== 'string' || !message.xml.trim()) throw new Error('Редактор не вернул исходник. Существующая схема не изменена.');
          const xml = message.xml;
          const preview_svg = svgDataToText(message.data);
          const result = await diagramApi.save(scopeId, diagram.id, { revision: session.revision, xml, preview_svg });
          if (disposed) return;
          session.revision = result.revision; session.savedSequence = job.sequence;
          if (session.sequence === job.sequence) session.xml = xml;
          callbacks.current.onSaved(result); setDirty(session.sequence !== session.savedSequence); setStatus(`Сохранено · версия ${result.revision}`);
          if (session.sequence === session.savedSequence) post({ action: 'status', message: 'Сохранено', modified: false });
          stopBusy();
          if ((job.exit || queuedExit) && session.sequence === session.savedSequence) callbacks.current.onClose();
          else if (queued || session.sequence !== session.savedSequence) { const exit = job.exit || queuedExit; queued = false; queuedExit = false; save(exit); }
        } catch (failure) { fail(failure); }
      } else if (message.event === 'error') fail(new Error(message.message || 'Ошибка редактора схемы.'));
    };
    const beforeUnload = (event) => {
      if (session.busy || session.sequence !== session.savedSequence) { event.preventDefault(); event.returnValue = ''; }
    };
    const keyDown = (event) => { if (event.key === 'Escape') { event.stopPropagation(); close(); } };
    window.addEventListener('message', receive);
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('keydown', keyDown);
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    const appRoot = document.getElementById('root');
    const previousInert = appRoot?.inert;
    if (appRoot) appRoot.inert = true;
    document.body.style.overflow = 'hidden';
    const controller = new AbortController();
    fetch(editorMarker, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error('missing');
      const marker = await response.json();
      if (!marker.sha256) throw new Error('missing');
      if (!disposed) {
        setInstalled(true);
        timeout = setTimeout(() => setError('Редактор не запустился. Проверьте локальную установку draw.io и обновите страницу.'), 30000);
      }
    }).catch(() => { if (!disposed) setError('Локальный draw.io ещё не установлен. Выполните npm run drawio:install на машине сборки и пересоберите фронт. Внешний сайт не используется.'); });
    return () => {
      disposed = true; controller.abort(); clearTimeout(autosave); clearTimeout(timeout);
      window.removeEventListener('message', receive); window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('keydown', keyDown);
      document.body.style.overflow = previousOverflow;
      if (appRoot) appRoot.inert = previousInert;
      previousFocus?.focus();
    };
  }, [scopeId, diagram.id, diagram.title]);

  return createPortal(<section className="diagram-editor-modal" role="dialog" aria-modal="true" aria-label={`Редактор схемы: ${diagram.title}`}>
    <header><strong>{diagram.title}</strong><span role="status">{dirty ? '● ' : ''}{status}</span>
      <button type="button" onClick={() => downloadDiagramXml(state.current.xml, diagram.title)} title="Скачать исходник, включая несохранённые изменения"><IconDownload size={16}/>XML</button>
      <button type="button" disabled={!ready || busy} onClick={() => actions.current.save?.()}><IconDeviceFloppy size={16}/>Сохранить</button>
      <button type="button" autoFocus disabled={busy} onClick={() => actions.current.close?.()}><IconX size={18}/>Закрыть редактор</button>
    </header>
    {error && <div className="diagram-error" role="alert">{error}</div>}
    {installed && <iframe ref={frame} title="Локальный редактор draw.io" src={url} sandbox="allow-scripts allow-same-origin allow-downloads" referrerPolicy="no-referrer"/>}
    {!installed && !error && <p>Проверяю локальный редактор…</p>}
  </section>, document.body);
}
