import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdownDraft } from './markdownDraft.js';

test('opening, normalizing and blurring untouched content never saves', async () => {
  const draft = createMarkdownDraft('Original');
  draft.change('Original\n', true);
  await draft.save(() => assert.fail('Untouched text must not be submitted'));
});

test('child empty content cannot be saved into an untouched parent', async () => {
  const child = createMarkdownDraft(null);
  const parent = createMarkdownDraft('Parent description');
  await child.save(() => assert.fail('Empty child was not edited'));
  await parent.save(() => assert.fail('Parent was not edited'));
  assert.equal(parent.markdown, 'Parent description');
});

test('intentional deletion is saved, but repeated blur is not', async () => {
  const draft = createMarkdownDraft('Original');
  const sent = [];
  draft.change('');
  await draft.save(value => sent.push(value));
  await draft.save(() => assert.fail('Duplicate save'));
  assert.deepEqual(sent, [null]);
});

test('undoing edits back to the initial value does not save', async () => {
  const draft = createMarkdownDraft('Original');
  draft.change('Changed');
  draft.change('Original');
  await draft.save(() => assert.fail('No effective change'));
});

test('failed saves can be retried without losing the draft', async () => {
  const draft = createMarkdownDraft('Original');
  draft.change('Changed');
  await assert.rejects(draft.save(() => Promise.reject(new Error('Network'))), /Network/);
  let sent;
  await draft.save(value => { sent = value; });
  assert.equal(sent, 'Changed');
});

test('pending save cannot erase edits made while waiting', async () => {
  const draft = createMarkdownDraft('Original');
  let finish;
  draft.change('First edit');
  const saving = draft.save(() => new Promise(resolve => { finish = resolve; }));
  await draft.save(() => assert.fail('Duplicate pending save'));
  draft.change('Second edit');
  draft.change('Initial normalization', true);
  finish();
  await saving;
  let sent;
  await draft.save(value => { sent = value; });
  assert.equal(sent, 'Second edit');
  assert.equal(draft.markdown, 'Second edit');
});
