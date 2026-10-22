import test from 'node:test';
import assert from 'node:assert/strict';
import { applyHeaderThemePreset, canManageScopeAppearance, defaultHeaderTheme, headerThemeBackground, headerThemePresets, headerThemeStartBackground, headerThemeStyle, normalizeHeaderTheme, scopeHeaderTheme } from './appearance.js';

test('header renders before scopes load and when the user has no scopes', () => {
  for (const scope of [null, undefined, {}]) {
    for (const preview of [null, undefined, {}, { scopeId: 'old', theme: headerThemePresets[1].theme }]) {
      assert.deepEqual(scopeHeaderTheme(scope, preview), defaultHeaderTheme);
      assert.doesNotThrow(() => headerThemeBackground(scopeHeaderTheme(scope, preview)));
    }
  }
});
test('header uses saved settings unless a preview belongs to the active scope', () => {
  const scope = { id: 'work', settings: { header_theme: headerThemePresets[2].theme } };
  assert.deepEqual(scopeHeaderTheme(scope, null), headerThemePresets[2].theme);
  assert.deepEqual(scopeHeaderTheme(scope, { scopeId: 'personal', theme: headerThemePresets[1].theme }), headerThemePresets[2].theme);
  assert.deepEqual(scopeHeaderTheme(scope, { scopeId: 'work', theme: headerThemePresets[1].theme }), headerThemePresets[1].theme);
  assert.deepEqual(scopeHeaderTheme({ id: 'work', settings: null }, null), defaultHeaderTheme);
  assert.deepEqual(scopeHeaderTheme(scope, { scopeId: 'work', theme: null }), defaultHeaderTheme);
});

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
  assert.equal(headerThemePresets.length, 9);
  assert.equal(new Set(headerThemePresets.map((preset) => headerThemeBackground(preset.theme))).size, 9);
  for (const preset of headerThemePresets) assert.deepEqual(normalizeHeaderTheme(preset.theme), preset.theme);
});

test('header blur defaults to 16 for legacy themes and safely supports 0–40 pixels', () => {
  const legacy = { mode: 'gradient', start_color: '#aabbcc' };
  assert.equal(headerThemeStyle(legacy)['--scope-header-blur'], '16px');
  assert.equal(headerThemeStyle({ ...legacy, blur_px: 0 })['--scope-header-blur'], '0px');
  assert.equal(headerThemeStyle({ blur_px: 40 })['--scope-header-blur'], '40px');
  assert.equal(normalizeHeaderTheme({ blur_px: 22.6 }).blur_px, 23);
  assert.equal(normalizeHeaderTheme({ blur_px: -1 }).blur_px, 0);
  assert.equal(normalizeHeaderTheme({ blur_px: 1000 }).blur_px, 40);
  for (const blur of [null, '', '20px;url(evil)', NaN, Infinity]) {
    assert.equal(headerThemeStyle({ blur_px: blur })['--scope-header-blur'], '16px');
  }
  assert.equal(headerThemeStyle(legacy).backgroundImage, headerThemeBackground(legacy));
});

test('palette presets preserve the separately configured blur', () => {
  const current = { ...defaultHeaderTheme, blur_px: 0 };
  const preset = headerThemePresets[5].theme;
  assert.deepEqual(applyHeaderThemePreset(current, preset), { ...preset, blur_px: 0 });
  assert.equal(preset.blur_px, 16);
  assert.equal(current.start_color, '#ffffff');
});

test('rail brand uses the first header stop including its opacity and safe defaults', () => {
  assert.equal(headerThemeStartBackground({ start_color: '#AABBCC', start_opacity: 65, end_color: '#112233' }), 'rgba(170, 187, 204, 0.65)');
  assert.equal(headerThemeStartBackground({ start_color: '#123456', start_opacity: 0 }), 'rgba(18, 52, 86, 0)');
  assert.equal(headerThemeStartBackground(null), 'rgba(255, 255, 255, 0.88)');
  assert.equal(headerThemeStartBackground({ start_color: 'url(evil)', start_opacity: 'evil' }), 'rgba(255, 255, 255, 0.88)');
});

test('scope appearance controls are available only to owners and appearance admins', () => {
  assert.equal(canManageScopeAppearance(null, 'owner'), false);
  assert.equal(canManageScopeAppearance({}, undefined), false);
  assert.equal(canManageScopeAppearance({ owner_id: 'owner' }, 'owner'), true);
  assert.equal(canManageScopeAppearance({ owner_id: 'owner' }, 'member'), false);
  assert.equal(canManageScopeAppearance({ owner_id: 'owner', can_manage_appearance: true }, 'admin'), true);
  assert.equal(canManageScopeAppearance({ can_manage_appearance: false }, 'member'), false);
});
