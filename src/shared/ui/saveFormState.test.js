import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveFormState } from './saveFormState.js';
import { diagramSettings, diagramSettingsKey } from '../../entities/diagram/settings.js';

function setup(persist = async (data) => ({ ...data, revision: 2 })) {
  const writes = [], saved = [];
  const form = createSaveFormState({ initial: diagramSettings({ title: 'Original', revision: 1 }), key: diagramSettingsKey, persist: (data, baseline) => { writes.push({ data, baseline }); return persist(data, baseline); }, onSaved: (result) => saved.push(result) });
  return { form, writes, saved, change: (title) => form.change((value) => ({ ...value, title })), get view() { return form.getSnapshot(); } };
}

test('opening, focus and reverting values do not mark metadata dirty or create versions', async () => {
  const app = setup();
  assert.equal(app.view.dirty, false);
  assert.equal(await app.form.save(), true);
  app.change('New'); assert.equal(app.view.dirty, true);
  app.change('Original'); assert.equal(app.view.dirty, false);
  app.form.change((value) => ({ ...value, project_id: '' }));
  assert.equal(app.view.dirty, false);
  assert.equal(app.writes.length, 0);
});

test('success appears only after acknowledgement; repeated clicks never overlap', async () => {
  let resolve;
  const app = setup((data) => new Promise((done) => { resolve = () => done({ ...data, revision: 2 }); }));
  app.change('Changed');
  const pending = app.form.save();
  assert.equal(app.view.phase, 'saving');
  assert.equal(app.view.busy, true);
  assert.equal(await app.form.save(), false);
  assert.equal(app.saved.length, 0);
  resolve(); assert.equal(await pending, true);
  assert.equal(app.view.phase, 'saved');
  assert.equal(app.view.dirty, false);
  assert.equal(app.view.savedCount, 1);
  assert.equal(app.writes.length, 1);
});

test('failed save preserves values and baseline for a safe explicit retry', async () => {
  let fail = true;
  const app = setup((data) => { if (fail) throw new Error('409: stale revision'); return { ...data, revision: 2 }; });
  app.change('My edits');
  assert.equal(await app.form.save(), false);
  assert.equal(app.view.draft.title, 'My edits');
  assert.equal(app.view.phase, 'error');
  assert.match(app.view.error, /409/);
  assert.equal(app.view.dirty, true);
  fail = false; assert.equal(await app.form.save(), true);
  assert.deepEqual(app.writes.map((write) => write.baseline.revision), [1, 1]);
});

test('new edits while saving survive; next request uses acknowledged revision', async () => {
  let resolve;
  const app = setup((data) => new Promise((done) => { resolve = () => done({ ...data, revision: 2 }); }));
  app.change('Submitted'); const pending = app.form.save();
  app.change('Later'); resolve();
  assert.equal(await pending, false);
  assert.equal(app.view.draft.title, 'Later');
  assert.equal(app.view.dirty, true);
  const next = app.form.save();
  assert.equal(app.writes[1].baseline.revision, 2);
  resolve(); assert.equal(await next, true);
});

test('background refetch never discards local edits or silently rebases a conflict', () => {
  const app = setup(); app.change('Local');
  app.form.receive(diagramSettings({ title: 'Remote', revision: 9 }));
  assert.equal(app.view.draft.title, 'Local');
  app.form.discard(); assert.equal(app.view.draft.title, 'Original');
  app.form.receive(diagramSettings({ title: 'Remote', revision: 9 }));
  assert.equal(app.view.draft.title, 'Remote');
  assert.equal(app.view.dirty, false);
});
