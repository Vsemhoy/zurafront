export const LEDGER_CATEGORY_LEVELS = 5;

export function ledgerCategoryOptions(categories) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const children = new Map();
  const roots = [];
  for (const category of [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.title.localeCompare(b.title, 'ru') || a.id.localeCompare(b.id))) {
    const parent = byId.get(category.parent_id);
    if (parent && parent.project_id === category.project_id && parent.id !== category.id) {
      if (!children.has(parent.id)) children.set(parent.id, []);
      children.get(parent.id).push(category);
    } else roots.push(category);
  }
  const result = [], visited = new Set();
  const visit = (category, ancestors) => {
    if (visited.has(category.id)) return;
    visited.add(category.id);
    const path = [...ancestors.map((item) => item.title), category.title].join(' / ');
    result.push({ ...category, depth: ancestors.length, path, ancestorIds: ancestors.map((item) => item.id), parentArchived: ancestors.some((item) => item.is_archived), hasChildren: Boolean(children.get(category.id)?.length) });
    for (const child of children.get(category.id) ?? []) visit(child, [...ancestors, category]);
  };
  roots.forEach((category) => visit(category, []));
  // Keep malformed or orphaned legacy rows visible instead of losing them from the editor.
  categories.forEach((category) => { if (!visited.has(category.id)) visit(category, []); });
  return result;
}

export function parseCategoryKeywords(text) {
  return [...new Set(String(text ?? '').split(/[,;\n]/u).map((word) => word.trim().replace(/\s+/gu, ' ')).filter(Boolean))];
}

function words(text) { return String(text ?? '').normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё', 'е').match(/[\p{L}\p{N}]+/gu) ?? []; }

export function suggestLedgerCategory(title, categories, currentId = '') {
  const tokens = ` ${words(title).join(' ')} `;
  let maximum = 0;
  let matches = [];
  for (const category of categories) {
    if (category.is_archived || category.parentArchived) continue;
    const keywords = [...new Set((category.keywords ?? []).map((keyword) => words(keyword).join(' ')).filter(Boolean))];
    const score = keywords.filter((keyword) => tokens.includes(` ${keyword} `)).length;
    if (score > maximum) { maximum = score; matches = [category]; }
    else if (score && score === maximum) matches.push(category);
  }
  if (!maximum) return null;
  return matches.length === 1 ? matches[0] : matches.find((category) => category.id === currentId) ?? null;
}
