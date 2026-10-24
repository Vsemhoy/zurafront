import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { entityLinkApi } from '../../entities/link/api';
import { useAuth } from '../../auth';
import { apiRequest } from '../../api';

const types = { fact: 'Факт', contact: 'Контакт', project: 'Проект', task: 'Задача', event: 'Событие', book: 'Книга', book_page: 'Страница' };
function href(type, item, scopeId) {
  return { fact: `/factor/${scopeId}/${item.id}`, contact: `/contacts/${scopeId}/${item.id}`, project: `/projects?project=${item.id}`, task: `/tasks/${item.id}/edit`, event: `/events?event=${item.id}`, book: `/books/${item.id}`, book_page: `/books/${item.book_id}/pages/${item.id}` }[type];
}

export function PrivateRecordLinks({ type, record, scopeId, allowedTypes = Object.keys(types) }) {
  const client = useQueryClient();
  const { user } = useAuth();
  const actorKey = `${user?.id}:${user?.acting_as?.id || ''}`;
  const [targetType, setTargetType] = useState(type === 'fact' ? 'contact' : 'fact');
  const [term, setTerm] = useState('');
  const [targetId, setTargetId] = useState('');
  const key = ['entity-links', scopeId, type, record.id, actorKey];
  const links = useQuery({ queryKey: key, gcTime: 0, queryFn: () => entityLinkApi.list(scopeId, type, record.id) });
  const candidates = useQuery({ queryKey: ['record-link-candidates', scopeId, actorKey, targetType, term], enabled: record.can_write, gcTime: 0,
    queryFn: async () => (await apiRequest(`/scopes/${scopeId}/links/candidates?${new URLSearchParams({ type: targetType, q: term })}`)).data });
  const add = useMutation({ mutationFn: () => entityLinkApi.create(scopeId, { source_type: type, source_id: record.id, target_type: targetType, target_id: targetId, relation: 'related' }), onSuccess: () => { setTargetId(''); void client.invalidateQueries({ queryKey: key }); } });
  const remove = useMutation({ mutationFn: (id) => entityLinkApi.remove(scopeId, id), onSuccess: () => client.invalidateQueries({ queryKey: key }) });
  return <section className="record-links"><h3>Связи</h3>
    {links.isPending && <p>Загружаю связи…</p>}
    {!links.error && links.data?.map((link) => {
      const outgoing = link.source_type === type && link.source_id === record.id;
      const other = outgoing ? link.target : link.source;
      const otherType = outgoing ? link.target_type : link.source_type;
      if (!other || !allowedTypes.includes(otherType)) return null;
      return <div key={link.id}><Link to={href(otherType, other, scopeId)}>{types[otherType] || otherType} · {other.task_key ? `${other.task_key} · ` : ''}{other.label || other.name || other.title}</Link>{record.can_write && <button type="button" disabled={remove.isPending} onClick={() => remove.mutate(link.id)} aria-label="Удалить связь">×</button>}</div>;
    })}
    {record.can_write && <div className="record-link-form"><select aria-label="Тип связи" value={targetType} onChange={(event) => { setTargetType(event.target.value); setTargetId(''); }}>{Object.entries(types).filter(([id]) => allowedTypes.includes(id)).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><input aria-label="Найти запись для связи" value={term} onChange={(event) => { setTerm(event.target.value); setTargetId(''); }} placeholder="Найти запись…"/><select aria-label="Связанная запись" value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">Выбрать…</option>{(candidates.data || []).filter((item) => item.id !== record.id).map((item) => <option key={item.id} value={item.id}>{item.code ? `${item.code} · ` : ''}{item.title}</option>)}</select><button type="button" disabled={!targetId || add.isPending} onClick={() => add.mutate()}>Связать</button></div>}
    {(links.error || candidates.error || add.error || remove.error) && <p className="record-error" role="alert">{(links.error || candidates.error || add.error || remove.error).message}</p>}
    <small>Связь не расширяет доступ к записи. Недоступные записи здесь не показываются.</small>
  </section>;
}
