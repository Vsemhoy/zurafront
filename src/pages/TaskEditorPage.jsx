import { lazy, Suspense, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconBriefcase,
  IconBook2,
  IconFileDescription,
  IconHistory,
  IconLink,
  IconMessage,
  IconTargetArrow,
  IconTrash,
} from "@tabler/icons-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../app/workspace";
import { contractorApi } from "../entities/contractor/api";
import { bookApi } from "../entities/book/api";
import { entityLinkApi } from "../entities/link/api";
import { projectApi } from "../entities/project/api";
import { taskApi } from "../entities/task/api";
import { priorityLabel } from "../entities/task/model";
import { TaskAssignmentFields } from "../shared/ui/TaskAssignmentFields";
import { TaskKpiField } from "../shared/ui/TaskKpiField";
import { contractorCanAccessProject } from "../shared/ui/taskAssignmentAccess";
import {
  BlockerPanel,
  RelationsPanel,
  SubtasksPanel,
  TaskChecklistPanel,
} from "./TaskMechanics";
import "./TaskEditorPage.css";

const MarkdownEditor = lazy(() => import("../shared/ui/CompactMarkdownEditor"));
const tabs = [
  ["content", "Содержание", IconFileDescription],
  ["work", "Работа", IconBriefcase],
  ["links", "Связи", IconLink],
  ["discussion", "Обсуждение", IconMessage],
  ["history", "История", IconHistory],
];

export function TaskEditorPage() {
  const { activeScope } = useWorkspace();
  const { taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("content");
  const [document, setDocument] = useState("description");
  const [creatingResult, setCreatingResult] = useState(false);
  const [comment, setComment] = useState("");
  const queryKey = ["task", activeScope?.id, taskId];
  const {
    data: task,
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => taskApi.get(activeScope.id, taskId),
    enabled: Boolean(activeScope),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", activeScope?.id],
    queryFn: () => projectApi.list(activeScope.id),
    enabled: Boolean(activeScope),
  });
  const { data: assignable = { assignees: [], agents: [] } } = useQuery({
    queryKey: ["task-assignable", activeScope?.id],
    queryFn: () => contractorApi.assignable(activeScope.id),
    enabled: Boolean(activeScope),
  });
  const commentsKey = ["task-comments", activeScope?.id, taskId];
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: commentsKey,
    queryFn: () => taskApi.comments(activeScope.id, taskId),
    enabled: Boolean(activeScope && task && tab === "discussion"),
  });
  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: ["task-activity", activeScope?.id, taskId],
    queryFn: () => taskApi.activity(activeScope.id, taskId),
    enabled: Boolean(activeScope && task && tab === "history"),
  });
  const save = useMutation({
    mutationFn: (payload) => taskApi.update(activeScope.id, taskId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey: ["tasks", activeScope.id] });
    },
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["tasks", activeScope.id] });
  };
  const detach = useMutation({
    mutationFn: () => taskApi.detach(activeScope.id, taskId),
    onSuccess: refresh,
  });
  const removeTask = useMutation({
    mutationFn: () => taskApi.remove(activeScope.id, taskId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["tasks", activeScope.id] });
      navigate("/tasks");
    },
  });
  const sendComment = useMutation({
    mutationFn: () => taskApi.createComment(activeScope.id, taskId, comment),
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: commentsKey });
      queryClient.invalidateQueries({
        queryKey: ["task-activity", activeScope.id, taskId],
      });
    },
  });

  if (isLoading)
    return <main className="task-editor-state">Открываю редактор…</main>;
  if (error || !task)
    return (
      <main className="task-editor-state task-editor-error">
        {error?.message ?? "Задача не найдена"}
      </main>
    );
  const hasStoredResult = Boolean(task.result?.trim());
  const hasResult = hasStoredResult || creatingResult;
  const activeDocument = document === "result" && hasResult ? "result" : "description";

  return (
    <main className="task-editor-page">
      <header className="task-editor-header">
        <button
          className="editor-back"
          onClick={() => navigate(`/tasks/${task.id}`)}
        >
          <IconArrowLeft size={18} />К задаче
        </button>
        {task.parent_id && (
          <button
            className="editor-detach"
            onClick={() => detach.mutate()}
            disabled={detach.isPending}
          >
            <IconArrowUpRight size={17} />
            Выделить в задачу
          </button>
        )}
        <button
          className="editor-delete"
          disabled={removeTask.isPending}
          onClick={() => {
            if (window.confirm(task.status === "cancelled" ? `Физически удалить ${task.task_key} · ${task.title}? Отменить это действие нельзя.` : `Переместить ${task.task_key} · ${task.title} в «Удалено»?`)) removeTask.mutate();
          }}
        >
          <IconTrash size={16}/>{removeTask.isPending ? "Удаляю…" : task.status === "cancelled" ? "Удалить навсегда" : "В удалённые"}
        </button>
        <code>{task.task_key}</code>
        <input
          value={task.title}
          onChange={(event) =>
            queryClient.setQueryData(queryKey, {
              ...task,
              title: event.target.value,
            })
          }
          onBlur={(event) => save.mutate({ title: event.target.value })}
        />
        <span className={`save-state ${save.isError || removeTask.isError ? "error" : ""}`}>
          {save.isPending
            ? "Сохраняю…"
            : removeTask.isError
              ? removeTask.error.message
              : save.isError
                ? save.error.message
              : "Сохранено"}
        </span>
      </header>
      <nav className="editor-tabs">
        {tabs.map(([value, label, Icon]) => (
          <button
            key={value}
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>

      {tab === "content" && (
        <section className="editor-content">
          <div className="document-switch">
            <button
              className={activeDocument === "description" ? "active" : ""}
              onClick={() => setDocument("description")}
            >
              <IconFileDescription size={17} />
              Описание
            </button>
            {hasResult ? (
              <button
                className={activeDocument === "result" ? "active" : ""}
                onClick={() => setDocument("result")}
              >
                <IconTargetArrow size={17} />
                Результат
              </button>
            ) : (
              <button
                onClick={() => {
                  setCreatingResult(true);
                  setDocument("result");
                }}
              >
                <IconTargetArrow size={17} />
                Добавить результат
              </button>
            )}
          </div>
          <Suspense
            fallback={
              <div className="editor-loading">Загружаю Markdown-редактор…</div>
            }
          >
            <MarkdownEditor
              key={activeDocument}
              variant="full"
              value={task[activeDocument]}
              hideToolbarTrigger={!hasResult}
              placeholder={
                activeDocument === "description"
                  ? "Подробно опишите задачу, контекст и ограничения…"
                  : "Зафиксируйте фактический результат работы…"
              }
              onSave={(markdown) => {
                save.mutate({ [activeDocument]: markdown });
                if (activeDocument === "result" && !markdown) {
                  setCreatingResult(false);
                  setDocument("description");
                }
              }}
            />
          </Suspense>
        </section>
      )}

      {tab === "work" && (
        <section className="editor-work">
          <div className="editor-properties">
            <label>
              Статус
              <select
                value={task.status}
                disabled={task.status === "blocked"}
                onChange={(event) =>
                  save.mutate({ status: event.target.value })
                }
              >
                <option value="scheduled">Запланировано</option>
                <option value="todo">К выполнению</option>
                <option value="in_progress">В работе</option>
                {task.status === "blocked" && (
                  <option value="blocked">Заблокировано</option>
                )}
                <option value="review">На проверке</option>
                <option value="done">Готово</option>
                <option value="cancelled">Удалено</option>
              </select>
            </label>
            <label>
              Проект
              <select
                value={task.project_id ?? ""}
                onChange={(event) => {
                  const projectId = event.target.value || null;
                  const assignee = assignable.assignees.find(
                    (item) => item.id === task.assignee_id,
                  );
                  const agent = assignable.agents.find(
                    (item) => item.id === task.delegated_agent_id,
                  );
                  save.mutate({
                    project_id: projectId,
                    ...(assignee &&
                    !contractorCanAccessProject(assignee, projectId)
                      ? { assignee_id: null }
                      : {}),
                    ...(agent &&
                    !contractorCanAccessProject(agent, projectId)
                      ? { delegated_agent_id: null }
                      : {}),
                  });
                }}
              >
                <option value="">Без проекта</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.key} · {project.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Приоритет
              <select
                value={task.priority}
                onChange={(event) =>
                  save.mutate({ priority: Number(event.target.value) })
                }
              >
                {[1, 2, 3, 4, 5].map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel(priority)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="task-customer-field">
            Заказчик
            <select
              value={task.customer_id ?? ""}
              onChange={(event) => save.mutate({ customer_id: event.target.value || null })}
            >
              <option value="">Не указан</option>
              {(assignable.people ?? assignable.assignees).map((user) => (
                <option key={user.id} value={user.id}>{user.name}{user.position ? ` · ${user.position}` : ""}</option>
              ))}
            </select>
          </label>
          <TaskKpiField scopeId={activeScope.id} value={task.kpi_id} onChange={(kpiId) => save.mutate({ kpi_id: kpiId })}/>
          <TaskAssignmentFields
            assignees={assignable.assignees}
            agents={assignable.agents}
            assigneeId={task.assignee_id}
            agentDelegatable={Boolean(task.is_agent_delegatable)}
            delegatedAgentId={task.delegated_agent_id}
            projectId={task.project_id}
            onChange={(payload) => save.mutate(payload)}
          />
          <div className="editor-mechanics-grid">
            <TaskChecklistPanel
              task={task}
              scopeId={activeScope.id}
              refresh={refresh}
            />
            <SubtasksPanel
              task={task}
              scopeId={activeScope.id}
              refresh={refresh}
            />
          </div>
          {(detach.error || save.error) && (
            <p className="form-error">
              {detach.error?.message ?? save.error?.message}
            </p>
          )}
          <BlockerPanel
            task={task}
            scopeId={activeScope.id}
            taskId={task.id}
            refresh={refresh}
          />
        </section>
      )}

      {tab === "links" && (
        <section className="editor-simple editor-relations">
          <RelationsPanel task={task} scopeId={activeScope.id} />
          <BookerLinksPanel task={task} scopeId={activeScope.id} />
        </section>
      )}
      {tab === "discussion" && (
        <section className="editor-discussion">
          <h2>Обсуждение</h2>
          <div className="comment-list">
            {commentsLoading && <p>Загружаю комментарии…</p>}
            {comments.map((item) => (
              <article key={item.id}>
                <span className="comment-avatar">
                  {item.created_by?.name?.slice(0, 2).toUpperCase() ?? "??"}
                </span>
                <div>
                  <header>
                    <strong>
                      {item.created_by?.name ?? "Неизвестный автор"}
                    </strong>
                    <time>{new Date(item.created_at).toLocaleString()}</time>
                  </header>
                  <p>{item.content}</p>
                </div>
              </article>
            ))}
            {!commentsLoading && comments.length === 0 && (
              <p className="comments-empty">
                Комментариев пока нет. Можно начать с контекста, который не
                поместился в описание.
              </p>
            )}
          </div>
          <form
            className="comment-compose"
            onSubmit={(event) => {
              event.preventDefault();
              if (comment.trim()) sendComment.mutate();
            }}
          >
            <textarea
              rows="4"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Написать комментарий…"
            />
            {sendComment.error && (
              <p className="form-error">{sendComment.error.message}</p>
            )}
            <footer>
              <small>Вложения и @упоминания добавим следующим слоем</small>
              <button disabled={!comment.trim() || sendComment.isPending}>
                {sendComment.isPending ? "Отправляю…" : "Отправить"}
              </button>
            </footer>
          </form>
        </section>
      )}
      {tab === "history" && (
        <section className="editor-history">
          <h2>История</h2>
          {activityLoading && <p>Загружаю историю…</p>}
          <div className="activity-list">
            {activity.map((item) => (
              <article key={item.id}>
                <i />
                <div>
                  <p>
                    <strong>{item.actor?.name ?? "Система"}</strong>{" "}
                    {activityLabel(item.action)}
                  </p>
                  <time>{new Date(item.created_at).toLocaleString()}</time>
                  {activityDetails(item) && (
                    <small>{activityDetails(item)}</small>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!activityLoading && activity.length === 0 && (
            <p>Для этой задачи событий пока нет.</p>
          )}
        </section>
      )}
    </main>
  );
}

function BookerLinksPanel({ task, scopeId }) {
  const queryClient = useQueryClient();
  const [bookId, setBookId] = useState("");
  const [pageId, setPageId] = useState("");
  const key = ["entity-links", scopeId, "task", task.id];
  const { data: links = [] } = useQuery({ queryKey: key, queryFn: () => entityLinkApi.list(scopeId, "task", task.id) });
  const { data: books = [] } = useQuery({ queryKey: ["books", scopeId], queryFn: () => bookApi.books(scopeId) });
  const { data: pages = [] } = useQuery({ queryKey: ["book-pages", scopeId, bookId], queryFn: () => bookApi.pages(scopeId, bookId), enabled: Boolean(bookId) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const create = useMutation({ mutationFn: () => entityLinkApi.create(scopeId, { source_type: "task", source_id: task.id, target_type: pageId ? "book_page" : "book", target_id: pageId || bookId, relation: "specification" }), onSuccess: () => { setBookId(""); setPageId(""); refresh(); } });
  const remove = useMutation({ mutationFn: (id) => entityLinkApi.remove(scopeId, id), onSuccess: refresh });
  const bookLinks = links.filter((link) => ["book", "book_page"].includes(link.target_type) || ["book", "book_page"].includes(link.source_type));
  return <section className="booker-linker"><header><div><IconBook2 size={18}/><h2>Техническое задание</h2></div><small>Booker</small></header><div className="booker-link-list">{bookLinks.map((link) => { const target = link.target_type === "task" ? link.source : link.target; const type = link.target_type === "task" ? link.source_type : link.target_type; const parentBookId = type === "book" ? target.id : target.book_id; const href = type === "book" ? `/books/${target.id}` : `/books/${parentBookId}/pages/${target.id}`; return <div key={link.id}><Link to={href}><IconBook2 size={15}/><span><strong>{target.title}</strong><small>{type === "book_page" ? "Страница Booker" : "Книга Booker"}</small></span></Link><button onClick={() => remove.mutate(link.id)}>×</button></div>; })}{!bookLinks.length && <p>К задаче ещё не привязано ТЗ из Booker.</p>}</div><div className="booker-link-form"><select value={bookId} onChange={(event) => { setBookId(event.target.value); setPageId(""); }}><option value="">Выберите книгу</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select><select disabled={!bookId} value={pageId} onChange={(event) => setPageId(event.target.value)}><option value="">Вся книга</option>{pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select><button disabled={!bookId || create.isPending} onClick={() => create.mutate()}>Привязать</button></div>{create.error && <p className="form-error">{create.error.message}</p>}</section>;
}

function activityLabel(action) {
  return (
    {
      "task.blocked": "установил блокировку",
      "task.unblocked": "снял блокировку",
      "task.moved": "переместил задачу",
      "task.detached": "выделил подзадачу",
      "task.relation_created": "добавил связь",
      "task.relation_deleted": "удалил связь",
      "task.comment_created": "добавил комментарий",
      "checklist_item.completed": "выполнил пункт чек-листа",
      "checklist_item.reopened": "повторно открыл пункт чек-листа",
      "checklist_item.converted_to_subtask": "преобразовал пункт в подзадачу",
    }[action] ?? action
  );
}

function activityDetails(item) {
  if (item.action === "task.moved")
    return `${item.before?.status ?? "—"} → ${item.after?.status ?? "—"}`;
  if (item.action === "task.blocked") return item.after?.reason;
  if (item.action === "task.unblocked") return item.after?.resolution_note;
  if (item.action === "task.relation_created") return item.after?.task_key;
  return null;
}
