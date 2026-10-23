import release from './drawio-release.json' with { type: 'json' };

export const diagramHref = (scopeId, id) => `/content/diagrams/${scopeId}/${id}`;
export const canEditDiagram = (diagram) => Boolean(diagram?.can_edit ?? diagram?.can_manage);
export const editorPath = `/vendor/drawio-${release.version}/index.html`;
export const editorMarker = `/vendor/drawio-${release.version}/zuratax-release.json`;
export function editorUrl(origin, language = 'ru') {
  const url = new URL(editorPath, origin);
  url.search = new URLSearchParams({ embed: '1', proto: 'json', configure: '1', spin: '1', offline: '1', lockdown: '1', local: '1', plugins: '0', ui: 'kennedy', dark: '0', lang: ['ru', 'en', 'zh'].includes(language) ? language : 'ru', saveAndExit: '0', noExitBtn: '1', keepmodified: '1' });
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
function diagramExportFilename(title, extension) {
  const safe = Array.from((title || 'diagram').replace(/[<>:"/\\|?*]/g, '_'), (char) => char.charCodeAt(0) < 32 ? '_' : char).join('');
  return `${safe || 'diagram'}.${extension}`;
}
function downloadDiagramBlob(blob, title, extension) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = diagramExportFilename(title, extension); link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadDiagramSvg(svg, title) {
  downloadDiagramBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), title, 'svg');
}
export async function diagramPngBlob(svg, dimensions) {
  if (!Number.isFinite(dimensions?.width) || !Number.isFinite(dimensions?.height) || dimensions.width <= 0 || dimensions.height <= 0) {
    throw new Error('У схемы некорректные размеры для PNG.');
  }
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Не удалось подготовить PNG схемы.'));
    // Blob SVGs with draw.io HTML labels (foreignObject) taint canvas in some browsers.
    // Keep the document isolated as an image, using the same data URL as the viewer.
    image.src = svgImageSrc(svg);
  });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(dimensions.width));
  canvas.height = Math.max(1, Math.ceil(dimensions.height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Браузер не поддерживает экспорт PNG.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Не удалось сформировать PNG схемы.');
    return blob;
  } catch (error) {
    if (error.name === 'SecurityError') throw new Error('Браузер запретил экспорт изображения схемы. Попробуйте скачать SVG.');
    throw error;
  }
}
export async function downloadDiagramPng(svg, title, dimensions) {
  downloadDiagramBlob(await diagramPngBlob(svg, dimensions), title, 'png');
}
export const diagramTargetTypes = { task: 'Задача', project: 'Проект', book: 'Книга', book_page: 'Страница книги', event: 'Событие', lore: 'Лор', darklog: 'Дарклог', fact: 'Факт', plan_item: 'План', file: 'Файл', user: 'Контактор', thing: 'Оборудование' };
