import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('./LightbookPage.jsx', import.meta.url), 'utf8');
const library = readFileSync(new URL('./LightbookLibrary.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./LightbookPage.css', import.meta.url), 'utf8');

test('Lightbook sidebar contains section navigation, never document cards or library filters', () => {
  const sidebar = page.match(/<aside className="lightbook-list">([\s\S]*?)<\/aside>/)?.[1];
  assert(sidebar);
  assert.match(sidebar, /<ContentStructureNav/);
  assert.doesNotMatch(sidebar, /lightbook-documents|LightbookLibrary|list\.data|lightbook-filters/);
});

test('the index renders the library in the main content column and does not reserve an empty structure column', () => {
  assert.match(page, /<section className="booker-content lightbook-content">\s*\{!lightbookId \? <LightbookLibrary/);
  assert.match(page, /!lightbookId \? 'lightbook-page--library'/);
  assert.match(styles, /\.lightbook-page--library\{grid-template-columns:240px minmax\(0,1fr\)\}/);
  assert.doesNotMatch(page, /<aside className="booker-structure"\s*\/>|lightbook-welcome/);
});

test('selecting a section while reading returns to the library; the reader keeps an explicit way back', () => {
  assert.match(page, /const selectSection = \(section_id\) => \{\s*setFilters\([\s\S]*?section_id[\s\S]*?if \(lightbookId\) navigate\('\/content\/lightbooks'\)/);
  assert.match(page, /<Link to="\/content\/lightbooks"><IconArrowLeft[^>]*\/>К документам<\/Link>/);
  assert.match(page, /onChange=\{selectSection\}/);
});

test('library cards expose titles and descriptions, use actual document links and distinguish loading/error/empty states', () => {
  assert.match(library, /className="lightbook-document-card" to=\{`\/content\/lightbooks\/\$\{entry\.id\}`\}/);
  assert.match(library, /<h2>\{entry\.title\}<\/h2>/);
  assert.match(library, /entry\.description && <p>\{entry\.description\}<\/p>/);
  assert.match(library, /list\.isPending && <p[^>]*role="status"/);
  assert.match(library, /list\.error && <p[^>]*role="alert"/);
  assert.match(library, /!list\.isPending && !list\.error && !list\.data\?\.length/);
  assert.doesNotMatch(styles.match(/\.lightbook-document-heading h2\{([^}]+)\}/)?.[1] ?? '', /nowrap|ellipsis|line-clamp/);
});
