import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageScopeModules, moduleEnabled, moduleForPath, scopeModuleSettings, toggleModule, visibleModuleOrder } from './modules.js';

test('disabling Tasker disables its dependents without disabling Projector or Equip', () => {
  const settings = toggleModule(scopeModuleSettings({}), 'tasker', false);
  for (const id of ['tasker', 'calendar', 'planner', 'kpi', 'reporter']) assert.equal(settings.enabled[id], false);
  assert.equal(settings.enabled.projector, true);
  assert.equal(settings.enabled.equip, true);
  assert.equal(toggleModule(settings, 'calendar', true).enabled.calendar, false);
  const restored = toggleModule(settings, 'tasker', true);
  assert.equal(restored.enabled.calendar, false);
  assert.equal(toggleModule(restored, 'calendar', true).enabled.calendar, true);
});
test('required modules cannot be disabled and stale dependency settings are normalized', () => {
  const scope = { settings: { modules: { enabled: { tasker: false, calendar: true, projector: false } } } };
  assert.equal(moduleEnabled(scope, 'calendar'), false);
  assert.equal(moduleEnabled(scope, 'projector'), true);
  assert.equal(toggleModule(scopeModuleSettings(scope), 'projector', false).enabled.projector, true);
});
test('scope-specific order excludes unknown and duplicate ids; service items stay anchored', () => {
  const scope = { modules: { order: ['equip', 'equip', 'unknown', 'lore'], enabled: { tasker: false } } };
  const order = visibleModuleOrder(scope);
  assert.deepEqual(order.slice(0, 3), ['home', 'equip', 'lore']);
  assert.deepEqual(order.slice(-2), ['contractors', 'departments']);
  assert.ok(!order.includes('calendar'));
  assert.ok(!order.includes('unknown'));
  assert.equal(visibleModuleOrder({})[1], 'tasker');
});
test('deep links are guarded by exact module path; attachments stay available', () => {
  assert.equal(moduleForPath('/tasks/123/edit'), 'tasker');
  assert.equal(moduleForPath('/planner'), 'calendar');
  assert.equal(moduleForPath('/plans'), 'planner');
  assert.equal(moduleForPath('/content/diagrams/scope/123'), 'content');
  assert.equal(moduleForPath('/content/files'), null);
  assert.equal(moduleForPath('/tasksmith'), null);
});
test('only a real owner, without impersonation, can manage modules', () => {
  assert.equal(canManageScopeModules({owner_id:'owner'}, {id:'owner'}), true);
  assert.equal(canManageScopeModules({owner_id:'owner', can_manage_modules:true}, {id:'admin'}), false);
  assert.equal(canManageScopeModules({owner_id:'owner'}, {id:'owner', acting_as:{id:'member'}}), false);
  assert.equal(canManageScopeModules({owner_id:'owner'}, {id:'owner', type:'agent'}), false);
});
test('Exploiter depends on Equip without introducing a second equipment module', () => {
  const scope = { modules: { enabled: { equip: false, exploiter: true } } };
  assert.equal(moduleEnabled(scope, 'exploiter'), false);
  assert.equal(moduleForPath('/exploiter'), 'exploiter');
});

test('Ledger remains standalone when equipment modules are disabled', () => {
  const scope = { modules: { enabled: { equip: false, exploiter: false, ledger: true } } };
  assert.equal(moduleEnabled(scope, 'ledger'), true);
  assert.equal(moduleForPath('/ledger/scope/transaction'), 'ledger');
  assert.equal(moduleEnabled({ modules: { enabled: { ledger: false } } }, 'ledger'), false);
});
