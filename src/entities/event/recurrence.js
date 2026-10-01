export function recurrenceLabel(frequency) {
  return frequency === 'monthly' ? 'Каждый месяц' : frequency === 'yearly' ? 'Каждый год' : 'Не повторять';
}

export function eventTypeOptions(types, currentId = '') {
  const none = types.find((type) => type.code === 'none');
  return { value: currentId === none?.id ? '' : currentId, rows: types.filter((type) => type.code !== 'none') };
}

export function localInputDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function recurrenceForm(event = {}) {
  return {
    recurrence_frequency: event.recurrence_frequency || '',
    recurrence_until: event.recurrence_until || '',
    recurrence_user_id: event.recurrence_user_id || '',
    recurrence_timezone: event.recurrence_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    starts_at: localInputDate(event.starts_at),
    ends_at: localInputDate(event.ends_at),
    is_all_day: Boolean(event.is_all_day),
  };
}

export function recurrencePayload(form) {
  return {
    recurrence_frequency: form.recurrence_frequency || null,
    recurrence_until: form.recurrence_frequency ? form.recurrence_until || null : null,
    recurrence_user_id: form.recurrence_frequency ? form.recurrence_user_id || null : null,
    recurrence_timezone: form.recurrence_timezone,
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    is_all_day: form.is_all_day,
  };
}
