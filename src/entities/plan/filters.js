export const planFiltersKey = (userId, scopeId) => `zuratax:plans-filters:${userId}:${scopeId}`;

export function defaultPlanFilters(year = new Date().getFullYear()) {
  return { year, month: '', department_id: '', assignee_id: '', project_id: '', status: '', q: '', page: 1 };
}

export function loadPlanFilters(key, year = new Date().getFullYear(), storage) {
  const defaults = defaultPlanFilters(year);
  try {
    const saved = JSON.parse((storage ?? globalThis.localStorage).getItem(key) ?? '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults;
    const savedYear = Number(saved.year);
    const result = { ...defaults, year: Number.isInteger(savedYear) && savedYear >= 2000 && savedYear <= 2099 ? savedYear : year };
    for (const field of ['department_id', 'assignee_id', 'project_id']) {
      if (typeof saved[field] === 'string' && /^[0-9A-HJKMNP-TV-Z]{26}$/i.test(saved[field])) result[field] = saved[field];
    }
    if (typeof saved.month === 'string' && /^20\d{2}-(0[1-9]|1[0-2])$/.test(saved.month) && saved.month.startsWith(`${result.year}-`)) result.month = saved.month;
    if (['open', 'done'].includes(saved.status)) result.status = saved.status;
    if (typeof saved.q === 'string') result.q = saved.q.slice(0, 150);
    return result;
  } catch {
    return defaults;
  }
}

export function savePlanFilters(key, filters, storage) {
  try {
    const { year, month, department_id, assignee_id, project_id, status, q } = filters;
    (storage ?? globalThis.localStorage).setItem(key, JSON.stringify({ year, month, department_id, assignee_id, project_id, status, q }));
  } catch {
    // Filters remain usable when browser storage is unavailable or full.
  }
}
