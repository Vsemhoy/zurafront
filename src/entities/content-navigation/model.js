export const nodeTypes = { diagram: 'Схема', file: 'Файл', lore: 'Лор', task: 'Задача', lightbook: 'Lightbook' };
export const diagramCanvasOverscan = .05;
export const nodeKey = (node) => `${node.type}:${node.id}:${node.versionId || ''}`;
export const createTrail = (node) => ({ visits: [{ ...node, view: {} }], cursor: 0 });
export function followNode(trail, node) {
  return { visits: [...trail.visits.slice(0, trail.cursor + 1), { ...node, view: {} }], cursor: trail.cursor + 1 };
}
export function moveTrail(trail, cursor) {
  return { ...trail, cursor: Math.max(0, Math.min(trail.visits.length - 1, cursor)) };
}
export function rememberVisit(trail, patch) {
  return { ...trail, visits: trail.visits.map((visit, index) => index === trail.cursor ? { ...visit, ...patch } : visit) };
}
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function zoomAt(view, point, factor) {
  const scale = clamp(view.scale * factor, .005, 64);
  const ratio = scale / view.scale;
  return { scale, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio };
}
export function fitDiagram(box, image, overscan = 0) {
  const scale = clamp(Math.min(Math.max(20, box.width - 48) / (image.width * (1 + overscan * 2)), Math.max(20, box.height - 48) / (image.height * (1 + overscan * 2))), .005, 64);
  return { scale, x: (box.width - image.width * scale) / 2, y: (box.height - image.height * scale) / 2 };
}
export function diagramPoint(point, view, image, overscan = 0) {
  return { x: clamp((point.x - view.x) / (view.scale * image.width), -overscan, 1 + overscan), y: clamp((point.y - view.y) / (view.scale * image.height), -overscan, 1 + overscan) };
}
export function selectionRegion(start, end, pageId) {
  const region = { page_id: pageId, x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
  return region.width >= .002 && region.height >= .002 ? region : null;
}
export function nodeFromHref(href, scopeId, origin) {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin) return null;
    const ulid = '[0-9a-hjkmnp-tv-z]{26}';
    const match = url.pathname.match(new RegExp(`^/content/diagrams/(${ulid})/(${ulid})/?$`, 'i'));
    if (match) return match[1] === scopeId ? { type: 'diagram', id: match[2] } : null;
    const lore = url.pathname.match(new RegExp(`^/lore/(${ulid})/(${ulid})/?$`, 'i'));
    if (lore) return lore[1] === scopeId ? { type: 'lore', id: lore[2] } : null;
    const task = url.pathname.match(new RegExp(`^/tasks/(${ulid})(?:/edit)?/?$`, 'i'));
    if (task) return { type: 'task', id: task[1] };
    const lightbook = url.pathname.match(new RegExp(`^/content/lightbooks/(${ulid})(?:/(?:versions|blocks)/${ulid})?/?$`, 'i'));
    if (lightbook) return { type: 'lightbook', id: lightbook[1] };
    if (['/files', '/content/files'].includes(url.pathname) && new RegExp(`^${ulid}$`, 'i').test(url.searchParams.get('file') || '')) return { type: 'file', id: url.searchParams.get('file') };
  } catch { /* Invalid or external links are not internal nodes. */ }
  return null;
}
