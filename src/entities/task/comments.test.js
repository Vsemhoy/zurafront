import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commentIndicator, rootComment, threadedComments } from './comments.js';

test('unanswered questions are red, other comments blue, empty tasks gray', () => {
  assert.equal(commentIndicator({}), 'empty');
  assert.equal(commentIndicator({ comments_count: 2, unanswered_questions_count: 0 }), 'comments');
  assert.equal(commentIndicator({ comments_count: 3, unanswered_questions_count: 1 }), 'question');
});

test('replies stay beside their question, not at the end of the discussion', () => {
  const comments = [{ id: 'a', parent_id: null }, { id: 'b', parent_id: null }, { id: 'c', parent_id: 'a' }];
  assert.deepEqual(threadedComments(comments).map((item) => item.id), ['a', 'c', 'b']);
});

test('replying to an old nested reply targets the root and keeps a single depth', () => {
  const root = { id: 'a', parent_id: null };
  const reply = { id: 'b', parent_id: 'a' };
  const nested = { id: 'c', parent_id: 'b' };
  assert.equal(rootComment(nested, [root, reply, nested]).id, 'a');
  assert.deepEqual(threadedComments([root, reply, nested]).map((item) => item.id), ['a', 'b', 'c']);
});
