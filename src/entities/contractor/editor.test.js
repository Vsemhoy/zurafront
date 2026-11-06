import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abilityLabels, groupContractorAbilities, permissionsForRole, contractorDraft, contractorProfileChanges, contractorAccessKey, saveContractorDraft, setContractorAbility } from './editor.js';
import { createSaveFormState } from '../../shared/ui/saveFormState.js';

function person(overrides = {}) {
  return { id: 'one', name: 'Тестовый коллега', type: 'virtual', preferred_language: 'ru', status: 'active', position: null, email: null, username: null,
    role: 'observer', project_access_mode: 'restricted', book_access_mode: 'none', projects: [{ id: 'project-one' }], permissions: { allow: ['ledger.view'], deny: ['fact.view'] }, can_act_as: false, ...overrides };
}

test('module groups cover every capability, deduplicate entries, and retain unknown modules', () => {
  const abilities = [...Object.keys(abilityLabels), 'future.inspect', 'task.view'];
  const groups = groupContractorAbilities(abilities);
  assert.deepEqual(new Set(groups.flatMap((group) => group.abilities)), new Set(abilities));
  assert.deepEqual(groups.find((group) => group.id === 'ledger').abilities, ['ledger.view', 'ledger.write', 'ledger.manage']);
  assert.deepEqual(groups.find((group) => group.id === 'future').abilities, ['future.inspect']);
  assert.equal(groups.find((group) => group.id === 'task').abilities.filter((ability) => ability === 'task.view').length, 1);
});

test('permission search accepts module names, Russian actions and exact codes without inventing access', () => {
  const abilities = Object.keys(abilityLabels);
  assert.deepEqual(groupContractorAbilities(abilities, ' LEDGER ').map((group) => group.id), ['ledger']);
  assert.deepEqual(groupContractorAbilities(abilities, 'чувствительные').flatMap((group) => group.abilities), ['fact.reveal']);
  assert.deepEqual(groupContractorAbilities(['ledger.view'], 'ledger.write'), []);
});

test('opening a draft preserves role presets, explicit exceptions, projects and denies without mutation', () => {
  const source = person();
  const before = structuredClone(source);
  const draft = contractorDraft(source);
  assert.equal(draft.position, '');
  assert.deepEqual(draft.project_ids, ['project-one']);
  assert(draft.permissions.allow.includes('task.view'));
  assert(draft.permissions.allow.includes('ledger.view'));
  assert(!draft.permissions.allow.includes('fact.view'));
  assert.deepEqual(draft.permissions.deny, ['fact.view']);
  assert.deepEqual(source, before);
});

test('role presets are isolated copies; applying one is an explicit replacement', () => {
  const first = permissionsForRole('member');
  first.allow.push('unrelated');
  assert(!permissionsForRole('member').allow.includes('unrelated'));
  assert(!permissionsForRole('observer').allow.includes('ledger.write'));
});

test('editing a wildcard prohibition changes only the chosen ability, leaving all other capabilities prohibited', () => {
  const source = { allow: ['task.view'], deny: ['*'] };
  const result = setContractorAbility(source, 'ledger.view', 'allow', ['task.view', 'ledger.view', 'ledger.write']);
  assert.deepEqual(new Set(result.deny), new Set(['task.view', 'ledger.write']));
  assert(result.allow.includes('ledger.view'));
  assert.deepEqual(source.deny, ['*']);
  const inherited = setContractorAbility(result, 'ledger.view', 'inherit', ['task.view', 'ledger.view', 'ledger.write']);
  assert(!inherited.allow.includes('ledger.view'));
  assert(!inherited.deny.includes('ledger.view'));
});

test('profile patches contain only changed fields, normalize clearing, and never include access or tokens', () => {
  const baseline = contractorDraft(person({ position: 'Старая должность' }));
  const draft = { ...baseline, name: 'Новое имя', position: '', preferred_language: 'en', permissions: { allow: ['ledger.manage'], deny: [] }, plainToken: 'never-save' };
  assert.deepEqual(contractorProfileChanges(draft, baseline), { name: 'Новое имя', position: null, preferred_language: 'en' });
});

test('access comparison ignores project and ability ordering but notices actual prohibitions', () => {
  const baseline = contractorDraft(person({ projects: [{ id: 'b' }, { id: 'a' }] }));
  const reordered = { ...baseline, project_ids: [...baseline.project_ids].reverse(), permissions: { ...baseline.permissions, allow: [...baseline.permissions.allow].reverse() } };
  assert.equal(contractorAccessKey(reordered), contractorAccessKey(baseline));
  assert.notEqual(contractorAccessKey({ ...baseline, permissions: { ...baseline.permissions, deny: ['ledger.view'] } }), contractorAccessKey(baseline));
});

test('profile-only save never calls the ACL endpoint; a no-op never sends either request', async () => {
  const source = person();
  const baseline = contractorDraft(source);
  const calls = [];
  const api = { update: async (...args) => { calls.push(args); return { ...source, ...args[2] }; }, updateAccess: () => { assert.fail('Profile save must not rewrite permissions'); } };
  await saveContractorDraft(api, 'scope', 'one', baseline, baseline);
  assert.equal(calls.length, 0);
  const result = await saveContractorDraft(api, 'scope', 'one', { ...baseline, name: 'Новое имя' }, baseline);
  assert.deepEqual(calls, [['scope', 'one', { name: 'Новое имя' }]]);
  assert.equal(result.name, 'Новое имя');
  assert.deepEqual(result.permissions, baseline.permissions);
});

test('access-only save keeps explicit projects and denies, honors server normalization and skips profile', async () => {
  const source = person();
  const baseline = contractorDraft(source);
  let payload;
  const api = { update: () => { assert.fail('ACL edit must not rewrite profile'); }, updateAccess: async (scope, id, data) => { assert.equal(scope, 'scope'); assert.equal(id, 'one'); payload = data; return { ...source, ...data, book_access_mode: 'projects' }; } };
  const result = await saveContractorDraft(api, 'scope', 'one', { ...baseline, book_access_mode: 'projects' }, baseline);
  assert(payload.permissions.allow.includes('book.view'));
  assert.deepEqual(payload.permissions.deny, ['fact.view']);
  assert.deepEqual(payload.project_ids, ['project-one']);
  assert(!('name' in payload));
  assert.equal(result.book_access_mode, 'projects');
});

test('failed access save keeps the whole draft dirty and retryable, including edits on other tabs', async () => {
  const source = person();
  const initial = contractorDraft(source);
  let fail = true;
  const api = { update: async (scope, id, data) => Object.assign(source, data), updateAccess: async (scope, id, data) => { if (fail) throw new Error('Access unavailable'); return Object.assign(source, data); } };
  const session = createSaveFormState({ initial, persist: (draft, baseline) => saveContractorDraft(api, 'scope', 'one', draft, baseline) });
  session.change((draft) => ({ ...draft, name: 'Новое имя', book_access_mode: 'projects' }));
  assert.equal(await session.save(), false);
  assert.equal(session.getSnapshot().dirty, true);
  assert.match(session.getSnapshot().error, /Профиль сохранён, но доступы не сохранены/);
  assert.equal(session.getSnapshot().draft.name, 'Новое имя');
  assert.equal(session.getSnapshot().draft.book_access_mode, 'projects');
  fail = false;
  assert.equal(await session.save(), true);
  assert.equal(session.getSnapshot().dirty, false);
  assert.equal(session.getSnapshot().phase, 'saved');
});
