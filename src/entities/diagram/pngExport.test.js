import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDiagramPngScale, diagramPngBlob, diagramPngSize, downloadDiagramPng } from './model.js';

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><foreignObject width="320" height="180"><div xmlns="http://www.w3.org/1999/xhtml">Схема 中文 <b>HTML</b></div></foreignObject></svg>';

function browser(t, options = {}) {
  const images = [], calls = [], downloads = [];
  const png = new Blob(['png'], { type: 'image/png' });
  const context = { fillStyle: '', fillRect: (...args) => calls.push(['fill', ...args]), drawImage: (...args) => calls.push(['draw', ...args]) };
  const canvas = { width: 0, height: 0, getContext: () => options.noContext ? null : context, toBlob: (done, type) => {
    assert.equal(type, 'image/png');
    if (options.securityError) throw new DOMException('Tainted canvas', 'SecurityError');
    done(options.empty ? null : png);
  } };
  t.mock.method(globalThis, 'setTimeout', () => 0);
  t.mock.method(URL, 'createObjectURL', (blob) => { assert.equal(blob.type, 'image/png'); return 'blob:png-download'; });
  t.mock.method(URL, 'revokeObjectURL', () => {});
  const globals = new Map(['Image', 'document', 'DOMParser', 'XMLSerializer'].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  Object.defineProperty(globalThis, 'DOMParser', { configurable: true, value: class {
    parseFromString(source, type) {
      assert.equal(type, 'image/svg+xml');
      const attributes = new Map([...source.slice(0, source.indexOf('>')).matchAll(/([\w:]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
      return { source, attributes, documentElement: { localName: 'svg', getAttribute: (key) => attributes.get(key), setAttribute: (key, value) => attributes.set(key, value) }, querySelector: () => options.invalidSvg ? {} : null };
    }
  } });
  Object.defineProperty(globalThis, 'XMLSerializer', { configurable: true, value: class {
    serializeToString(document) { return `<svg ${[...document.attributes].map(([key, value]) => `${key}="${value}"`).join(' ')}>${document.source.slice(document.source.indexOf('>') + 1)}`; }
  } });
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: class {
    set src(value) { this.source = value; images.push(this); queueMicrotask(() => options.broken ? this.onerror() : this.onload()); }
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: (name) => {
    if (name === 'canvas') return canvas;
    assert.equal(name, 'a');
    return { click() { downloads.push({ href: this.href, filename: this.download }); } };
  } } });
  t.after(() => {
    for (const [name, previous] of globals) {
      if (previous) Object.defineProperty(globalThis, name, previous); else delete globalThis[name];
    }
  });
  return { images, calls, downloads, canvas, context, png };
}

test('PNG rasterizes complete UTF-8 HTML labels through a data image, never a blob SVG', async (t) => {
  const app = browser(t);
  assert.equal(await diagramPngBlob(svg, { width: 320.2, height: 180.1 }), app.png);
  assert.match(app.images[0].source, /^data:image\/svg\+xml;charset=utf-8,/);
  const source = decodeURIComponent(app.images[0].source.slice(app.images[0].source.indexOf(',') + 1));
  assert.ok(source.endsWith(svg.slice(svg.indexOf('>') + 1)));
  assert.match(source, /width="961"/);
  assert.match(source, /height="541"/);
  assert.match(source, /viewBox="0 0 320.2 180.1"/);
  assert.deepEqual([app.canvas.width, app.canvas.height], [961, 541]);
  assert.equal(app.context.fillStyle, '#fff');
  assert.deepEqual(app.calls.map(call => call[0]), ['fill', 'draw']);
});

test('PNG resolution changes the intrinsic SVG size without moving its original viewBox', async (t) => {
  const app = browser(t);
  const source = svg.replace('width="320"', 'viewBox="10 20 320 180" width="320"');
  await diagramPngBlob(source, { width: 320, height: 180 }, 4);
  const exported = decodeURIComponent(app.images[0].source.slice(app.images[0].source.indexOf(',') + 1));
  assert.match(exported, /viewBox="10 20 320 180"/);
  assert.match(exported, /width="1280"/);
  assert.match(exported, /height="720"/);
  assert.deepEqual([app.canvas.width, app.canvas.height], [1280, 720]);
  assert.deepEqual(app.calls[1].slice(2), [0, 0, 1280, 720]);
});

test('PNG offers explicit 1x resolution and defaults to three times the document size', () => {
  assert.equal(defaultDiagramPngScale, 3);
  assert.deepEqual(diagramPngSize({ width: 320, height: 180 }), { width: 960, height: 540 });
  assert.deepEqual(diagramPngSize({ width: 320, height: 180 }, 1), { width: 320, height: 180 });
  assert.deepEqual(diagramPngSize({ width: 320, height: 180 }, 2), { width: 640, height: 360 });
});

test('PNG rejects unsafe canvas dimensions and unsupported scales before allocating image memory', async () => {
  assert.deepEqual(diagramPngSize({ width: 2000, height: 2000 }, 2), { width: 4000, height: 4000 });
  for (const dimensions of [{ width: 2000, height: 2000 }, { width: 3000, height: 1 }, { width: Number.MAX_VALUE, height: 1 }]) {
    await assert.rejects(diagramPngBlob(svg, dimensions), /слишком большой/);
  }
  for (const scale of [0, -1, 1.5, 5, NaN, Infinity, '3', null]) {
    await assert.rejects(diagramPngBlob(svg, { width: 320, height: 180 }, scale), /масштаб PNG/);
  }
});

test('PNG download uses the generated raster blob and a safe filename', async (t) => {
  const app = browser(t);
  await downloadDiagramPng(svg, 'Схема / 中文', { width: 320, height: 180 });
  assert.deepEqual(app.downloads, [{ href: 'blob:png-download', filename: 'Схема _ 中文.png' }]);
});

test('PNG reports load, canvas, encoding and security failures without downloading broken files', async (t) => {
  for (const [options, message] of [
    [{ broken: true }, /подготовить PNG/], [{ noContext: true }, /не поддерживает/],
    [{ empty: true }, /сформировать PNG/], [{ securityError: true }, /скачать SVG/], [{ invalidSvg: true }, /Некорректный SVG/],
  ]) {
    await t.test(JSON.stringify(options), async (child) => {
      const app = browser(child, options);
      await assert.rejects(downloadDiagramPng(svg, 'Test', { width: 320, height: 180 }), message);
      assert.equal(app.downloads.length, 0);
    });
  }
});

test('invalid PNG dimensions are rejected before allocating a canvas', async () => {
  for (const dimensions of [null, {}, { width: 0, height: 1 }, { width: 1, height: -1 }, { width: Infinity, height: 1 }, { width: 1, height: NaN }]) {
    await assert.rejects(diagramPngBlob(svg, dimensions), /некорректные размеры/);
  }
});
