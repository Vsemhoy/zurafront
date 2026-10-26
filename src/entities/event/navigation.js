import { defaultStructureFilters } from '../content-navigation/structure.js';

const filterKeys = Object.keys(defaultStructureFilters());
const views = ['flow', 'days', 'calendar'];
export const eventMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export function readEventSearch(params, defaults = {}, now = new Date()) {
  const explicit = [...filterKeys, 'view', 'month', 'direction'].some((key) => params.has(key));
  const filters = defaultStructureFilters();
  for (const key of filterKeys) filters[key] = explicit ? params.get(key) || '' : defaults.filters?.[key] || '';
  filters.q = filters.q.slice(0, 255);
  const view = explicit ? params.get('view') : defaults.view;
  const month = params.get('month');
  return {
    filters, view: views.includes(view) ? view : 'flow', descending: params.get('direction') === 'desc',
    monthKey: /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') && month >= '1900-01' ? month : eventMonthKey(now),
  };
}

export function writeEventSearch(params, state) {
  const next = new URLSearchParams(params);
  for (const key of filterKeys) {
    if (state.filters[key]) next.set(key, state.filters[key]); else next.delete(key);
  }
  next.set('view', state.view);
  next.set('month', state.monthKey);
  next.set('direction', state.descending ? 'desc' : 'asc');
  return next;
}
