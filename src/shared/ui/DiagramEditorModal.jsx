import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconCheck, IconDeviceFloppy, IconDownload, IconLoader2, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { diagramApi } from '../../entities/diagram/api';
import { createDiagramEditorSession } from '../../entities/diagram/editorSession';
import { downloadDiagramXml, editorMarker, editorMessage, editorUrl } from '../../entities/diagram/model';
import './DiagramEditorModal.css';

export function DiagramEditorModal({ scopeId, diagram, onSaved, onClose }) {
  const { i18n } = useTranslation();
  const frame = useRef(null);
  const session = useRef(null);
  const documentSnapshot = useRef(diagram);
  const diagramId = diagram.id;
  useEffect(() => { documentSnapshot.current = diagram; }, [diagram]);
  const callbacks = useRef({ onSaved, onClose });
  useEffect(() => { callbacks.current = { onSaved, onClose }; }, [onSaved, onClose]);
  const [installed, setInstalled] = useState(false);
  const [view, setView] = useState({ phase: 'loading', busy: false, ready: false, dirty: false, error: '', status: 'Запускаю локальный редактор…', savedCount: 0 });
  const url = editorUrl(window.location.origin, i18n.resolvedLanguage?.split('-')[0]);

  useEffect(() => {
    const origin = window.location.origin;
    let disposed = false;
    let timeout;
    const editor = createDiagramEditorSession({
      diagram: documentSnapshot.current,
      post: (message) => frame.current?.contentWindow?.postMessage(JSON.stringify(message), origin),
      persist: (payload) => diagramApi.save(scopeId, diagramId, payload),
      onChange: setView,
      onSaved: (result) => callbacks.current.onSaved(result),
      onClose: () => callbacks.current.onClose(),
    });
    session.current = editor;
    const receive = (event) => {
      const message = editorMessage(event, frame.current?.contentWindow, origin);
      if (!message || disposed) return;
      if (message.event === 'init' || message.event === 'load') clearTimeout(timeout);
      void editor.receive(message);
    };
    const beforeUnload = (event) => {
      if (editor.unsaved) { event.preventDefault(); event.returnValue = ''; }
    };
    const keyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault(); event.stopPropagation(); editor.save();
      } else if (event.key === 'Escape') { event.stopPropagation(); editor.close(); }
    };
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
        timeout = setTimeout(() => setView((value) => ({ ...value, phase: 'error', error: 'Редактор не запустился. Проверьте локальную установку draw.io и обновите страницу.' })), 30000);
      }
    }).catch(() => {
      if (!disposed) setView((value) => ({ ...value, phase: 'error', error: 'Локальный draw.io ещё не установлен. Выполните npm run drawio:install на машине сборки и пересоберите фронт. Внешний сайт не используется.' }));
    });
    return () => {
      disposed = true; controller.abort(); clearTimeout(timeout); editor.dispose();
      window.removeEventListener('message', receive); window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('keydown', keyDown);
      document.body.style.overflow = previousOverflow;
      if (appRoot) appRoot.inert = previousInert;
      previousFocus?.focus();
    };
  }, [scopeId, diagramId]);

  return createPortal(<section className="diagram-editor-modal" role="dialog" aria-modal="true" aria-label={`Редактор схемы: ${diagram.title}`} aria-busy={view.busy}>
    <header><strong>{diagram.title}</strong><span className={`diagram-save-status diagram-save-status--${view.phase}`} role="status" aria-live="polite">
      {view.busy ? <IconLoader2 size={15} className="diagram-saving-spin"/> : view.phase === 'saved' ? <IconCheck key={view.savedCount} size={16} className="diagram-saved-check"/> : view.dirty ? <i aria-hidden="true">●</i> : null}{view.status}
    </span>
      <button type="button" onClick={() => downloadDiagramXml(session.current?.xml || diagram.xml, diagram.title)} title="Скачать исходник, включая несохранённые изменения"><IconDownload size={16}/>XML</button>
      <button type="button" disabled={!view.ready || view.busy} title="Сохранить версию · Ctrl+S / ⌘S" onClick={() => session.current?.save()}><IconDeviceFloppy size={16}/>Сохранить</button>
      <button type="button" autoFocus disabled={view.busy} onClick={() => session.current?.close()}><IconX size={18}/>{view.dirty ? 'Сохранить и закрыть' : 'Закрыть редактор'}</button>
    </header>
    {view.error && <div className="diagram-error" role="alert">{view.error}</div>}
    {installed && <iframe ref={frame} title="Локальный редактор draw.io" inert={!view.ready} src={url} sandbox="allow-scripts allow-same-origin allow-downloads" referrerPolicy="no-referrer"/>}
    {!installed && !view.error && <p>Проверяю локальный редактор…</p>}
  </section>, document.body);
}
