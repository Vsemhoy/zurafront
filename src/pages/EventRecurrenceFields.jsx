import { useState } from 'react';
import { recurrenceForm, recurrencePayload } from '../entities/event/recurrence';

export function EventRecurrenceFields({ form, onChange, people, dates = false, disabled = false }) {
  const set = (key) => (event) => onChange({ [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return <fieldset className="event-recurrence-fields" disabled={disabled}>
    <legend>Глобалтаймер</legend>
    <label>Повторять<select value={form.recurrence_frequency} onChange={set('recurrence_frequency')}><option value="">Не повторять</option><option value="monthly">Каждый месяц</option><option value="yearly">Каждый год</option></select></label>
    {dates && <><label>{form.recurrence_frequency ? 'Первое событие' : 'Начало'}<input required={Boolean(form.recurrence_frequency)} type="datetime-local" value={form.starts_at} onChange={set('starts_at')}/></label><label>Окончание одного события<input type="datetime-local" value={form.ends_at} onChange={set('ends_at')}/></label><label className="event-checkbox"><input type="checkbox" checked={form.is_all_day} onChange={set('is_all_day')}/>Весь день</label></>}
    {form.recurrence_frequency && <>
      <label>Повторять по дату включительно<input type="date" value={form.recurrence_until} onChange={set('recurrence_until')}/><small>Пусто — без ограничения</small></label>
      <label>Связать с сотрудником<select value={form.recurrence_user_id} onChange={set('recurrence_user_id')}><option value="">Не привязано</option>{form.recurrence_user_id && !people.some((person) => person.id === form.recurrence_user_id) && <option value={form.recurrence_user_id}>Сотрудник недоступен — повторы остановлены</option>}{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      <label>Часовой пояс повторения<select value={form.recurrence_timezone} onChange={set('recurrence_timezone')}>{[...new Set([form.recurrence_timezone, browserTimezone, 'UTC'])].map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select></label>
      <p>Одна запись для всей серии. Дата и время начала задают день повторения. Время в полях — местное время этого браузера. Если дня нет в месяце, берём последний день. Удаление или отключение сотрудника прекращает показ повторов. Личная/общая видимость задаётся в настройках события.</p>
    </>}
  </fieldset>;
}

export function EventRecurrenceEditor({ event, people, onSave, pending, error }) {
  const [form, setForm] = useState(() => recurrenceForm(event));
  const [dirty, setDirty] = useState(false);
  return <form className="event-recurrence-editor" onSubmit={async (submit) => {
    submit.preventDefault();
    const payload = recurrencePayload(form);
    if (payload.recurrence_user_id === event.recurrence_user_id) delete payload.recurrence_user_id;
    try { await onSave(payload); setDirty(false); } catch { /* The mutation error is displayed below. */ }
  }}>
    <p>Правки применяются ко всей серии. Это напоминание в календаре, без push-уведомлений и автоматического создания задач.</p>
    <EventRecurrenceFields form={form} people={people} dates disabled={pending} onChange={(patch) => { setDirty(true); setForm((current) => ({ ...current, ...patch })); }}/>
    {error && <p className="eventor-error">{error.message}</p>}
    <button className="event-primary" disabled={pending || !dirty}>{pending ? 'Сохраняю…' : 'Сохранить расписание'}</button>
  </form>;
}
