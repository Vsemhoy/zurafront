import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { IconMoon } from '@tabler/icons-react';
import { darklogApi } from '../../entities/darklog/api';
import { darklogHref, monthNow, relations, statuses } from '../../entities/darklog/model';
import './TaskDarklogs.css';

export function TaskDarklogs({ scopeId, task }) {
  const query = useQuery({ queryKey: ['task-darklogs', scopeId, task.id], queryFn: () => darklogApi.list(scopeId, { month: monthNow(), subject_type: 'task', subject_id: task.id, per_page: 100 }) });
  return <section className="task-darklogs"><header><strong><IconMoon size={17}/>Darklog</strong><Link to="/darklog">Реестр проблем ↗</Link></header>
    {query.isPending && <small>Загружаю связанные проблемы…</small>}
    {query.error && <p role="alert">{query.error.message}</p>}
    {query.data?.items.map((entry) => <Link key={entry.id} to={darklogHref(scopeId, entry.id)}><code>{entry.code}</code><span>{entry.title}<small>{statuses[entry.status]} · {entry.markers.filter((marker) => marker.link?.target.type === 'task' && marker.link.target.id === task.id).map((marker) => relations[marker.link.relation]).join(', ')}</small></span></Link>)}
    {query.data?.total === 0 && <small>Эта задача пока не связана с проблемами.</small>}
    {query.data && query.data.total > query.data.items.length && <small>Показаны первые {query.data.items.length} из {query.data.total} записей.</small>}
  </section>;
}
