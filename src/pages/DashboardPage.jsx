import { useQuery } from '@tanstack/react-query';
import { IconAlertTriangle, IconArrowRight, IconBook2, IconBriefcase2, IconCalendarEvent, IconCheck, IconClipboardList, IconMessageCircle, IconPlus, IconTargetArrow, IconUsers } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../app/workspace';
import { useAuth } from '../auth';
import { dashboardApi } from '../entities/dashboard/api';
import './DashboardPage.css';

const statusLabels = { scheduled: 'Запланировано', todo: 'К выполнению', in_progress: 'В работе', blocked: 'Заблокировано', review: 'На проверке', done: 'Готово', cancelled: 'Удалено' };
const shortDate = (value) => value ? new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) : null;
const relativeDate = (value) => {
  if (!value) return '';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн. назад`;
  return shortDate(value);
};

export function DashboardPage() {
  const { activeScope } = useWorkspace();
  const user = useAuth((state) => state.user);
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard', activeScope?.id], queryFn: () => dashboardApi.show(activeScope.id), enabled: Boolean(activeScope), refetchInterval: 60000 });
  if (!activeScope) return <main className="crm-dashboard-state">Выберите скоуп.</main>;
  if (isLoading) return <main className="crm-dashboard-state">Собираю рабочую картину…</main>;
  if (error) return <main className="crm-dashboard-state error">{error.message}</main>;
  const myKpi = data.kpi?.me;

  return <main className="crm-dashboard">
    <header className="crm-hero"><div><small>{activeScope.name} · {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</small><h1>Привет, {user?.name?.split(' ')[0] || 'бро'}</h1><p>{data.summary.my_open_tasks ? `В фокусе ${data.summary.my_open_tasks} задач${data.summary.my_overdue_tasks ? `, просрочено ${data.summary.my_overdue_tasks}` : ''}.` : 'Личный хвост разобран. Можно посмотреть, что происходит у команды.'}</p></div><nav><Link className="primary" to="/tasks"><IconPlus size={16}/>Новая задача</Link><Link to="/planner"><IconCalendarEvent size={16}/>Planner</Link><Link to="/kpi"><IconTargetArrow size={16}/>KPI</Link></nav></header>

    <section className="crm-metrics">
      <Metric icon={IconClipboardList} value={data.summary.my_open_tasks} label="Мои активные" tone="blue" href="/tasks"/>
      <Metric icon={IconAlertTriangle} value={data.summary.my_overdue_tasks} label="Просрочено" tone="red" href="/planner"/>
      <Metric icon={IconBriefcase2} value={data.summary.projects} label="Доступно проектов" tone="violet" href="/projects"/>
      <Metric icon={IconBook2} value={data.summary.books} label="Доступно книг" tone="orange" href="/books"/>
    </section>

    <div className="crm-dashboard-grid">
      <div className="crm-dashboard-main">
        <DashboardSection title="Мои задачи" icon={IconClipboardList} count={data.my_tasks.length} href="/tasks">
          <div className="crm-task-list">{data.my_tasks.map((task) => <TaskRow key={task.id} task={task}/>)}{!data.my_tasks.length && <Empty icon={IconCheck}>Активных задач нет.</Empty>}</div>
        </DashboardSection>
        <RecentWorkspace recent={data.recent}/>
      </div>

      <aside className="crm-dashboard-side">
        <MyKpiCard kpi={myKpi} month={data.kpi?.month}/>
        <TeamKpi people={data.kpi?.team ?? []}/>
        <BookComments comments={data.book_comments}/>
      </aside>
    </div>
  </main>;
}

function Metric({ icon: Icon, value, label, tone, href }) {
  return <Link className={`crm-metric crm-metric--${tone}`} to={href}><span><Icon size={17}/></span><div><strong>{value}</strong><small>{label}</small></div><IconArrowRight className="arrow" size={15}/></Link>;
}

function DashboardSection({ title, icon: Icon, count, href, children }) {
  return <section className="crm-panel"><header><span><Icon size={17}/><h2>{title}</h2>{count !== undefined && <i>{count}</i>}</span>{href && <Link to={href}>Открыть все<IconArrowRight size={14}/></Link>}</header>{children}</section>;
}

function TaskRow({ task }) {
  const overdue = task.due_at && new Date(task.due_at) < new Date();
  return <Link className="crm-task-row" to={`/tasks/${task.id}/edit`}><i style={{ background: task.project?.color || '#98a2b3' }}/><code>{task.task_key}</code><span><strong>{task.title}</strong><small>{task.project ? `${task.project.key} · ${task.project.title}` : 'Без проекта'}</small></span><em className={`task-status task-status--${task.status}`}>{statusLabels[task.status] || task.status}</em><time className={overdue ? 'overdue' : ''}>{task.due_at ? shortDate(task.due_at) : 'без срока'}</time></Link>;
}

function MyKpiCard({ kpi, month }) {
  return <section className="crm-kpi-card"><header><span><IconTargetArrow size={17}/><strong>Мои KPI</strong></span><Link to="/kpi">{month}</Link></header>{kpi ? <><div className="crm-kpi-score"><span><strong>{kpi.payable_bonus_percent}%</strong><small>премия</small></span><span><strong>{kpi.salary_progress}%</strong><small>оклад</small></span><span><strong>{kpi.completed_tasks}</strong><small>задач</small></span></div><div className="crm-kpi-progress"><span style={{ width: `${Math.min(100, kpi.bonus_points / Math.max(1, kpi.bonus_target) * 100)}%` }}/></div><small>{kpi.bonus_points} из {kpi.bonus_target} премиальных баллов</small><div className="crm-kpi-areas">{kpi.areas.filter((area) => area.completed_tasks > 0).slice(0, 4).map((area) => <span key={area.id} className={area.qualified ? 'qualified' : ''}><i>{area.completed_tasks}/{area.minimum_completed_tasks}</i>{area.name}<b>{area.qualified ? `+${area.awarded_points}` : '—'}</b></span>)}</div></> : <Empty icon={IconTargetArrow}>Для учётки пока нет KPI-расчёта.</Empty>}</section>;
}

function TeamKpi({ people }) {
  return <DashboardSection title="KPI команды" icon={IconUsers} href="/kpi"><div className="crm-team-kpi">{people.slice(0, 6).map((person, index) => <Link to="/kpi" key={person.user.id}><i>{index + 1}</i><span><strong>{person.user.name}</strong><small>{person.user.position || person.user.type} · {person.completed_tasks} задач</small></span><b>{person.payable_bonus_percent}%</b></Link>)}{!people.length && <Empty icon={IconUsers}>Других участников пока нет.</Empty>}</div></DashboardSection>;
}

function BookComments({ comments }) {
  return <DashboardSection title="Комментарии Booker" icon={IconMessageCircle} count={comments.length} href="/books"><div className="crm-comments">{comments.map((comment) => <Link to={comment.href} key={comment.id}><header><strong>{comment.creator?.name || 'Кто-то'}</strong><time>{relativeDate(comment.created_at)}</time></header><p>{comment.content}</p><small><IconBook2 size={12}/>{comment.book.title}{comment.page ? ` / ${comment.page.title}` : ''}</small></Link>)}{!comments.length && <Empty icon={IconMessageCircle}>Новых комментариев в доступных книгах нет.</Empty>}</div></DashboardSection>;
}

function RecentWorkspace({ recent }) {
  return <section className="crm-recent"><header><span>Новое в скоупе</span><small>последние добавления</small></header><div><RecentColumn title="Задачи" icon={IconClipboardList} href="/tasks">{recent.tasks.map((task) => <Link key={task.id} to={`/tasks/${task.id}/edit`}><code>{task.task_key}</code><span><strong>{task.title}</strong><small>{task.assignee?.name || 'Не назначена'} · {relativeDate(task.created_at)}</small></span></Link>)}</RecentColumn><RecentColumn title="Проекты" icon={IconBriefcase2} href="/projects">{recent.projects.map((project) => <Link key={project.id} to="/projects"><i style={{ background: project.color }}/><span><strong>{project.key} · {project.title}</strong><small>{project.tasks_count} задач · {project.books_count} книг</small></span></Link>)}</RecentColumn><RecentColumn title="Книги" icon={IconBook2} href="/books">{recent.books.map((book) => <Link key={book.id} to={`/books/${book.id}`}><IconBook2 size={15}/><span><strong>{book.title}</strong><small>{book.pages_count} страниц · {relativeDate(book.created_at)}</small></span></Link>)}</RecentColumn></div></section>;
}

function RecentColumn({ title, icon: Icon, href, children }) {
  return <article><header><span><Icon size={15}/><strong>{title}</strong></span><Link to={href}><IconArrowRight size={14}/></Link></header><div>{children}</div></article>;
}

function Empty({ icon: Icon, children }) {
  return <div className="crm-empty"><Icon size={19}/><span>{children}</span></div>;
}
