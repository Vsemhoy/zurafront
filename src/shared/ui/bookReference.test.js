import test from 'node:test';
import assert from 'node:assert/strict';
import { findReferenceFile } from './bookReferenceData.js';

test('finds accessible file beyond the first page without loading later pages', async () => {
    const calls = [];
    const file = await findReferenceFile('wanted', async (page) => {
        calls.push(page);
        return { data: [{ id: page === 2 ? 'wanted' : 'other' }], meta: { has_more: true } };
    });
    assert.equal(file.id, 'wanted');
    assert.deepEqual(calls, [1, 2]);
});

test('does not fall back to stored metadata when file is inaccessible', async () => {
    await assert.rejects(findReferenceFile('hidden', async () => ({ data: [], meta: { has_more: false } })), /недоступен/);
});

test('stops on access errors instead of skipping to another page', async () => {
    let calls = 0;
    await assert.rejects(findReferenceFile('hidden', async () => { calls++; throw new Error('Forbidden'); }), /Forbidden/);
    assert.equal(calls, 1);
});
