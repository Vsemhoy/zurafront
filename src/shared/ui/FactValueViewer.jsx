import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { IconCheck, IconCopy, IconEye, IconEyeOff } from '@tabler/icons-react';
import { factApi } from '../../entities/fact/api';
import { factRenderMode, groupedText, qrAllowed } from '../../entities/fact/model';
import MarkdownRenderer from './MarkdownRenderer';

export function FactValueViewer({ fact, scopeId }) {
  const [mode, setMode] = useState('auto');
  const [revealed, setRevealed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const masked = fact.is_sensitive || fact.display_mode === 'masked';
  const value = masked ? revealed : fact.value;
  useEffect(() => { const hide = () => { if (document.hidden) setRevealed(null); }; document.addEventListener('visibilitychange', hide); return () => document.removeEventListener('visibilitychange', hide); }, []);
  useEffect(() => { if (!copied) return; const timeout = setTimeout(() => setCopied(false), 1500); return () => clearTimeout(timeout); }, [copied]);
  const reveal = async () => {
    if (revealed != null) { setRevealed(null); return; }
    setBusy(true); setError('');
    try {
      const result = await factApi.reveal(scopeId, fact.id);
      if (result.revision !== fact.revision) throw new Error('Факт изменился. Закройте и откройте его заново.');
      setRevealed(result.value);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(value); setCopied(true); } catch { setError('Не удалось скопировать. Проверьте разрешение на буфер обмена.'); } };
  const renderMode = factRenderMode(fact, mode);
  return <section className="fact-value-viewer">
    <nav><select aria-label="Режим просмотра факта" value={mode} onChange={(event) => setMode(event.target.value)}>{Object.entries({ auto: 'По формату', large: 'Крупно', qr: 'QR', source: 'Исходник' }).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
      {masked && <button type="button" disabled={busy || !fact.can_reveal} onClick={reveal}>{revealed != null ? <IconEyeOff size={16}/> : <IconEye size={16}/>} {revealed != null ? 'Скрыть' : 'Раскрыть'}</button>}
      <button type="button" disabled={value == null} onClick={copy}>{copied ? <IconCheck size={16}/> : <IconCopy size={16}/>} {copied ? 'Скопировано' : 'Копировать'}</button>
    </nav>
    {error && <p role="alert" className="record-error">{error}</p>}
    {value == null ? <div className="fact-secret"><IconEyeOff size={28}/><p>Значение скрыто. Копирование и QR доступны только после раскрытия.</p></div>
      : renderMode === 'qr' ? <div className="fact-qr">{qrAllowed(value) ? <QRCodeSVG value={value} size={320} level="M" marginSize={4} title={fact.label}/> : <p>QR доступен для непустого значения до 1200 байт. Используйте копирование или исходник.</p>}<small>QR строится локально, без сторонних сервисов.</small></div>
        : renderMode === 'large' ? <LargeFactText value={value}/>
          : renderMode === 'metric' ? <div className="fact-metric">{value}<small>{fact.unit}</small></div>
            : renderMode === 'article' ? <MarkdownRenderer>{value}</MarkdownRenderer>
              : renderMode === 'preview' && fact.format === 'svg' ? <img className="fact-svg-preview" alt={fact.label} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`}/>
                : ['snippet', 'terminal', 'source', 'mono'].includes(renderMode) ? <pre className={`fact-source fact-source--${renderMode}`}><code>{value}</code></pre>
                  : <div className="fact-plain">{value}</div>}
  </section>;
}

function LargeFactText({ value }) {
  const wrapper = useRef(null);
  const text = useRef(null);
  const [group, setGroup] = useState(Array.from(value).length);
  const canGroup = !/\s/u.test(value) && value.length > 5;
  const rendered = canGroup ? groupedText(value, group) : value;
  useLayoutEffect(() => {
    const fit = () => {
      if (!wrapper.current || !text.current) return;
      let low = 12; let high = 220; let size = 12;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        text.current.style.fontSize = `${mid}px`;
        if (text.current.scrollWidth <= wrapper.current.clientWidth && text.current.scrollHeight <= wrapper.current.clientHeight) { size = mid; low = mid + 1; } else high = mid - 1;
      }
      text.current.style.fontSize = `${size}px`;
    };
    fit(); const observer = new ResizeObserver(fit); observer.observe(wrapper.current); return () => observer.disconnect();
  }, [rendered]);
  return <div className="fact-large-wrap"><div className="fact-large" ref={wrapper}><span ref={text}>{rendered}</span></div>{canGroup && <label>Символов в группе: {group}<input type="range" min="1" max={Array.from(value).length} value={group} onChange={(event) => setGroup(Number(event.target.value))}/></label>}</div>;
}
