export function eventDayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function eventDays(month, events, descending = false) {
  const grouped = new Map();
  for (const event of events) {
    const key = eventDayKey(event.occurrence_start || event.starts_at || event.occurred_at || event.created_at);
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(event);
  }
  for (const list of grouped.values()) list.sort((a, b) => Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned)) ||
    new Date(a.occurrence_start || a.starts_at || a.occurred_at || a.created_at) - new Date(b.occurrence_start || b.starts_at || b.occurred_at || b.created_at) || String(a.occurrence_id || a.id).localeCompare(String(b.occurrence_id || b.id)));
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: count }, (_, i) => {
    const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
    const key = eventDayKey(date);
    return { date, key, weekend: [0, 6].includes(date.getDay()), events: grouped.get(key) || [] };
  });
  return descending ? days.reverse() : days;
}

export function loadEventView(key, storage) {
  try {
    storage ??= globalThis.localStorage;
    const value = storage.getItem(`${key}:view`) || storage.getItem('zuratax:eventor-view');
    return ['flow', 'calendar', 'days'].includes(value) ? value : 'flow';
  } catch { return 'flow'; }
}
