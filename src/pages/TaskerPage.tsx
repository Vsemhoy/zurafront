import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconColumns, IconList, IconPlus, IconSearch } from '@tabler/icons-react'
import { useWorkspace } from '../app/workspace'
import { taskApi } from '../entities/task/api'
import { taskReference, type Task, type TaskStatus } from '../entities/task/model'
import './TaskerPage.css'

const columns: Array<{ status: TaskStatus; label: string }> = [
  { status: 'todo', label: 'К выполнению' }, { status: 'in_progress', label: 'В работе' }, { status: 'review', label: 'На проверке' }, { status: 'done', label: 'Готово' },
]

function TaskCard({ task }: { task: Task }) {
  return <article className="task-card"><header><code>{taskReference(task)}</code>{task.assignee && <span title={task.assignee.name}>{task.assignee.name.slice(0, 1)}</span>}</header><strong>{task.title}</strong><footer><small className={`priority priority--${task.priority}`}>{task.priority}</small>{task.due_at && <time>{new Date(task.due_at).toLocaleDateString()}</time>}</footer></article>
}

export function TaskerPage() {
  const { activeScope } = useWorkspace(); const [view, setView] = useState<'board' | 'list'>('board')
  const { data: tasks = [], isLoading, error } = useQuery({ queryKey: ['tasks', activeScope?.id], queryFn: () => taskApi.list(activeScope!.id), enabled: Boolean(activeScope) })
  return <main className="tasker-page"><header className="tasker-toolbar"><h1>Задачи</h1><div className="view-switch"><button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')} aria-label="Доска"><IconColumns size={17}/></button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="Список"><IconList size={17}/></button></div><button className="filter-button">Проект</button><button className="filter-button">Исполнитель</button><label className="task-search"><IconSearch size={17}/><input placeholder="Поиск по ключу или названию"/></label><button className="new-task"><IconPlus size={17}/>Новая задача</button></header>
    {!activeScope && <div className="tasker-state">Создайте или выберите скоуп, чтобы увидеть задачи.</div>}{isLoading && <div className="tasker-state">Загружаю задачи…</div>}{error && <div className="tasker-state tasker-state--error">Не удалось загрузить задачи: {error.message}</div>}
    {activeScope && !isLoading && !error && view === 'board' && <section className="task-board">{columns.map((column) => { const items = tasks.filter((task) => task.status === column.status); return <section className="task-column" key={column.status}><header><span>{column.label}</span><small>{items.length}</small></header><div>{items.map((task) => <TaskCard key={task.id} task={task}/>)}</div><button><IconPlus size={16}/>Добавить</button></section> })}</section>}
    {activeScope && !isLoading && !error && view === 'list' && <section className="task-list"><header><span>Статус</span><span>Ключ и название</span><span>Проект</span><span>Исполнитель</span><span>Приоритет</span><span>Срок</span></header>{tasks.map((task) => <article key={task.id}><span>{columns.find((column) => column.status === task.status)?.label ?? task.status}</span><strong><code>{taskReference(task)}</code>{task.title}</strong><span>{task.project?.title ?? '—'}</span><span>{task.assignee?.name ?? 'Не назначен'}</span><span>{task.priority}</span><time>{task.due_at ? new Date(task.due_at).toLocaleDateString() : '—'}</time></article>)}</section>}
  </main>
}
