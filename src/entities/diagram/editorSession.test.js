import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiagramEditorSession, diagramSourceKey } from './editorSession.js';
import { svgImageSrc } from './model.js';

const source = (text) => `<mxfile><diagram id="page-1">${text}</diagram></mxfile>`;
const svg = svgImageSrc('<svg xmlns="http://www.w3.org/2000/svg"><text>Схема</text></svg>');
function setup(persist, normalizedXml = source('original'), confirmClose = false) {
  const messages = [], writes = [], views = [], saved = [], timers = new Map();
  let closed = 0, requestedClose = 0, timerId = 0;
  const editor = createDiagramEditorSession({
    diagram: { id: 'diagram-1', title: 'Test', xml: source('original'), revision: 1 },
    post: (message) => messages.push(message),
    persist: async (payload) => {
      writes.push(payload);
      return persist ? persist(payload) : { ...payload, revision: payload.revision + 1 };
    },
    onChange: (view) => views.push(view),
    onSaved: (result) => saved.push(result),
    onClose: () => closed++,
    onRequestClose: confirmClose ? () => requestedClose++ : undefined,
    schedule: (callback) => { timers.set(++timerId, callback); return timerId; },
    cancel: (id) => timers.delete(id),
  });
  void editor.receive({ event: 'configure' });
  void editor.receive({ event: 'init' });
  void editor.receive({ event: 'load' });
  assert.deepEqual(messages[0], { action: 'configure', config: { compressXml: true } });
  assert.equal(messages.at(-1).format, 'xml');
  void editor.receive({ event: 'export', xml: normalizedXml, message: messages.at(-1) });
  assert.equal(views.at(-1).ready, true);
  messages.length = 0;
  return { editor, messages, writes, views, saved, timers,
    get closed() { return closed; },
    get requestedClose() { return requestedClose; },
    get view() { return views.at(-1); },
    get request() { return messages.filter((message) => message.action === 'export').at(-1); },
    draft: (xml) => editor.receive({ event: 'autosave', xml }),
    export: (xml, data = svg) => editor.receive({ event: 'export', xml, data, message: messages.filter((message) => message.action === 'export').at(-1) }),
  };
}

test('background change notifications only update the draft, not server versions', async () => {
  const app = setup();
  await app.draft(source('a'));
  await app.draft(source('b'));
  assert.equal(app.writes.length, 0);
  assert.equal(app.messages.filter((message) => message.action === 'export').length, 0);
  assert.equal(app.editor.xml, source('b'));
  assert.equal(app.editor.unsaved, true);
  assert.equal(app.view.dirty, true);
});

test('normalization on import is not an edit and never creates a version', async () => {
  const app = setup(null, '<mxfile compressed="true"><diagram id="page-1">normalized-pages</diagram></mxfile>');
  assert.equal(app.editor.unsaved, false);
  app.editor.close();
  await app.export(app.editor.xml);
  assert.equal(app.writes.length, 0);
  assert.equal(app.closed, 1);
});

test('Ctrl+S from draw.io saves once, signals success and never exits', async () => {
  const app = setup();
  await app.editor.receive({ event: 'save', exit: true, xml: source('changed') });
  assert.equal(app.view.busy, true);
  await app.export(source('changed'));
  assert.equal(app.writes.length, 1);
  assert.equal(app.writes[0].revision, 1);
  assert.equal(app.writes[0].preview_svg.includes('<svg'), true);
  assert.equal(app.closed, 0);
  assert.equal(app.view.phase, 'saved');
  assert.equal(app.view.savedCount, 1);
  assert.equal(app.editor.unsaved, false);
  assert.deepEqual(app.messages.at(-1), { action: 'status', message: 'Сохранено', modified: false });
});

test('repeated Save or close without changes creates no extra version', async () => {
  const app = setup();
  app.editor.save();
  await app.export(source('changed'));
  app.editor.save();
  await app.export(source('changed').replace('<mxfile>', '<mxfile modified="later" etag="random">'));
  assert.equal(app.writes.length, 1);
  assert.equal(app.view.savedCount, 2);
  app.editor.close();
  await app.export(source('changed'));
  assert.equal(app.writes.length, 1);
  assert.equal(app.closed, 1);
});

test('closing a dirty editor persists the final drawing before exiting', async () => {
  let resolve;
  const app = setup((payload) => new Promise((done) => { resolve = () => done({ ...payload, revision: 2 }); }));
  await app.draft(source('last edit'));
  app.editor.close();
  const saving = app.export(source('last edit'));
  assert.equal(app.closed, 0);
  resolve();
  await saving;
  assert.equal(app.closed, 1);
  assert.equal(app.editor.unsaved, false);
});

test('close always exports, capturing changes whose notification has not arrived yet', async () => {
  const app = setup();
  assert.equal(app.editor.unsaved, false);
  app.editor.close();
  await app.export(source('typed just before clicking close'));
  assert.equal(app.writes[0].xml, source('typed just before clicking close'));
  assert.equal(app.closed, 1);
});

test('new edits during a request remain unsaved instead of silently creating another version', async () => {
  let resolve;
  const app = setup((payload) => new Promise((done) => { resolve = () => done({ ...payload, revision: 2 }); }));
  await app.draft(source('version two'));
  app.editor.save();
  const saving = app.export(source('version two'));
  await app.draft(source('later draft'));
  resolve();
  await saving;
  assert.equal(app.writes.length, 1);
  assert.equal(app.editor.xml, source('later draft'));
  assert.equal(app.view.dirty, true);
  assert.equal(app.closed, 0);
  assert.equal(app.messages.filter((message) => message.action === 'status').length, 0);
});

test('queued close flushes newer changes with the acknowledged revision, not a stale one', async () => {
  let resolve;
  let first = true;
  const app = setup((payload) => {
    if (first) { first = false; return new Promise((done) => { resolve = () => done({ ...payload, revision: 2 }); }); }
    return { ...payload, revision: payload.revision + 1 };
  });
  app.editor.save();
  const saving = app.export(source('v2'));
  await app.draft(source('v3'));
  app.editor.close();
  resolve();
  await saving;
  assert.equal(app.closed, 0);
  await app.export(source('v3'));
  assert.deepEqual(app.writes.map((item) => item.revision), [1, 2]);
  assert.equal(app.closed, 1);
});

test('rapid repeat save requests are serialized and identical snapshots are skipped', async () => {
  let resolve;
  const app = setup((payload) => new Promise((done) => { resolve = () => done({ ...payload, revision: 2 }); }));
  app.editor.save();
  const saving = app.export(source('v2'));
  app.editor.save(); app.editor.save(); app.editor.save();
  resolve();
  await saving;
  await app.export(source('v2'));
  assert.equal(app.writes.length, 1);
  assert.equal(app.view.busy, false);
});

test('a rejected save keeps the draft, reports an error, does not close and can be retried', async () => {
  let reject = true;
  const app = setup((payload) => { if (reject) throw new Error('409: changed in another tab'); return { ...payload, revision: 2 }; });
  await app.draft(source('my work'));
  app.editor.close();
  await app.export(source('my work'));
  assert.equal(app.view.phase, 'error');
  assert.match(app.view.error, /409/);
  assert.equal(app.editor.xml, source('my work'));
  assert.equal(app.editor.unsaved, true);
  assert.equal(app.closed, 0);
  assert.equal(app.saved.length, 0);
  reject = false;
  app.editor.save();
  await app.export(source('my work'));
  assert.equal(app.view.phase, 'saved');
  assert.equal(app.closed, 0);
});

test('invalid XML or preview never overwrites the server or exits', async () => {
  for (const [xml, data] of [['', svg], [source('draft'), 'https://remote/preview.svg']]) {
    const app = setup();
    await app.draft(source('draft'));
    app.editor.close();
    await app.export(xml, data);
    assert.equal(app.writes.length, 0);
    assert.equal(app.closed, 0);
    assert.equal(app.view.phase, 'error');
    assert.equal(app.editor.xml, source('draft'));
  }
});

test('timed-out exports cannot complete a later save request', async () => {
  const app = setup();
  await app.draft(source('draft'));
  app.editor.save();
  const oldRequest = app.request;
  [...app.timers.values()][0]();
  assert.equal(app.view.phase, 'error');
  app.editor.save();
  await app.editor.receive({ event: 'export', xml: source('stale'), data: svg, message: oldRequest });
  assert.equal(app.writes.length, 0);
  await app.export(source('draft'));
  assert.equal(app.writes[0].xml, source('draft'));
  assert.equal(app.closed, 0);
});

test('full multi-page XML is preserved and both forms of export echo are accepted', async () => {
  const app = setup();
  const xml = '<mxfile><diagram id="a">one</diagram><diagram id="b">two</diagram></mxfile>';
  app.editor.save();
  await app.editor.receive({ event: 'export', xml, data: svg, message: JSON.stringify(app.request) });
  assert.equal(app.writes[0].xml, xml);
  assert.equal(app.editor.xml, xml);
});

test('unmount cancels export timers and ignores an in-flight server response', async () => {
  let resolve;
  const app = setup((payload) => new Promise((done) => { resolve = () => done({ ...payload, revision: 2 }); }));
  app.editor.save();
  const saving = app.export(source('draft'));
  const viewCount = app.views.length;
  app.editor.dispose();
  resolve();
  await saving;
  assert.equal(app.views.length, viewCount);
  assert.equal(app.saved.length, 0);
  assert.equal(app.closed, 0);
  assert.equal(app.timers.size, 0);
});

test('undo back to the saved source does not create an empty version on close', async () => {
  const app = setup();
  await app.draft(source('changed'));
  await app.draft(source('original'));
  assert.equal(app.editor.unsaved, false);
  app.editor.close();
  await app.export(source('original'));
  assert.equal(app.writes.length, 0);
  assert.equal(app.closed, 1);
});

test('source comparison ignores only volatile envelope metadata, never diagram content', () => {
  assert.equal(diagramSourceKey('<mxfile modified="now" etag="random" host="local" agent="browser" version="1"><diagram>data</diagram></mxfile>'), source('data').replace(' id="page-1"', ''));
  assert.notEqual(diagramSourceKey(source('<cell modified="one"/>')), diagramSourceKey(source('<cell modified="two"/>')));
  assert.notEqual(diagramSourceKey(source('a')), diagramSourceKey(source('b')));
});

test('requesting close inspects the final drawing without persisting before confirmation', async () => {
  const app = setup(undefined, source('original'), true);
  app.editor.requestClose();
  await app.export(source('change before autosave notification'));
  assert.equal(app.requestedClose, 1);
  assert.equal(app.editor.dirty, true);
  assert.equal(app.closed, 0);
  assert.equal(app.writes.length, 0);
  app.editor.discard();
  assert.equal(app.editor.xml, source('original'));
  assert.equal(app.editor.unsaved, false);
});

test('confirmation can await saving; errors keep the editor dirty and retryable', async () => {
  let fail = true;
  const app = setup((data) => { if (fail) throw new Error('Offline'); return { ...data, revision: 2 }; }, source('original'), true);
  await app.draft(source('changed'));
  const first = app.editor.saveAndWait(); await app.export(source('changed'));
  assert.equal(await first, false);
  assert.equal(app.editor.dirty, true);
  fail = false;
  const second = app.editor.saveAndWait(); await app.export(source('changed'));
  assert.equal(await second, true);
  assert.equal(app.editor.dirty, false);
  assert.equal(app.closed, 0);
});
