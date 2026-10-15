export const statuses = { new: 'Зарегистрирован', investigating: 'Разбор', working: 'В работе', waiting: 'Внешняя сторона', monitoring: 'Наблюдение', closed: 'Закрыт', accepted: 'Принято ограничение', unconfirmed: 'Не подтверждён' };
export const kinds = { incident: 'Поломка / инцидент', constraint: 'Ограничение', external_factor: 'Внешний фактор', regression: 'Регрессия' };
export const origins = { unknown: 'Неизвестно', internal: 'Наши действия', external: 'Внешняя причина', systemic: 'Системная проблема' };
export const severities = { low: 'Низкая', medium: 'Средняя', high: 'Высокая', critical: 'Критическая' };
export const relations = { possible_cause: 'Возможная причина', confirmed_cause: 'Подтверждённая причина', affected: 'Затронуто', remediation: 'Устранение / обход', context: 'Контекст', duplicate: 'Повторение / дубликат' };
export const modules = {
  task: ['Tasker', '#1d4ed8'], event: ['Eventor', '#2d6cdf'], project: ['Projector', '#be185d'],
  book: ['Booker', '#d85a30'], book_page: ['Страница Booker', '#d85a30'], lore: ['Lore', '#4f46a5'],
  fact: ['Factor', '#2b6cb0'], plan_item: ['Planner', '#0f766e'], darklog: ['Darklog', '#70556f'],
  file: ['Filer', '#366a91'], comment: ['Комментарий', '#8992a2'],
};
export const actions = { 'darklog.created': 'Дарклог зарегистрирован', 'darklog.updated': 'Карточка изменена', 'darklog.linked': 'Связь добавлена', 'darklog.unlinked': 'Связь удалена', 'darklog.comment_deleted': 'Комментарий удалён', 'darklog.kpi_reviewed': 'Применимость KPI изменена', 'darklog.kpi_removed': 'Связь с KPI удалена' };
export const decisions = { pending: 'На рассмотрении', included: 'Учитывать', excluded: 'Не учитывать' };
export const monthNow = () => dayKey(new Date()).slice(0, 7);
export const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const localInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${dayKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};
export const isoInput = (value) => value ? new Date(value).toISOString() : null;
export const darklogHref = (scopeId, id) => `/darklog/${scopeId}/${id}`;

export function calendarWeeks(month) {
  const first = new Date(`${month}-01T12:00:00`);
  first.setDate(first.getDate() - (first.getDay() + 6) % 7);
  const end = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 12);
  end.setDate(end.getDate() + 6 - (end.getDay() + 6) % 7);
  const weeks = [];
  for (let cursor = new Date(first); cursor <= end;) {
    const week = [];
    for (let column = 0; column < 7; column++) { week.push(dayKey(cursor)); cursor.setDate(cursor.getDate() + 1); }
    weeks.push(week);
  }
  return weeks;
}

export function periodSegment(period, week, now = Date.now()) {
  const from = new Date(period.starts_at).getTime();
  const until = period.ends_at ? new Date(period.ends_at).getTime() : now;
  if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from) return null;
  const indices = week.flatMap((day, index) => {
    const start = new Date(`${day}T00:00:00`);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return from < end.getTime() && until > start.getTime() ? [index] : [];
  });
  if (!indices.length) return null;
  const first = indices[0]; const last = indices.at(-1);
  const lastEnd = new Date(`${week[6]}T00:00:00`); lastEnd.setDate(lastEnd.getDate() + 1);
  return { first, last, continuesBefore: from < new Date(`${week[0]}T00:00:00`).getTime(), continuesAfter: until > lastEnd.getTime(), open: !period.ends_at };
}

export function markersOnSegment(markers, week, segment) {
  return markers.flatMap((marker) => {
    const date = new Date(marker.at);
    if (!Number.isFinite(date.getTime())) return [];
    const column = week.indexOf(dayKey(date));
    return column >= segment.first && column <= segment.last ? [{ ...marker, column }] : [];
  });
}
