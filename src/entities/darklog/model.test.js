import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarWeeks, darklogHref, darklogIdentity, dayKey, isoInput, localInput, markersOnSegment, periodSegment } from './model.js';

test('record identity stays the same across title, status and severity changes', () => {
  const initial = { id: 'record', number: 42, code: 'DRK-42', title: 'Network', status: 'new', severity: 'high' };
  assert.deepEqual(darklogIdentity(initial), darklogIdentity({ ...initial, title: 'Renamed', status: 'closed', severity: 'low' }));
  assert.deepEqual(darklogIdentity(initial), darklogIdentity({ code: 'DRK-42' }));
});

test('consecutive records receive different identity colors and valid pastel tints', () => {
  const colors = Array.from({ length: 12 }, (_, index) => darklogIdentity({ number: index + 1 }));
  assert.equal(new Set(colors.map((color) => color.color)).size, 12);
  for (const color of colors) {
    assert.match(color.color, /^#[0-9a-f]{6}$/);
    assert.match(color.tint, /^#[0-9a-f]{6}$/);
  }
});

test('records without a number use a deterministic identity, not random colors', () => {
  assert.deepEqual(darklogIdentity({ id: 'record-a' }), darklogIdentity({ id: 'record-a', title: 'Renamed' }));
  assert.notDeepEqual(darklogIdentity({ id: 'record-a' }), darklogIdentity({ id: 'record-b' }));
  assert.ok(darklogIdentity({}));
});

test('month includes complete Monday-to-Sunday weeks, including leap day', () => {
  const weeks = calendarWeeks('2024-02');
  assert.equal(weeks[0][0], '2024-01-29');
  assert.equal(weeks.at(-1).at(-1), '2024-03-03');
  assert.ok(weeks.flat().includes('2024-02-29'));
  assert.ok(weeks.every((week) => week.length === 7));
  assert.equal(new Set(weeks.flat()).size, weeks.length * 7);
});

test('a month ending on Sunday does not add a redundant week', () => {
  assert.equal(calendarWeeks('2026-02').at(-1).at(-1), '2026-03-01');
  assert.equal(calendarWeeks('2026-05').at(-1).at(-1), '2026-05-31');
});

const week = calendarWeeks('2026-10')[1];
test('periods ending at midnight do not occupy the following date', () => {
  const part = periodSegment({ starts_at: '2026-10-05T09:00:00', ends_at: '2026-10-07T00:00:00' }, week);
  assert.equal(part.first, 0);
  assert.equal(part.last, 1);
});

test('an ongoing factual period stops at now, not at the forecast', () => {
  const part = periodSegment({ starts_at: '2026-10-05T09:00:00', ends_at: null }, week, new Date('2026-10-07T12:00:00').getTime());
  assert.equal(part.last, 2);
  assert.equal(part.open, true);
  assert.equal(periodSegment({ starts_at: '2026-10-05T09:00:00' }, calendarWeeks('2026-11')[1], new Date('2026-10-07T12:00:00').getTime()), null);
});

test('a long influence is clipped at week boundaries', () => {
  assert.deepEqual(periodSegment({ starts_at: '2026-09-01T00:00:00', ends_at: '2026-10-20T12:00:00' }, week), { first: 0, last: 6, continuesBefore: true, continuesAfter: true, open: false });
});

test('invalid, reversed, empty and not-yet-started intervals render nothing', () => {
  for (const period of [
    { starts_at: 'broken', ends_at: '2026-10-06T12:00:00' },
    { starts_at: '2026-10-05T12:00:00', ends_at: '2026-10-05T12:00:00' },
    { starts_at: '2026-10-07T12:00:00', ends_at: '2026-10-05T12:00:00' },
  ]) assert.equal(periodSegment(period, week), null);
  assert.equal(periodSegment({ starts_at: '2026-10-09T12:00:00' }, week, new Date('2026-10-07T12:00:00').getTime()), null);
});

test('markers keep their actual day and reject invalid or outside dates', () => {
  const markers = [{ id: 'task', at: '2026-10-06T12:00:00' }, { id: 'outside', at: '2026-10-10T12:00:00' }, { id: 'invalid', at: 'broken' }];
  assert.deepEqual(markersOnSegment(markers, week, { first: 0, last: 2 }), [{ ...markers[0], column: 1 }]);
});

test('source date controls round-trip instants and scope-specific permalinks', () => {
  const instant = new Date('2026-10-07T12:32:54Z');
  assert.equal(isoInput(localInput(instant)), instant.toISOString());
  assert.equal(dayKey(new Date('2026-10-07T12:00:00')), '2026-10-07');
  assert.equal(localInput('invalid'), '');
  assert.equal(isoInput(''), null);
  assert.equal(darklogHref('work', 'record'), '/darklog/work/record');
});
