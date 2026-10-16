import test from 'node:test';
import assert from 'node:assert/strict';
import { editorUrl, editorMessage, svgDataToText, svgImageSrc, diagramHref } from './model.js';

test('editor is pinned, local and offline, with no cloud fallback', () => {
  const url = new URL(editorUrl('https://crm.intranet', 'zh'));
  assert.equal(url.origin, 'https://crm.intranet');
  assert.equal(url.pathname, '/vendor/drawio-32.4.1/index.html');
  assert.equal(url.searchParams.get('lockdown'), '1');
  assert.equal(url.searchParams.get('proto'), 'json');
  assert.equal(url.searchParams.get('configure'), '1');
  assert.equal(url.searchParams.get('lang'), 'zh');
  assert.equal(url.searchParams.get('saveAndExit'), '0');
  assert.equal(url.searchParams.get('noExitBtn'), '1');
  assert.equal(url.searchParams.get('keepmodified'), '1');
  assert.equal(new URL(editorUrl('http://localhost:5173', 'invalid')).searchParams.get('lang'), 'ru');
});
test('messages must come from the exact iframe and origin', () => {
  const source = {};
  const event = { source, origin: 'https://crm.intranet', data: '{"event":"save","xml":"private"}' };
  assert.equal(editorMessage(event, source, event.origin).event, 'save');
  assert.equal(editorMessage(event, {}, event.origin), null);
  assert.equal(editorMessage(event, source, 'https://attacker.example'), null);
  assert.equal(editorMessage({ ...event, data: '{oops' }, source, event.origin), null);
  assert.equal(editorMessage({ ...event, data: 'null' }, source, event.origin), null);
});
test('UTF-8 SVG previews remain isolated image data', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>Схема 中文</text></svg>';
  assert.equal(svgDataToText(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`), svg);
  assert.equal(svgDataToText(svgImageSrc(svg)), svg);
  assert.throws(() => svgDataToText('https://remote.example/preview.svg'));
  assert.throws(() => svgDataToText('data:image/svg+xml,%3C!DOCTYPE%20svg%3E%3Csvg%3E'));
});
test('permalinks contain scope and diagram identity', () => {
  assert.equal(diagramHref('scope-id', 'diagram-id'), '/content/diagrams/scope-id/diagram-id');
});
