import { test } from 'node:test';
import assert from 'node:assert/strict';
import { departmentIconMaxBytes, departmentIconSource, departmentLabel, departmentShortLabel, normalizeDepartmentCode } from './model.js';

test('department codes normalize Latin and Cyrillic without inventing legacy codes', () => {
  assert.equal(normalizeDepartmentCode(' adm '), 'ADM');
  assert.equal(normalizeDepartmentCode(' итд '), 'ИТД');
  assert.equal(normalizeDepartmentCode('000'), '000');
  assert.equal(normalizeDepartmentCode(null), '');
});

test('department selectors include codes while legacy names remain readable', () => {
  assert.equal(departmentLabel({ name: 'Design', code: 'CAD' }), 'CAD · Design');
  assert.equal(departmentLabel({ name: 'Design' }), 'Design');
});

test('compact equipment labels prefer department codes and keep a legacy fallback', () => {
  assert.equal(departmentShortLabel({ name: 'Engineering department', code: 'ENG' }), 'ENG');
  assert.equal(departmentShortLabel({ name: 'Legacy department' }), 'Legacy department');
  assert.equal(departmentShortLabel(null), 'Без отдела');
});

test('SVG previews use encoded image sources and enforce the UTF-8 byte limit', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>ИТД 中文</text></svg>';
  assert.equal(decodeURIComponent(departmentIconSource(svg).split(',')[1]), svg);
  assert.equal(departmentIconSource(null), null);
  assert.equal(departmentIconSource(' '), null);
  assert.equal(departmentIconSource('x'.repeat(departmentIconMaxBytes + 1)), null);
  assert.equal(departmentIconSource('я'.repeat(departmentIconMaxBytes)), null);
});
