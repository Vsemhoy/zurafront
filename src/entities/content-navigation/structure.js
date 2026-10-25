export const structureFiltersKey = (userId, scopeId, module) => `zuratax:content-filters:${userId}:${scopeId}:${module}`;
export const defaultStructureFilters = () => ({ q: '', project_id: '', section_id: '', category_id: '', type_id: '', created_by: '', requester_id: '', importance: '' });
const isFilterId = (value) => value === '' || value === 'none' || /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(value);

export function loadStructureFilters(key, storage) {
  const defaults = defaultStructureFilters();
  try {
    const saved = JSON.parse((storage ?? globalThis.localStorage).getItem(key) || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults;
    for (const field of ['project_id', 'section_id', 'category_id', 'type_id', 'created_by', 'requester_id']) {
      if (typeof saved[field] === 'string' && isFilterId(saved[field]) && (['project_id', 'section_id', 'category_id'].includes(field) || saved[field] !== 'none')) defaults[field] = saved[field];
    }
    if (['', 'undefined', 'unimportant', 'read', 'important', 'critical', 'incident'].includes(saved.importance)) defaults.importance = saved.importance;
    if (typeof saved.q === 'string') defaults.q = saved.q.slice(0, 255);
  } catch { /* Browser storage is optional. */ }
  return defaults;
}

export function saveStructureFilters(key, filters, storage) {
  try { (storage ?? globalThis.localStorage).setItem(key, JSON.stringify(Object.fromEntries(Object.keys(defaultStructureFilters()).map((key) => [key, filters[key] || ''])))); } catch { /* Storage can be full or disabled. */ }
}

// "All" and "without project/section" are filters, never entity IDs in a create payload.
export function structureDefaults(filters = {}) {
  return Object.fromEntries(['project_id', 'section_id', 'category_id'].map((key) => [key, filters[key] && filters[key] !== 'none' ? filters[key] : '']));
}

export function sectionTree(sections = []) {
  const byId = new Map(sections.map((row) => [row.id, row]));
  const children = new Map();
  for (const row of sections) {
    const parent = byId.has(row.parent_id) ? row.parent_id : null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(row);
  }
  for (const siblings of children.values()) siblings.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const result = [];
  const seen = new Set();
  const visit = (row, depth, inheritedArchive) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    const archived = inheritedArchive || Boolean(row.is_archived);
    result.push({ ...row, depth, archived, hasChildren: Boolean(children.get(row.id)?.length) });
    for (const child of children.get(row.id) || []) visit(child, depth + 1, archived);
  };
  for (const row of children.get(null) || []) visit(row, 0, false);
  // Corrupt legacy cycles remain selectable for repair without hanging the interface.
  for (const row of sections) if (!seen.has(row.id)) visit(row, 0, false);
  return result;
}

export function sectionChoices(sections, currentId = '', excludeId = '') {
  const rows = sectionTree(sections);
  const excluded = new Set(excludeId ? [excludeId] : []);
  let length;
  do {
    length = excluded.size;
    for (const row of rows) if (excluded.has(row.parent_id)) excluded.add(row.id);
  } while (length !== excluded.size);
  return rows.filter((row) => !excluded.has(row.id) && (!row.archived || row.id === currentId))
    .map((row) => ({ ...row, label: `${'— '.repeat(row.depth)}${row.name}${row.archived ? ' (архив)' : ''}` }));
}

export function descendantsOf(sections, id) {
  const ids = new Set([id]);
  let count;
  do {
    count = ids.size;
    for (const row of sections) if (ids.has(row.parent_id)) ids.add(row.id);
  } while (count !== ids.size);
  return ids;
}
