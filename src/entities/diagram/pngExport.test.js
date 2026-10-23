import test from 'node:test';
import assert from 'node:assert/strict';
import { diagramPngBlob, downloadDiagramPng } from './model.js';

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
  const previousImage = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: class {
    set src(value) { this.source = value; images.push(this); queueMicrotask(() => options.broken ? this.onerror() : this.onload()); }
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: (name) => {
    if (name === 'canvas') return canvas;
    assert.equal(name, 'a');
    return { click() { downloads.push({ href: this.href, filename: this.download }); } };
  } } });
  t.after(() => {
    if (previousImage) Object.defineProperty(globalThis, 'Image', previousImage); else delete globalThis.Image;
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument); else delete globalThis.document;
  });
  return { images, calls, downloads, canvas, context, png };
}

test('PNG rasterizes complete UTF-8 HTML labels through a data image, never a blob SVG', async (t) => {
  const app = browser(t);
  assert.equal(await diagramPngBlob(svg, { width: 320.2, height: 180.1 }), app.png);
  assert.match(app.images[0].source, /^data:image\/svg\+xml;charset=utf-8,/);
  assert.equal(decodeURIComponent(app.images[0].source.split(',').slice(1).join(',')), svg);
  assert.deepEqual([app.canvas.width, app.canvas.height], [321, 181]);
  assert.equal(app.context.fillStyle, '#fff');
  assert.deepEqual(app.calls.map(call => call[0]), ['fill', 'draw']);
});

test('PNG download uses the generated raster blob and a safe filename', async (t) => {
  const app = browser(t);
  await downloadDiagramPng(svg, 'Схема / 中文', { width: 320, height: 180 });
  assert.deepEqual(app.downloads, [{ href: 'blob:png-download', filename: 'Схема _ 中文.png' }]);
});

test('PNG reports load, canvas, encoding and security failures without downloading broken files', async (t) => {
  for (const [options, message] of [
    [{ broken: true }, /подготовить PNG/], [{ noContext: true }, /не поддерживает/],
    [{ empty: true }, /сформировать PNG/], [{ securityError: true }, /скачать SVG/],
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
