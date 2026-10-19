import { useEffect, useMemo, useRef, useState } from 'react';
import { IconFocusCentered, IconMinus, IconPlus } from '@tabler/icons-react';
import { diagramPages, svgDimensions } from '../../entities/diagram/viewerModel';
import { downloadDiagramPng, downloadDiagramSvg, svgImageSrc } from '../../entities/diagram/model';
import { diagramCanvasOverscan, diagramPoint, fitDiagram, selectionRegion, zoomAt } from '../../entities/content-navigation/model';
import { DiagramReadOnlyExport } from './DiagramReadOnlyExport';

export function DiagramViewport({ diagram, links, showLinks, drawing, onRegion, onFollow, remembered = {}, onRemember }) {
  const pages = useMemo(() => { try { return { items: diagramPages(diagram.xml) }; } catch (error) { return { items: [], error: error.message }; } }, [diagram.xml]);
  const [pageId, setPageId] = useState(remembered.pageId || pages.items[0]?.id);
  const page = pages.items.find((item) => item.id === pageId) || pages.items[0];
  return <div className="document-diagram"><div className="document-page-tabs" aria-label="Страницы схемы">{pages.items.map((item) => <button key={item.id} className={page?.id === item.id ? 'active' : ''} onClick={() => { setPageId(item.id); onRemember({ pageId: item.id, transform: remembered.pages?.[item.id] || null }); }}>{item.name}</button>)}</div>
    {pages.error ? <p className="diagram-error" role="alert">{pages.error}</p> : <DiagramCanvas key={`${diagram.id}:${diagram.revision}:${page.id}`} page={page} links={links.filter((link) => link.region?.page_id === page.id)} revision={diagram.revision} showLinks={showLinks} drawing={drawing} onRegion={onRegion} onFollow={onFollow} remembered={remembered.pages?.[page.id] || (remembered.pageId === page.id ? remembered.transform : null)} onRemember={(transform) => onRemember({ pageId: page.id, transform, pages: { ...remembered.pages, [page.id]: transform } })}/>}
  </div>;
}

function DiagramCanvas({ page, links, revision, showLinks, drawing, onRegion, onFollow, remembered, onRemember }) {
  const stage = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState(remembered || { scale: 1, x: 0, y: 0 });
  const initialTransform = useRef(remembered);
  const currentView = useRef(view);
  const [selection, setSelection] = useState(null);
  const remember = useRef(onRemember);
  useEffect(() => { remember.current = onRemember; }, [onRemember]);
  useEffect(() => { currentView.current = view; remember.current(view); }, [view]);
  const fit = () => { if (image && stage.current) setView(fitDiagram(stage.current.getBoundingClientRect(), image, diagramCanvasOverscan)); };
  const loaded = (svg) => {
    try {
      const next = { ...svgDimensions(svg), src: svgImageSrc(svg), svg };
      setImage(next); setError('');
      if (!initialTransform.current && stage.current) setView(fitDiagram(stage.current.getBoundingClientRect(), next, diagramCanvasOverscan));
    } catch (failure) { setError(failure.message); }
  };
  useEffect(() => {
    const element = stage.current;
    const wheel = (event) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      setView((value) => zoomAt(value, { x: event.clientX - rect.left, y: event.clientY - rect.top }, Math.exp(-Math.max(-200, Math.min(200, event.deltaY)) * .003)));
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);
  const position = (event) => { const rect = stage.current.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  const down = (event) => {
    if (!image || event.button !== 0 || event.target.closest('button')) return;
    stage.current.setPointerCapture(event.pointerId);
    const point = position(event);
    pointers.current.set(event.pointerId, point);
    if (drawing && pointers.current.size === 1) {
      const start = diagramPoint(point, currentView.current, image, diagramCanvasOverscan);
      gesture.current = { start, end: start }; setSelection(null);
    }
  };
  const move = (event) => {
    if (!pointers.current.has(event.pointerId)) return;
    const previous = [...pointers.current.values()];
    const old = pointers.current.get(event.pointerId);
    const point = position(event);
    pointers.current.set(event.pointerId, point);
    if (drawing && gesture.current) {
      const end = diagramPoint(point, currentView.current, image, diagramCanvasOverscan);
      gesture.current.end = end;
      setSelection(selectionRegion(gesture.current.start, end, page.id));
    } else if (pointers.current.size === 1) setView((value) => ({ ...value, x: value.x + point.x - old.x, y: value.y + point.y - old.y }));
    else if (pointers.current.size === 2) {
      const next = [...pointers.current.values()];
      const center = (points) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
      const distance = (points) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const from = center(previous), to = center(next);
      setView((value) => { const zoom = zoomAt(value, from, distance(next) / Math.max(1, distance(previous))); return { ...zoom, x: zoom.x + to.x - from.x, y: zoom.y + to.y - from.y }; });
    }
  };
  const up = (event) => {
    pointers.current.delete(event.pointerId);
    if (gesture.current) {
      const region = selectionRegion(gesture.current.start, gesture.current.end, page.id);
      gesture.current = null; setSelection(null);
      if (event.type !== 'pointercancel' && region) onRegion(region);
    }
  };
  const zoom = (factor) => { const rect = stage.current.getBoundingClientRect(); setView((value) => zoomAt(value, { x: rect.width / 2, y: rect.height / 2 }, factor)); };
  const exportPng = async () => {
    if (!image || exporting) return;
    setExporting(true);
    try { await downloadDiagramPng(image.svg, page.name, image); }
    catch (failure) { setError(failure.message); }
    finally { setExporting(false); }
  };
  const regionStyle = (region) => ({ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` });
  return <div className={`document-diagram-stage${drawing ? ' is-drawing' : ''}`} ref={stage} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}>
    <DiagramReadOnlyExport key={attempt} xml={page.xml} onReady={loaded} onError={setError}/>
    {!image && !error && <p className="document-stage-message" role="status">Отрисовываю страницу…</p>}
    {error && <div className="document-stage-message" role="alert">{error}<button onClick={() => { setError(''); setAttempt(attempt + 1); }}>Повторить</button></div>}
    {image && <div className="document-diagram-image" style={{ width: image.width, height: image.height, transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})` }}>
      <img src={image.src} alt={page.name} draggable={false}/>
      {showLinks && !drawing && links.map((link) => <button key={link.id} className={`document-hotspot${link.source_revision !== revision ? ' is-stale' : ''}`} style={regionStyle(link.region)} aria-label={`Открыть: ${link.label || link.target.title}`} title={`${link.label || link.target.title}${link.source_revision !== revision ? ' · положение рамки нужно проверить' : ''}`} onClick={() => onFollow(link.target)}><span>{link.label || link.target.code || link.target.title}</span></button>)}
      {selection && <div className="document-hotspot document-hotspot--selection" style={regionStyle(selection)}/>}
    </div>}
    <div className="document-zoom-tools"><button aria-label="Уменьшить схему" onClick={() => zoom(1 / 1.25)}><IconMinus size={17}/></button><span>{Math.round(view.scale * 100)}%</span><button aria-label="Увеличить схему" onClick={() => zoom(1.25)}><IconPlus size={17}/></button><button aria-label="Вписать схему" onClick={fit}><IconFocusCentered size={18}/></button><button onClick={() => { const rect = stage.current.getBoundingClientRect(); setView((value) => zoomAt(value, { x: rect.width / 2, y: rect.height / 2 }, 1 / value.scale)); }}>1:1</button><button disabled={!image} title="Скачать схему без навигационных рамок" onClick={() => downloadDiagramSvg(image.svg, page.name)}>SVG</button><button disabled={!image || exporting} title="Скачать схему без навигационных рамок" onClick={exportPng}>{exporting ? "…" : "PNG"}</button></div>
    <small className="document-pan-hint">{drawing ? 'Выделите рамку на схеме' : 'Тяните для перемещения · колесо или два пальца — масштаб'}</small>
  </div>;
}
