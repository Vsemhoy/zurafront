import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { equipApi } from '../entities/equip/api';
import { eventApi } from '../entities/event/api';

export function EventImportedLinks({ scopeId, event }) {
  const thingId = event.meta?.legacy_thing_id;
  const thing = useQuery({ queryKey: ['event-related-thing', scopeId, thingId], enabled: Boolean(thingId), retry: false, gcTime: 0, queryFn: () => equipApi.get(scopeId, thingId) });
  const parent = useQuery({ queryKey: ['event', scopeId, event.parent_id], enabled: Boolean(event.parent_id), retry: false, gcTime: 0, queryFn: () => eventApi.get(scopeId, event.parent_id) });
  return <section className="record-links">
    {event.parent_id && <p>{parent.data ? <Link to={`/events?event=${event.parent_id}`}>Родительское событие · {parent.data.title}</Link> : parent.isPending ? 'Загружаю родителя…' : 'Родительское событие недоступно'}</p>}
    {thingId && <p>{thing.data ? <Link to={`/equip?item=${thingId}`}>Оборудование · {thing.data.name}</Link> : thing.isPending ? 'Загружаю оборудование…' : 'Оборудование недоступно'}</p>}
    {Boolean(event.meta?.tags?.length) && <p>Метки: {event.meta.tags.map((tag) => tag.name).join(', ')}</p>}
    {event.meta?.legacy_client && <p>Заказчик из прежней системы: {event.meta.legacy_client}</p>}
  </section>;
}
