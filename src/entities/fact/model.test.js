import test from 'node:test';
import assert from 'node:assert/strict';
import { factExpired, factRenderMode, groupedText, qrAllowed, recordForm, recordPayload } from './model.js';

test('new records default private; legacy explicit visibility survives normalization', () => {
  assert.equal(recordForm('fact').visibility, 'private');
  assert.equal(recordForm('contact').visibility, 'private');
  assert.equal(recordForm('fact', { visibility: 'scope' }).visibility, 'scope');
});
test('sensitive metadata edits never submit masked placeholder as the value', () => {
  const initial = recordForm('fact', { id: 'f', revision: 3, is_sensitive: true, value: 'unexpected-leak', label: 'A' });
  assert.equal(initial.value, null);
  assert.deepEqual(recordPayload('fact', { ...initial, label: 'B' }, initial), { label: 'B', revision: 3 });
  assert.deepEqual(recordPayload('fact', { ...initial, value: 'revealed' }, initial), { value: 'revealed', revision: 3 });
});
test('payload whitelists fields and preserves partial changes and revision', () => {
  const initial = recordForm('contact', { id: 'c', revision: 2, name: 'A', note_md: 'keep' });
  assert.deepEqual(recordPayload('contact', { ...initial, phone: '123', created_by: 'bad', can_write: true }, initial), { phone: '123', revision: 2 });
});
test('QR rejects unrevealed, empty and oversized values using UTF-8 bytes', () => {
  assert.equal(qrAllowed(null), false);
  assert.equal(qrAllowed(''), false);
  assert.equal(qrAllowed('я'.repeat(600)), true);
  assert.equal(qrAllowed('я'.repeat(601)), false);
});
test('viewer respects saved mode and detects actual expiry rather than mere presence of a date', () => {
  assert.equal(factRenderMode({ format: 'markdown' }), 'article');
  assert.equal(factRenderMode({ format: 'code', display_mode: 'large' }), 'large');
  assert.equal(factExpired({ valid_to: '2026-12-01' }, '2026-10-24'), false);
  assert.equal(factExpired({ valid_to: '2026-10-24' }, '2026-10-24'), false);
  assert.equal(factExpired({ valid_to: '2026-10-23' }, '2026-10-24'), true);
  assert.equal(groupedText('1234567', 3), '123\n456\n7');
});
