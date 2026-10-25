import { useMemo, useState } from 'react';
import { IconEye, IconLock, IconMessageCircle, IconPin, IconPlus } from '@tabler/icons-react';
import MarkdownRenderer from '../shared/ui/MarkdownRenderer';
import { eventDayKey, eventDays } from '../entities/event/days';
import { recurrenceLabel } from '../entities/event/recurrence';
import './EventDayStream.css';

export function EventDayStream({ month, events, descending, onOpen, onComments, onCreate }) {
  const days = useMemo(() => eventDays(month, events, descending), [month, events, descending]);
  const today = eventDayKey(new Date());
  return <section className="event-day-stream" aria-label="Поток по дням">{days.map((day) => <div key={day.key} className={`event-day-row ${day.weekend ? 'is-weekend' : ''} ${day.key === today ? 'is-today' : ''}`}>
    <button className="event-day-label" aria-label={`Создать событие ${day.key}`} title="Двойной клик — новое событие" onDoubleClick={() => onCreate(day.key)}><time dateTime={day.key}><strong>{day.date.getDate()}</strong><small>{day.date.toLocaleDateString([], { weekday: 'short' })}</small></time></button>
    <div className="event-day-content" onDoubleClick={(click) => { if (!click.target.closest('.event-day-card,button,a,input')) onCreate(day.key); }}>
      <div className="event-day-cards">{day.events.map((event) => <DayCard key={event.occurrence_id || event.id} event={event} onOpen={onOpen} onComments={onComments}/>)}</div>
      <button className="event-day-add" onClick={() => onCreate(day.key)} aria-label={`Добавить событие ${day.key}`}><IconPlus size={12}/>Добавить</button>
    </div>
  </div>)}</section>;
}

function DayCard({ event, onOpen, onComments }) {
  const [revealed, setRevealed] = useState(false);
  const hidden = event.is_blurred && !revealed;
  if (hidden) return <article className="event-day-card event-day-card--hidden"><button onClick={() => setRevealed(true)}><IconEye size={15}/>Показать скрытое событие</button></article>;
  return <article className={`event-day-card ${event.recurrence_frequency ? 'is-recurring' : ''}`} style={{ '--day-color': event.section?.color || event.type?.color || '#8a98aa', '--day-bg': event.type?.background_color || '#fff' }} onDoubleClick={(click) => { if (!click.target.closest('a,button,input,textarea,select')) onOpen(event.id); }}>
    <header><span>{event.is_pinned && <IconPin size={12}/>} {event.is_locked && <IconLock size={12}/>} {event.is_all_day ? 'Весь день' : new Date(event.occurrence_start || event.starts_at || event.occurred_at || event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {event.type?.name || 'Без типа'}</span>{event.comments_allowed && <button title="Комментарии" onClick={() => onComments(event.id)}><IconMessageCircle size={14}/>{event.comments_count || ''}</button>}</header>
    <button className="event-day-title" onClick={() => onOpen(event.id)}>{event.title}</button>
    {event.recurrence_frequency && <small className="event-repeat-label">↻ {recurrenceLabel(event.recurrence_frequency)}</small>}
    {event.content && <div className="event-day-body">{event.format === 'code' ? <pre><code>{event.content}</code></pre> : event.format === 'text' ? <p className="event-plain-text">{event.content}</p> : <MarkdownRenderer>{event.content}</MarkdownRenderer>}</div>}
    <footer>{event.project && <span>{event.project.key}</span>}{event.section && <span>{event.section.name}</span>}{event.category && <span>{event.category.name}</span>}{(event.meta?.tags || []).map((tag) => <span key={tag.id}>#{tag.name}</span>)}{event.status !== 'published' && <span>{event.status === 'archived' ? 'Архив' : 'Черновик'}</span>}</footer>
  </article>;
}
