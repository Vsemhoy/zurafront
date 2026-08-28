import { lazy, Suspense, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconArrowLeft,
  IconBriefcase,
  IconCheck,
  IconFileDescription,
  IconHistory,
  IconLink,
  IconMessage,
  IconTargetArrow,
} from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../app/workspace";
import { projectApi } from "../entities/project/api";
import { taskApi } from "../entities/task/api";
import { priorityLabel } from "../entities/task/model";
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
  const { data: relations = [] } = useQuery({
    queryKey: ["task-relations", activeScope?.id, taskId],
    queryFn: () => taskApi.relations(activeScope.id, taskId),
    enabled: Boolean(activeScope && task),
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
  const checklist = task.checklist_items ?? [];
  const subtasks = task.children ?? [];
  const blockers = task.blockers ?? [];
  const activeBlocker = blockers.find((blocker) => !blocker.resolved_at);

  return (
    <main className="task-editor-page">
      <header className="task-editor-header">
        <button
          className="editor-back"
          onClick={() => navigate(`/tasks/${task.id}`)}
        >
          <IconArrowLeft size={18} />К задаче
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
        <span className={`save-state ${save.isError ? "error" : ""}`}>
          {save.isPending
            ? "Сохраняю…"
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
              className={document === "description" ? "active" : ""}
              onClick={() => setDocument("description")}
            >
              <IconFileDescription size={17} />
              Описание
            </button>
            <button
              className={document === "result" ? "active" : ""}
              onClick={() => setDocument("result")}
            >
              <IconTargetArrow size={17} />
              Результат
            </button>
          </div>
          <Suspense
            fallback={
              <div className="editor-loading">Загружаю Markdown-редактор…</div>
            }
          >
            <MarkdownEditor
              key={document}
              variant="full"
              value={task[document]}
              placeholder={
                document === "description"
                  ? "Подробно опишите задачу, контекст и ограничения…"
                  : "Зафиксируйте фактический результат работы…"
              }
              onSave={(markdown) => save.mutate({ [document]: markdown })}
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
                <option value="todo">К выполнению</option>
                <option value="in_progress">В работе</option>
                {task.status === "blocked" && (
                  <option value="blocked">Заблокировано</option>
                )}
                <option value="review">На проверке</option>
                <option value="done">Готово</option>
              </select>
            </label>
            <label>
              Проект
              <select
                value={task.project_id ?? ""}
                onChange={(event) =>
                  save.mutate({ project_id: event.target.value || null })
                }
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
          {activeBlocker && (
            <article className="editor-blocker">
              <strong>Активная блокировка</strong>
              <p>{activeBlocker.reason}</p>
              <small>
                Для продолжения: {activeBlocker.resolution_required}
              </small>
            </article>
          )}
          <div className="work-grid">
            <article>
              <header>
                Чек-лист{" "}
                <small>
                  {checklist.filter((item) => item.completed_at).length}/
                  {checklist.length}
                </small>
              </header>
              {checklist.map((item) => (
                <p key={item.id} className={item.completed_at ? "done" : ""}>
                  {item.completed_at && <IconCheck size={14} />} {item.title}
                </p>
              ))}
            </article>
            <article>
              <header>
                Подзадачи{" "}
                <small>
                  {subtasks.filter((item) => item.status === "done").length}/
                  {subtasks.length}
                </small>
              </header>
              {subtasks.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/tasks/${item.id}/edit`)}
                >
                  <code>{item.task_key}</code>
                  {item.title}
                </button>
              ))}
            </article>
          </div>
        </section>
      )}

      {tab === "links" && (
        <section className="editor-simple">
          <h2>Связи задачи</h2>
          {relations.length ? (
            relations.map((item) => (
              <article key={item.id}>
                <span>{item.relation}</span>
                <code>{item.task?.task_key}</code>
                <strong>{item.task?.title}</strong>
              </article>
            ))
          ) : (
            <p>
              Связей пока нет. Добавить их можно из быстрого инспектора;
              универсальный менеджер сущностей будет следующим проходом.
            </p>
          )}
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
