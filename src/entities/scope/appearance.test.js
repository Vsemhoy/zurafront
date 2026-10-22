import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultHeaderTheme, headerThemeBackground, headerThemePresets, normalizeHeaderTheme } from './appearance.js';

test('legacy scopes keep a neutral translucent header without sharing mutable defaults', () => {
  assert.deepEqual(normalizeHeaderTheme(), defaultHeaderTheme);
  assert.deepEqual(normalizeHeaderTheme(null), defaultHeaderTheme);
  const theme = normalizeHeaderTheme(); theme.start_color = '#123456';
  assert.equal(defaultHeaderTheme.start_color, '#ffffff');
});
test('custom colors, per-stop opacity and direction round-trip including full transparency', () => {
  const theme = normalizeHeaderTheme({ mode: 'gradient', start_color: '#AABBCC', end_color: '#123456', start_opacity: 0, end_opacity: 100, angle: 360 });
  assert.equal(theme.start_color, '#aabbcc');
  assert.equal(headerThemeBackground(theme), 'linear-gradient(360deg, rgba(170, 187, 204, 0) 0%, rgba(18, 52, 86, 1) 100%)');
});
test('solid uses identical stops without destroying the second gradient color', () => {
  const theme = { ...defaultHeaderTheme, start_color: '#ff0000', end_color: '#0000ff', start_opacity: 50 };
  assert.equal(headerThemeBackground(theme), 'linear-gradient(110deg, rgba(255, 0, 0, 0.5) 0%, rgba(255, 0, 0, 0.5) 100%)');
  assert.match(headerThemeBackground({ ...theme, mode: 'gradient' }), /rgba\(0, 0, 255, 0.88\)/);
  assert.equal(theme.end_color, '#0000ff');
});
test('stored data never becomes arbitrary CSS or external resource requests', () => {
  const theme = normalizeHeaderTheme({ mode: 'url(evil)', start_color: 'url(https://evil.test)', end_color: '#fff; color:red', angle: '0);url(evil)', start_opacity: NaN, end_opacity: Infinity });
  assert.deepEqual(theme, defaultHeaderTheme);
  assert.doesNotMatch(headerThemeBackground(theme), /url|NaN|Infinity/);
  assert.deepEqual(normalizeHeaderTheme({ start_opacity: -10, end_opacity: 999, angle: 361 }), { ...defaultHeaderTheme, start_opacity: 0, end_opacity: 100, angle: 360 });
});
test('presets use the same validated format as custom settings', () => {
  for (const preset of headerThemePresets) assert.deepEqual(normalizeHeaderTheme(preset.theme), preset.theme);
});
