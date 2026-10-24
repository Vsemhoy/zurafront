export const moduleCatalog = {
  home: { label: 'Главная', path: '/', required: true },
  tasker: { label: 'Tasker', path: '/tasks' },
  planner: { label: 'Planner', path: '/plans', requires: ['tasker'] },
  calendar: { label: 'Календарь', path: '/planner', requires: ['tasker'] },
  projector: { label: 'Projector', path: '/projects', required: true },
  kpi: { label: 'KPI', path: '/kpi', requires: ['tasker'] },
  reporter: { label: 'Reporter', path: '/reports', requires: ['tasker'] },
  eventor: { label: 'Eventor', path: '/events' },
  factor: { label: 'Factor', path: '/factor' },
  darklog: { label: 'Darklog', path: '/darklog' },
  lore: { label: 'Lore', path: '/lore' },
  booker: { label: 'Booker', path: '/books' },
  content: { label: 'Контент · схемы и Lightbook', path: '/content' },
  equip: { label: 'Equip · Экипа', path: '/equip' },
  ledger: { label: 'Ledger · Финансы', path: '/ledger' },
  exploiter: { label: 'Exploiter · Эксплуатация', path: '/exploiter', requires: ['equip'] },
  contractors: { label: 'Пользователи', path: '/contractors', required: true },
  departments: { label: 'Отделы', path: '/departments', required: true },
};
export const sortableModules = Object.keys(moduleCatalog).filter((id) => !['home', 'contractors', 'departments'].includes(id));
export function moduleEnabled(scope, id) {
  const definition = moduleCatalog[id];
  if (!definition) return false;
  if (definition.required) return true;
  const enabled = scope?.modules?.enabled ?? scope?.settings?.modules?.enabled ?? {};
  return enabled[id] !== false && (definition.requires ?? []).every((dependency) => moduleEnabled(scope, dependency));
}
export function scopeModuleSettings(scope) {
  const saved = scope?.modules?.order ?? scope?.settings?.modules?.order;
  return {
    enabled: Object.fromEntries(Object.keys(moduleCatalog).map((id) => [id, moduleEnabled(scope, id)])),
    order: [...new Set([...(Array.isArray(saved) ? saved.filter((id) => sortableModules.includes(id)) : []), ...sortableModules])],
  };
}
export function toggleModule(settings, id, enabled) {
  if (!moduleCatalog[id] || moduleCatalog[id].required) return settings;
  if (enabled && (moduleCatalog[id].requires ?? []).some((dependency) => !settings.enabled[dependency])) return settings;
  const next = { ...settings, enabled: { ...settings.enabled, [id]: enabled } };
  for (const [child, definition] of Object.entries(moduleCatalog)) {
    if ((definition.requires ?? []).some((parent) => !next.enabled[parent])) next.enabled[child] = false;
  }
  return next;
}
export function moduleForPath(path) {
  if (path === '/files' || path.startsWith('/content/files')) return null; // Shared attachments remain available.
  return Object.keys(moduleCatalog).find((id) => {
    const base = moduleCatalog[id].path;
    return path === base || (base !== '/' && path.startsWith(`${base}/`));
  }) ?? null;
}
export function visibleModuleOrder(scope) {
  return ['home', ...scopeModuleSettings(scope).order, 'contractors', 'departments'].filter((id) => moduleEnabled(scope, id));
}
export function canManageScopeModules(scope, user) {
  return Boolean(scope && user && !user.acting_as && user.type !== 'agent' && scope.owner_id === user.id && scope.can_manage_modules !== false);
}
