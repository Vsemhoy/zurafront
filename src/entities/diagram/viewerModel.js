export function diagramPages(xml) {
  if (typeof xml !== 'string' || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Некорректный XML схемы.');
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('Не удалось прочитать страницы схемы.');
  if (document.documentElement.tagName === 'mxGraphModel') {
    const root = document.createElement('mxfile');
    const page = document.createElement('diagram');
    page.setAttribute('id', 'single-page');
    page.setAttribute('name', 'Страница 1');
    page.appendChild(document.documentElement.cloneNode(true)); root.appendChild(page);
    return [{ id: 'single-page', name: 'Страница 1', xml: new XMLSerializer().serializeToString(root) }];
  }
  if (document.documentElement.tagName !== 'mxfile') throw new Error('Не удалось прочитать страницы схемы.');
  const pages = [...document.documentElement.children].filter((element) => element.tagName === 'diagram');
  if (!pages.length) throw new Error('В схеме нет страниц.');
  return pages.map((page, index) => {
    const root = document.documentElement.cloneNode(false);
    root.appendChild(page.cloneNode(true));
    return { id: page.getAttribute('id') || `page-${index}`, name: page.getAttribute('name') || `Страница ${index + 1}`, xml: new XMLSerializer().serializeToString(root) };
  });
}
export function svgDimensions(svg) {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = document.documentElement;
  if (root.tagName !== 'svg' || document.querySelector('parsererror')) throw new Error('Не удалось прочитать SVG схемы.');
  const box = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  const width = box?.length === 4 ? box[2] : parseFloat(root.getAttribute('width'));
  const height = box?.length === 4 ? box[3] : parseFloat(root.getAttribute('height'));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('У схемы некорректные размеры.');
  return { width, height };
}
