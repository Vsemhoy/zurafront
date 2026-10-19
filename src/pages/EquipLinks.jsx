import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { equipApi } from '../entities/equip/api';
import { taskReference } from '../entities/task/model';
import { DiagramAttachmentsPanel } from '../shared/ui/DiagramAttachmentsPanel';
import { ContentNodeBrowser } from '../shared/ui/ContentNodeBrowser';

const statuses = { scheduled: 'Запланирована', todo: 'К выполнению', in_progress: 'В работе', blocked: 'Заблокирована', review: 'На проверке', done: 'Выполнена', cancelled: 'Отменена' };

export function EquipLinks({ scopeId, id, permissions }) {
  const [kind, setKind] = useState('tasks');
  const [preview, setPreview] = useState(null);
  if (!permissions.task_view) return <p className="equip-dialog-body">Для просмотра связанных задач и диаграмм нужно право просмотра задач.</p>;
  return <div className="equip-dialog-body equip-links">
    <nav className="equip-link-kinds" aria-label="Тип связей"><button aria-pressed={kind === 'tasks'} onClick={() => setKind('tasks')}>Задачи</button><button aria-pressed={kind === 'diagrams'} onClick={() => setKind('diagrams')}>Диаграммы</button></nav>
    {kind === 'tasks' ? <TaskLinks scopeId={scopeId} id={id} readOnly={!permissions.update}/> : <DiagramAttachmentsPanel scopeId={scopeId} type="thing" id={id} readOnly={!permissions.update || !permissions.task_update} onOpen={setPreview}/>}
    {preview && <DiagramPreview key={preview.id} scopeId={scopeId} item={preview} onClose={() => setPreview(null)}/>}
  </div>;
}

function TaskLinks({ scopeId, id, readOnly }) {
  const client = useQueryClient();
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [candidatePage, setCandidatePage] = useState(1);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setCandidatePage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const key = ['equip-tasks', scopeId, id];
  const linked = useQuery({ queryKey: [...key, 'linked', page], queryFn: ({ signal }) => equipApi.tasks(scopeId, id, { page }, signal) });
  const candidates = useQuery({ queryKey: [...key, 'candidates', query, candidatePage], queryFn: ({ signal }) => equipApi.tasks(scopeId, id, { candidates: 1, q: query, page: candidatePage }, signal), enabled: picking && !readOnly });
  const change = useMutation({ mutationFn: ({ taskId, remove }) => remove ? equipApi.detachTask(scopeId, id, taskId) : equipApi.attachTask(scopeId, id, taskId),
    onSuccess: () => { client.invalidateQueries({ queryKey: key }); client.invalidateQueries({ queryKey: ['equip-history', scopeId, id] }); } });
  const taskLabel = (task) => <><strong>{taskReference(task)} · {task.title}</strong><small>{statuses[task.status] || task.status}{task.assignee ? ' · ' + task.assignee.name : ''}</small></>;
  return <section>
    <header className="equip-links-heading"><strong>Связанные задачи</strong>{!readOnly && <button onClick={() => setPicking(!picking)}>{picking ? 'Закрыть поиск' : 'Привязать задачу'}</button>}</header>
    <p className="equip-operation-help">Открытие задачи — в новой вкладке. Отвязка убирает только связь с оборудованием.</p>
    {change.error && <p role="alert" className="equip-error">{change.error.message}</p>}
    {picking && !readOnly && <div className="equip-link-picker"><input aria-label="Поиск задачи" placeholder="Название или номер задачи…" maxLength={120} value={search} onChange={(event) => setSearch(event.target.value)}/>
      {candidates.error && <p role="alert">{candidates.error.message}</p>}
      {candidates.isPending ? <p>Ищу задачи…</p> : <><ul className="equip-link-list">{candidates.data?.data.map((task) => <li key={task.id}><div>{taskLabel(task)}</div><button disabled={change.isPending} onClick={() => change.mutate({ taskId: task.id })}>Привязать</button></li>)}</ul>{candidates.data?.data.length === 0 && <p>Доступных непривязанных задач не найдено.</p>}</>}
      <LinkPages page={candidatePage} result={candidates} onChange={setCandidatePage}/>
    </div>}
    {linked.error && <p role="alert">{linked.error.message}</p>}
    {linked.isPending ? <p>Загружаю задачи…</p> : <><ul className="equip-link-list">{linked.data?.data.map((task) => <li key={task.id} data-status={task.status}><Link to={`/tasks/${task.id}/edit`} target="_blank" rel="noopener noreferrer" title="Открыть задачу в новой вкладке">{taskLabel(task)}</Link>{!readOnly && <button disabled={change.isPending} onClick={() => change.mutate({ taskId: task.id, remove: true })} aria-label={`Отвязать задачу ${taskReference(task)}`}>Отвязать</button>}</li>)}</ul>{linked.data?.data.length === 0 && <p>Связанных задач пока нет.</p>}</>}
    <LinkPages page={page} result={linked} onChange={setPage}/>
  </section>;
}

function LinkPages({ page, result, onChange }) {
  return (page > 1 || result.data?.meta.has_more) && <nav className="equip-pagination"><button disabled={page === 1 || result.isFetching} onClick={() => onChange(page - 1)}>Назад</button><span>{page}</span><button disabled={!result.data?.meta.has_more || result.isFetching} onClick={() => onChange(page + 1)}>Далее</button></nav>;
}

function DiagramPreview({ scopeId, item, onClose }) {
  return <ContentNodeBrowser scopeId={scopeId} initialNode={{ type: 'diagram', id: item.id, title: item.title }} onClose={onClose}/>;
}
