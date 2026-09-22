import test from 'node:test';
import assert from 'node:assert/strict';
import { filePreviewFormat } from './filePreviewFormat.js';

test('Office formats are converted even when their detected MIME is generic', () => {
    for (const extension of ['doc', 'docx', 'xls', 'xlsx', 'odt', 'ods', 'rtf']) assert.equal(filePreviewFormat({ name: `FILE.${extension.toUpperCase()}`, mime: 'application/octet-stream' }).kind, 'office');
});
test('Requested programming languages and markup are displayed as inert text', () => {
    for (const extension of ['js', 'php', 'cs', 'py', 'cpp', 'rust', 'rs', 'jsx', 'ts', 'tsx', 'html', 'xml', 'json', 'sh']) assert.equal(filePreviewFormat({ name: `file.${extension}`, mime: 'application/octet-stream' }).kind, 'text');
    assert.equal(filePreviewFormat({ name: 'README.md' }).kind, 'markdown');
});
test('Images and PDF have explicit rendering types; unknown binaries are not rendered', () => {
    for (const extension of ['png', 'jpg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico']) assert.equal(filePreviewFormat({ name: `image.${extension}` }).kind, 'image');
    assert.deepEqual(filePreviewFormat({ name: 'document.pdf' }), { kind: 'pdf', mime: 'application/pdf' });
    assert.equal(filePreviewFormat({ name: 'unknown.exe', mime: 'application/octet-stream' }).kind, 'unsupported');
});
