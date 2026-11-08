export const itemKinds = { section: 'Раздел', requirement: 'Требование', note: 'Заметка' };
export const agreementStates = { draft: 'Черновик', agreed: 'Согласовано' };
export const implementationStates = { todo: 'Не начато', in_progress: 'В работе', blocked: 'Заблокировано', implemented: 'Реализовано' };
export const acceptanceStates = { unchecked: 'Не проверено', review: 'На проверке', accepted: 'Принято', changes_requested: 'Нужны исправления' };
const compare = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id);

export function specificationOutline(items = [], placement = []) {
  const rank = new Map(placement.map((id, index) => [id, index]));
  const ids = new Set(items.map((item) => item.id));
  const children = new Map();
  for (const item of items) {
    const parent = ids.has(item.parent_id) ? item.parent_id : null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(item);
  }
  for (const rows of children.values()) rows.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) || compare(a, b));
  const result = [], seen = new Set();
  const stack = (children.get(null) ?? []).map((item, index) => ({ item, path: `${index + 1}`, depth: 0 })).reverse();
  while (stack.length) {
    const row = stack.pop();
    if (seen.has(row.item.id)) continue;
    seen.add(row.item.id);
    result.push({ ...row.item, outline: row.path, depth: row.depth });
    const nested = children.get(row.item.id) ?? [];
    for (let index = nested.length - 1; index >= 0; index--) stack.push({ item: nested[index], path: `${row.path}.${index + 1}`, depth: row.depth + 1 });
  }
  for (const item of items) if (!seen.has(item.id)) result.push({ ...item, outline: '—', depth: 0 });
  return result;
}

export function itemDescendants(items, id) {
  const ids = new Set([id]);
  let count;
  do { count = ids.size; for (const item of items) if (ids.has(item.parent_id)) ids.add(item.id); } while (count !== ids.size);
  return ids;
}

export function specificationLevel(outline, itemId = null) {
  const byId = new Map(outline.map((item) => [item.id, item]));
  const point = itemId === null ? null : byId.get(itemId) ?? null;
  const ancestors = [], seen = new Set(point ? [point.id] : []);
  let parent = point?.parent_id;
  while (byId.has(parent) && !seen.has(parent)) {
    const item = byId.get(parent);
    ancestors.push(item);
    seen.add(item.id);
    parent = item.parent_id;
  }
  const children = point
    ? outline.filter((item) => item.parent_id === point.id && !seen.has(item.id))
    : outline.filter((item) => !byId.has(item.parent_id));
  return { point, ancestors: ancestors.reverse(), children, missing: itemId !== null && !point };
}

export function moveSpecificationItem(items, id, offset) {
  const item = items.find((row) => row.id === id);
  if (!item) return null;
  const siblings = items.filter((row) => row.parent_id === item.parent_id).sort(compare);
  const index = siblings.findIndex((row) => row.id === id), target = index + offset;
  if (target < 0 || target >= siblings.length) return null;
  [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
  const orders = new Map(siblings.map((row, position) => [row.id, (position + 1) * 1000]));
  return items.map((row) => ({ id: row.id, parent_id: row.parent_id, sort_order: orders.get(row.id) ?? row.sort_order }));
}

export function changedSpecificationFields(draft, baseline) {
  return Object.fromEntries(Object.keys(draft).filter((key) => key !== 'revision' && JSON.stringify(draft[key]) !== JSON.stringify(baseline[key])).map((key) => [key, draft[key]]));
}

export const specificationDraftKey = ({ revision: _revision, ...draft }) => JSON.stringify(draft);
export const specificationItemLink = (scope, document, item) => `/specifications/${scope}/${document}?item=${encodeURIComponent(item)}`;
