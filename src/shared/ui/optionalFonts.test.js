import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadOptionalFonts } from './optionalFonts.js';

test('optional fonts are attached once without waiting for network, including StrictMode remount', () => {
  const nodes = new Map();
  let appended = 0;
  const document = { getElementById: (id) => nodes.get(id), createElement: (type) => ({ type }),
    head: { appendChild: (node) => { nodes.set(node.id, node); appended++; } } };
  assert.equal(loadOptionalFonts(document), undefined);
  loadOptionalFonts(document);
  assert.equal(appended, 1);
  const link = nodes.get('zuratax-optional-fonts');
  assert.equal(link.rel, 'stylesheet');
  assert.equal(new URL(link.href).hostname, 'fonts.googleapis.com');
  assert.equal(link.onload, undefined);
});
