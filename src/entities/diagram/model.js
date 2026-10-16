import release from './drawio-release.json' with { type: 'json' };

export const diagramHref = (scopeId, id) => `/content/diagrams/${scopeId}/${id}`;
export const editorPath = `/vendor/drawio-${release.version}/index.html`;
export const editorMarker = `/vendor/drawio-${release.version}/zuratax-release.json`;
export function editorUrl(origin, language = 'ru') {
  const url = new URL(editorPath, origin);
  url.search = new URLSearchParams({ embed: '1', proto: 'json', spin: '1', offline: '1', lockdown: '1', local: '1', plugins: '0', ui: 'kennedy', dark: '0', lang: ['ru', 'en', 'zh'].includes(language) ? language : 'ru', saveAndExit: '1', noExitBtn: '0' });
  return url.href;
}
export function editorMessage(event, frameWindow, origin) {
  if (!frameWindow || event.source !== frameWindow || event.origin !== origin || typeof event.data !== 'string' || event.data.length > 16 * 1024 * 1024) return null;
  try {
    const data = JSON.parse(event.data);
    return data && typeof data === 'object' && typeof data.event === 'string' ? data : null;
  } catch { return null; }
}
export function svgDataToText(value) {
  if (typeof value !== 'string' || value.length > 8 * 1024 * 1024) throw new Error('Слишком большое или некорректное превью схемы.');
  let svg;
  if (/^data:image\/svg\+xml(?:;charset=[^;,]+)?;base64,/i.test(value)) {
    const bytes = Uint8Array.from(atob(value.slice(value.indexOf(',') + 1)), (char) => char.charCodeAt(0));
    svg = new TextDecoder().decode(bytes);
  } else if (/^data:image\/svg\+xml(?:;charset=[^;,]+)?,/i.test(value)) svg = decodeURIComponent(value.slice(value.indexOf(',') + 1));
  else throw new Error('Редактор не вернул SVG-превью.');
  if (!/<svg[\s>]/i.test(svg) || /<!DOCTYPE|<!ENTITY/i.test(svg)) throw new Error('Некорректное SVG-превью.');
  return svg;
}
export const svgImageSrc = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
export function downloadDiagramXml(xml, title) {
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml;charset=utf-8' }));
  const link = document.createElement('a');
  const filename = Array.from(title.replace(/[<>:"/\\|?*]/g, '_'), (char) => char.charCodeAt(0) < 32 ? '_' : char).join('');
  link.href = url; link.download = `${filename || 'diagram'}.drawio`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const diagramTargetTypes = { task: 'Задача', project: 'Проект', book: 'Книга', book_page: 'Страница книги', event: 'Событие', lore: 'Лор', darklog: 'Дарклог', fact: 'Факт', plan_item: 'План', file: 'Файл', user: 'Контактор' };
