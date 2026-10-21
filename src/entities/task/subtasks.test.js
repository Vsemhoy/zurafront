import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subtaskPayload } from './subtasks.js';

test('derived tasks inherit the immediate parent project, department and executor', () => {
  const parent = {
    id: 'parent', parent_id: 'grandparent', project_id: 'project',
    department_id: 'department', assignee_id: 'executor',
    description: 'Do not copy parent content', status: 'in_progress',
  };

  assert.deepEqual(subtaskPayload(parent, '  Follow-up  '), {
    title: 'Follow-up', parent_id: 'parent', project_id: 'project',
    department_id: 'department', assignee_id: 'executor',
  });
});

test('unassigned and unprojected parents keep empty routing fields', () => {
  assert.deepEqual(subtaskPayload({ id: 'parent' }, 'Child'), {
    title: 'Child', parent_id: 'parent', project_id: null,
    department_id: null, assignee_id: null,
  });
});

test('derived task defaults also work with loaded relation objects', () => {
  assert.deepEqual(subtaskPayload({
    id: 'parent', project: { id: 'project' },
    department: { id: 'department' }, assignee: { id: 'executor' },
  }, 'Child'), {
    title: 'Child', parent_id: 'parent', project_id: 'project',
    department_id: 'department', assignee_id: 'executor',
  });
});
