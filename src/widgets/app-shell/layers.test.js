import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const styles = readFileSync(new URL('./AppShellLayers.css', import.meta.url), 'utf8');
const pageCss = (name) => readFileSync(new URL(`../../pages/${name}.css`, import.meta.url), 'utf8');
function rule(css, selector) {
  const matches = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((entry) => entry[1].trim().split(',').map((value) => value.trim()).includes(selector));
  assert.ok(matches.length, `Missing CSS rule: ${selector}`);
  return matches.map((match) => match[2]).join(';');
}
const layer = (css, selector) => Number([...rule(css, selector).matchAll(/z-index:\s*(\d+)/g)].at(-1)?.[1]);

test('shell chrome stays above content menus and below task and project drawer backdrops', () => {
  const backdrops = [layer(pageCss('TaskerPage'), '.inspector-backdrop'), layer(pageCss('TaskerPage'), '.task-comments-backdrop'), layer(pageCss('ProjectorPage'), '.projector-backdrop')];
  for (const selector of ['.app-shell > .status-bar', '.app-shell > .app-header', '.app-shell > .module-rail']) {
    const z = layer(styles, selector);
    assert.ok(z > 20, `${selector} must cover ordinary content menus`);
    for (const backdrop of backdrops) assert.ok(z < backdrop, `${selector} must stay behind the backdrop`);
  }
  assert.ok(layer(pageCss('TaskerPage'), '.task-inspector') > backdrops[0]);
  assert.ok(layer(pageCss('ProjectorPage'), '.projector-editor') > backdrops[2]);
});

test('darklog backdrop blurs the shell, not the drawer or the whole app', () => {
  assert.match(rule(styles, '.darklog-drawer-backdrop'), /backdrop-filter:\s*blur\(6px\)/);
  assert.doesNotMatch(rule(styles, '.app-shell > .app-header'), /\bfilter:/);
  assert.doesNotMatch(styles, /\.app-shell\s*\{/);
});
