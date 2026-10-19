import { useEffect, useRef, useState } from 'react';
import { editorMarker, editorMessage, editorUrl, svgDataToText } from '../../entities/diagram/model';

// Uses the bundled renderer only for SVG export. No server writes or editor UI are exposed.
export function DiagramReadOnlyExport({ xml, onReady, onError }) {
  const frame = useRef(null);
  const callbacks = useRef({ onReady, onError });
  const [installed, setInstalled] = useState(false);
  useEffect(() => { callbacks.current = { onReady, onError }; }, [onReady, onError]);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    const origin = window.location.origin;
    const post = (message) => frame.current?.contentWindow?.postMessage(JSON.stringify(message), origin);
    const timeout = setTimeout(() => { if (active) callbacks.current.onError('Не удалось отрисовать страницу схемы за 30 секунд.'); }, 30000);
    const receive = (event) => {
      const message = editorMessage(event, frame.current?.contentWindow, origin);
      if (!message || !active) return;
      if (message.event === 'configure') post({ action: 'configure', config: { compressXml: true } });
      else if (message.event === 'init') post({ action: 'load', xml, title: 'Только просмотр', autosave: 0 });
      else if (message.event === 'load') post({ action: 'export', format: 'svg', embedImages: true, theme: 'light', requestId: 'viewer' });
      else if (message.event === 'export' && message.message?.requestId === 'viewer') {
        clearTimeout(timeout);
        setInstalled(false);
        try { callbacks.current.onReady(svgDataToText(message.data)); }
        catch (error) { callbacks.current.onError(error.message); }
      } else if (message.event === 'error') { clearTimeout(timeout); callbacks.current.onError(message.message || 'Ошибка отрисовки схемы.'); }
    };
    window.addEventListener('message', receive);
    fetch(editorMarker, { signal: abort.signal }).then(async (response) => {
      if (!response.ok || !(await response.json()).sha256) throw new Error('Локальный движок draw.io не установлен.');
      if (active) setInstalled(true);
    }).catch((error) => { if (active) { clearTimeout(timeout); callbacks.current.onError(error.message); } });
    return () => { active = false; clearTimeout(timeout); abort.abort(); window.removeEventListener('message', receive); };
  }, [xml]);
  return installed ? <iframe ref={frame} className="document-render-worker" src={editorUrl(window.location.origin)} title="Отрисовка страницы схемы" aria-hidden="true" tabIndex={-1} inert sandbox="allow-scripts allow-same-origin"/> : null;
}
