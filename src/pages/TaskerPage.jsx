import { lazy, Suspense, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconArrowsMaximize,
  IconCheck,
  IconChecklist,
  IconColumns,
  IconEdit,
  IconFileDescription,
  IconList,
  IconLink,
  IconLockOpen,
  IconPlus,
  IconSearch,
  IconSubtask,
  IconTargetArrow,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../app/workspace";
import { projectApi } from "../entities/project/api";
import { taskApi } from "../entities/task/api";
import { priorityLabel, taskReference } from "../entities/task/model";
import "./TaskerPage.css";
import "./TaskInteractions.css";
import "./Subtasks.css";
import "./Relations.css";
const CompactMarkdownEditor = lazy(
  () => import("../shared/ui/CompactMarkdownEditor"),
);

const columns = [
  { statuses: ["todo"], label: "К выполнению" },
  { statuses: ["in_progress", "blocked"], label: "В работе" },
  { statuses: ["review"], label: "На проверке" },
  { statuses: ["done"], label: "Готово" },
];

function TaskCard({ task, status, index, onOpen, onEdit, onMove }) {
  const blocked = task.status === "blocked";
  return (
    <article
      role="button"
      tabIndex={0}
      draggable={!blocked}
      className={`task-card ${blocked ? "task-card--blocked" : ""}`}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/task-id", task.id);
      }}
      onDragOver={(event) => {
        if (!blocked) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onMove(event.dataTransfer.getData("text/task-id"), status, index);
      }}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <header>
        <code>{taskReference(task)}</code>
        <div className="task-card-actions">
          {task.assignee && (
            <span title={task.assignee.name}>
              {task.assignee.name.slice(0, 1)}
            </span>
          )}
          <button
            type="button"
            draggable="false"
            className="task-card-edit"
            title="Открыть полный редактор"
            aria-label={`Открыть ${taskReference(task)} в полном редакторе`}
            onMouseDown={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onKeyDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            <IconEdit size={14} />
          </button>
        </div>
      </header>
      <strong>{task.title}</strong>
      <footer>
        <small>
          {blocked ? "Заблокировано" : priorityLabel(task.priority)}
        </small>
        {task.due_at && (
          <time>{new Date(task.due_at).toLocaleDateString()}</time>
        )}
      </footer>
    </article>
  );
}

function CreateDialog({ scopeId, projects, initialStatus, onClose }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("task");
  const [form, setForm] = useState({
    title: "",
    key: "",
    project_id: "",
    priority: 3,
    description: "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      mode === "task"
        ? taskApi.create(scopeId, {
            title: form.title,
            project_id: form.project_id || null,
            priority: Number(form.priority),
            status: initialStatus,
            description: form.description || null,
          })
        : projectApi.create(scopeId, { title: form.title, key: form.key }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [mode === "task" ? "tasks" : "projects", scopeId],
      });
      onClose();
    },
  });
  const set = (key) => (event) =>
    setForm((value) => ({ ...value, [key]: event.target.value }));
  return (
    <div className="task-modal-backdrop" onMouseDown={onClose}>
      <form
        className="task-modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <header>
          <div className="modal-mode">
            <button
              type="button"
              className={mode === "task" ? "active" : ""}
              onClick={() => setMode("task")}
            >
              Задача
            </button>
            <button
              type="button"
              className={mode === "project" ? "active" : ""}
              onClick={() => setMode("project")}
            >
              Проект
            </button>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <IconX size={18} />
          </button>
        </header>
        <label>
          Название
          <input
            autoFocus
            required
            value={form.title}
            onChange={set("title")}
            placeholder={
              mode === "task" ? "Что нужно сделать?" : "Название проекта"
            }
          />
        </label>
        {mode === "project" ? (
          <label>
            Литерал проекта
            <input
              required
              minLength={2}
              value={form.key}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  key: event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 10),
                }))
              }
              placeholder="ADM"
            />
            <small>Из него получатся ключи вроде ADM-154</small>
          </label>
        ) : (
          <>
            <div className="form-row">
              <label>
                Проект
                <select value={form.project_id} onChange={set("project_id")}>
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
                <select value={form.priority} onChange={set("priority")}>
                  {[1, 2, 3, 4, 5].map((priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabel(priority)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Описание
              <textarea
                rows="4"
                value={form.description}
                onChange={set("description")}
                placeholder="Контекст и ожидаемая работа"
              />
            </label>
          </>
        )}
        {mutation.error && (
          <p className="form-error">{mutation.error.message}</p>
        )}
        <footer>
          <button type="button" className="secondary-button" onClick={onClose}>
            Отмена
          </button>
          <button className="primary-button" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Сохраняю…"
              : `Создать ${mode === "task" ? "задачу" : "проект"}`}
          </button>
        </footer>
      </form>
    </div>
  );
}

function BlockerPanel({ task, scopeId, taskId, refresh }) {
  const [creating, setCreating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [form, setForm] = useState({
    reason: "",
    resolution_required: "",
    responsible_text: "",
    next_review_at: "",
  });
  const [resolutionNote, setResolutionNote] = useState("");
  const blockers = task.blockers ?? [];
  const active = blockers.find(
    (blocker) => blocker.is_active ?? !blocker.resolved_at,
  );
  const history = blockers.filter(
    (blocker) => !(blocker.is_active ?? !blocker.resolved_at),
  );
  const block = useMutation({
    mutationFn: () =>
      taskApi.createBlocker(scopeId, taskId, {
        ...form,
        next_review_at: form.next_review_at || null,
      }),
    onSuccess: () => {
      setCreating(false);
      setForm({
        reason: "",
        resolution_required: "",
        responsible_text: "",
        next_review_at: "",
      });
      refresh();
    },
  });
  const resolve = useMutation({
    mutationFn: () =>
      taskApi.resolveBlocker(scopeId, taskId, active.id, resolutionNote),
    onSuccess: () => {
      setResolving(false);
      setResolutionNote("");
      refresh();
    },
  });
  const set = (key) => (event) =>
    setForm((value) => ({ ...value, [key]: event.target.value }));
  if (!active && !creating)
    return (
      <section className="blocker-panel blocker-panel--empty">
        <button onClick={() => setCreating(true)}>
          <IconAlertTriangle size={16} />
          Установить блокировку
        </button>
        {history.length > 0 && (
          <details>
            <summary>История блокировок · {history.length}</summary>
            <BlockerHistory blockers={history} />
          </details>
        )}
      </section>
    );
  if (creating)
    return (
      <section className="blocker-panel blocker-form">
        <header>
          <span>
            <IconAlertTriangle size={17} />
            Новая блокировка
          </span>
          <button className="icon-button" onClick={() => setCreating(false)}>
            <IconX size={16} />
          </button>
        </header>
        <label>
          Почему работа невозможна
          <textarea
            value={form.reason}
            onChange={set("reason")}
            rows="2"
            placeholder="Нет административного доступа к 1С"
          />
        </label>
        <label>
          Что требуется для продолжения
          <textarea
            value={form.resolution_required}
            onChange={set("resolution_required")}
            rows="2"
            placeholder="Предоставить доступ или назначить уполномоченного специалиста"
          />
        </label>
        <div className="blocker-form-row">
          <label>
            Кто должен решить
            <input
              value={form.responsible_text}
              onChange={set("responsible_text")}
              placeholder="Системный администратор"
            />
          </label>
          <label>
            Проверить снова
            <input
              type="datetime-local"
              value={form.next_review_at}
              onChange={set("next_review_at")}
            />
          </label>
        </div>
        {block.error && <p className="form-error">{block.error.message}</p>}
        <footer>
          <button
            className="danger-button"
            disabled={
              block.isPending ||
              !form.reason.trim() ||
              !form.resolution_required.trim() ||
              !form.responsible_text.trim()
            }
            onClick={() => block.mutate()}
          >
            Зафиксировать блокировку
          </button>
        </footer>
      </section>
    );
  return (
    <section className="blocker-panel blocker-panel--active">
      <header>
        <span>
          <IconAlertTriangle size={17} />
          Задача заблокирована
        </span>
        <time>{new Date(active.blocked_at).toLocaleString()}</time>
      </header>
      <dl>
        <div>
          <dt>Причина</dt>
          <dd>{active.reason}</dd>
        </div>
        <div>
          <dt>Для продолжения</dt>
          <dd>{active.resolution_required}</dd>
        </div>
        <div>
          <dt>Ответственный</dt>
          <dd>{active.responsible_user?.name ?? active.responsible_text}</dd>
        </div>
        {active.next_review_at && (
          <div>
            <dt>Следующая проверка</dt>
            <dd>{new Date(active.next_review_at).toLocaleString()}</dd>
          </div>
        )}
      </dl>
      <small>Зафиксировал: {active.blocked_by?.name ?? "—"}</small>
      {resolving ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (resolutionNote.trim()) resolve.mutate();
          }}
        >
          <textarea
            autoFocus
            rows="2"
            value={resolutionNote}
            onChange={(event) => setResolutionNote(event.target.value)}
            placeholder="Как именно блокировка была устранена?"
          />
          {resolve.error && (
            <p className="form-error">{resolve.error.message}</p>
          )}
          <div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setResolving(false)}
            >
              Отмена
            </button>
            <button
              className="primary-button"
              disabled={!resolutionNote.trim() || resolve.isPending}
            >
              Снять блокировку
            </button>
          </div>
        </form>
      ) : (
        <button className="unblock-button" onClick={() => setResolving(true)}>
          <IconLockOpen size={16} />
          Снять блокировку
        </button>
      )}
      {history.length > 0 && (
        <details>
          <summary>Предыдущие блокировки · {history.length}</summary>
          <BlockerHistory blockers={history} />
        </details>
      )}
    </section>
  );
}

function BlockerHistory({ blockers }) {
  return (
    <div className="blocker-history">
      {blockers.map((blocker) => (
        <article key={blocker.id}>
          <strong>{blocker.reason}</strong>
          <small>
            {new Date(blocker.blocked_at).toLocaleString()} —{" "}
            {new Date(blocker.resolved_at).toLocaleString()}
          </small>
          <span>{blocker.resolution_note}</span>
        </article>
      ))}
    </div>
  );
}

function SubtasksPanel({ task, scopeId, refresh }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const children = task.children ?? [];
  const create = useMutation({
    mutationFn: () =>
      taskApi.create(scopeId, {
        title,
        parent_id: task.id,
        project_id: task.project_id ?? null,
      }),
    onSuccess: () => {
      setTitle("");
      refresh();
    },
  });

  if (task.parent_id) return null;
  return (
    <section className="subtasks">
      <header>
        <span>
          <IconSubtask size={18} />
          Подзадачи
        </span>
        <small>
          {children.filter((child) => child.status === "done").length}/
          {children.length}
        </small>
      </header>
      <div>
        {children.map((child) => (
          <button key={child.id} onClick={() => navigate(`/tasks/${child.id}`)}>
            <code>{child.task_key}</code>
            <strong>{child.title}</strong>
            <span>{statusLabel(child.status)}</span>
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim()) create.mutate();
        }}
      >
        <IconPlus size={17} />
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Добавить настоящую подзадачу…"
        />
        <button disabled={!title.trim() || create.isPending}>Добавить</button>
      </form>
      {create.error && <p className="form-error">{create.error.message}</p>}
    </section>
  );
}

function statusLabel(status) {
  return (
    {
      todo: "К выполнению",
      in_progress: "В работе",
      blocked: "Заблокировано",
      review: "На проверке",
      done: "Готово",
    }[status] ?? status
  );
}

const relationLabels = {
  blocks: "Блокирует",
  blocked_by: "Заблокирована задачей",
  related: "Связана",
  duplicate: "Дубликат",
};

function RelationsPanel({ task, scopeId }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [relation, setRelation] = useState("related");
  const relationsKey = ["task-relations", scopeId, task.id];
  const { data: relations = [] } = useQuery({
    queryKey: relationsKey,
    queryFn: () => taskApi.relations(scopeId, task.id),
  });
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["task-search", scopeId, search],
    queryFn: () => taskApi.search(scopeId, search),
    enabled: search.trim().length >= 2,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: relationsKey });
  const add = useMutation({
    mutationFn: (other) =>
      taskApi.createRelation(scopeId, task.id, other.task_key, relation),
    onSuccess: () => {
      setAdding(false);
      setSearch("");
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (linkId) => taskApi.deleteRelation(scopeId, task.id, linkId),
    onSuccess: refresh,
  });

  return (
    <section className="relations-panel">
      <header>
        <span>
          <IconLink size={18} />
          Связи
        </span>
        <small>{relations.length}</small>
      </header>
      <div className="relation-list">
        {relations.map((item) => (
          <article key={item.id}>
            <span>{relationLabels[item.relation] ?? item.relation}</span>
            <code>{item.task?.task_key}</code>
            <strong>{item.task?.title ?? "Удалённая задача"}</strong>
            <button
              title="Удалить связь"
              onClick={() => remove.mutate(item.id)}
              disabled={remove.isPending}
            >
              <IconTrash size={14} />
            </button>
          </article>
        ))}
      </div>
      {adding ? (
        <div className="relation-create">
          <div>
            <select
              value={relation}
              onChange={(event) => setRelation(event.target.value)}
            >
              {Object.entries(relationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ADM-154 или название"
            />
            <button className="icon-button" onClick={() => setAdding(false)}>
              <IconX size={15} />
            </button>
          </div>
          {search.trim().length >= 2 && (
            <div className="relation-results">
              {isFetching && <small>Ищу…</small>}
              {results
                .filter((result) => result.id !== task.id)
                .map((result) => (
                  <button key={result.id} onClick={() => add.mutate(result)}>
                    <code>{result.task_key}</code>
                    <span>{result.title}</span>
                  </button>
                ))}
            </div>
          )}
          {add.error && <p className="form-error">{add.error.message}</p>}
        </div>
      ) : (
        <button className="add-relation" onClick={() => setAdding(true)}>
          <IconPlus size={16} />
          Добавить связь
        </button>
      )}
    </section>
  );
}

function TaskInspector({ scopeId, taskId, projects, onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pane, setPane] = useState("description");
  const [creatingResult, setCreatingResult] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const queryKey = ["task", scopeId, taskId];
  const {
    data: task,
    isLoading,
    error,
  } = useQuery({ queryKey, queryFn: () => taskApi.get(scopeId, taskId) });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["tasks", scopeId] });
  };
  const save = useMutation({
    mutationFn: (payload) => taskApi.update(scopeId, taskId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey: ["tasks", scopeId] });
    },
  });
  const addItem = useMutation({
    mutationFn: () => taskApi.createChecklistItem(scopeId, taskId, itemTitle),
    onSuccess: () => {
      setItemTitle("");
      refresh();
    },
  });
  const toggleItem = useMutation({
    mutationFn: ({ item, completed }) =>
      taskApi.setChecklistItemCompleted(scopeId, taskId, item.id, completed),
    onSuccess: refresh,
  });
  const convertItem = useMutation({
    mutationFn: (itemId) =>
      taskApi.convertChecklistItem(scopeId, taskId, itemId),
    onSuccess: refresh,
  });
  const detach = useMutation({
    mutationFn: () => taskApi.detach(scopeId, taskId),
    onSuccess: refresh,
  });
  if (isLoading)
    return (
      <aside className="task-inspector">
        <div className="inspector-state">Открываю задачу…</div>
      </aside>
    );
  if (error)
    return (
      <aside className="task-inspector">
        <button className="inspector-close" onClick={onClose}>
          <IconX />
        </button>
        <div className="inspector-state form-error">{error.message}</div>
      </aside>
    );
  const items = task.checklist_items ?? [];
  const hasStoredResult = Boolean(task.result?.trim());
  const hasResult = hasStoredResult || creatingResult;
  const activePane = pane === "result" && hasResult ? "result" : "description";
  return (
    <aside className="task-inspector">
      <header className="inspector-header">
        <code>{task.task_key}</code>
        <div>
          <button
            type="button"
            className="open-editor"
            title="Открыть задачу в полноэкранном редакторе"
            onClick={() => navigate(`/tasks/${task.id}/edit`)}
          >
            <IconArrowsMaximize size={16} />
            Открыть полный редактор
          </button>
          {task.parent_id && (
            <button
              className="detach-task"
              onClick={() => detach.mutate()}
              disabled={detach.isPending}
            >
              <IconArrowUpRight size={16} />
              Выделить в задачу
            </button>
          )}
          <button className="icon-button" onClick={onClose}>
            <IconX size={19} />
          </button>
        </div>
      </header>
      <input
        className="inspector-title"
        value={task.title}
        onChange={(event) =>
          queryClient.setQueryData(queryKey, {
            ...task,
            title: event.target.value,
          })
        }
        onBlur={(event) => save.mutate({ title: event.target.value })}
      />
      <div className="task-properties">
        <label>
          Статус
          <select
            value={task.status}
            disabled={task.status === "blocked"}
            onChange={(event) => save.mutate({ status: event.target.value })}
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
      <BlockerPanel
        task={task}
        scopeId={scopeId}
        taskId={taskId}
        refresh={refresh}
      />
      <nav className="content-switch">
        <button
          className={activePane === "description" ? "active" : ""}
          onClick={() => setPane("description")}
        >
          <IconFileDescription size={18} />
          Описание
        </button>
        {hasResult ? (
          <button
            className={activePane === "result" ? "active" : ""}
            onClick={() => setPane("result")}
          >
            <IconTargetArrow size={18} />
            Результат
          </button>
        ) : (
          <button
            className="add-result"
            onClick={() => {
              setCreatingResult(true);
              setPane("result");
            }}
          >
            <IconPlus size={16} />
            Добавить результат
          </button>
        )}
      </nav>
      <Suspense fallback={<div className="md-loading">Загружаю Markdown…</div>}>
        <CompactMarkdownEditor
          key={activePane}
          value={task[activePane]}
          hideToolbarTrigger={!hasResult}
          placeholder={
            activePane === "result"
              ? "Фактический результат…"
              : "Добавьте описание задачи…"
          }
          onSave={(markdown) => {
            save.mutate({ [activePane]: markdown });
            if (activePane === "result" && !markdown) {
              setCreatingResult(false);
              setPane("description");
            }
          }}
        />
      </Suspense>
      <section className="checklist">
        <header>
          <span>
            <IconChecklist size={18} />
            Чек-лист
          </span>
          <small>
            {items.filter((item) => item.completed_at).length}/{items.length}
          </small>
        </header>
        <div>
          {items.map((item) => (
            <label
              className={item.completed_at ? "completed" : ""}
              key={item.id}
            >
              <input
                type="checkbox"
                checked={Boolean(item.completed_at)}
                onChange={(event) =>
                  toggleItem.mutate({ item, completed: event.target.checked })
                }
              />
              <span>
                <strong>{item.title}</strong>
                {item.completed_at && (
                  <small>
                    <IconCheck size={12} />
                    {item.completed_by?.name ?? "Выполнено"} ·{" "}
                    {new Date(item.completed_at).toLocaleString()}
                  </small>
                )}
              </span>
              {!task.parent_id && (
                <button
                  className="convert-item"
                  title="Преобразовать в подзадачу"
                  onClick={(event) => {
                    event.preventDefault();
                    convertItem.mutate(item.id);
                  }}
                  disabled={convertItem.isPending}
                >
                  <IconSubtask size={15} />
                </button>
              )}
            </label>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (itemTitle.trim()) addItem.mutate();
          }}
        >
          <IconPlus size={17} />
          <input
            value={itemTitle}
            onChange={(event) => setItemTitle(event.target.value)}
            placeholder="Добавить пункт…"
          />
          <button disabled={!itemTitle.trim() || addItem.isPending}>
            Добавить
          </button>
        </form>
      </section>
      <SubtasksPanel task={task} scopeId={scopeId} refresh={refresh} />
      <RelationsPanel task={task} scopeId={scopeId} />
      {(convertItem.error || detach.error) && (
        <p className="form-error">
          {convertItem.error?.message ?? detach.error?.message}
        </p>
      )}
      {save.error && <p className="form-error">{save.error.message}</p>}
    </aside>
  );
}

export function TaskerPage() {
  const { activeScope } = useWorkspace();
  const queryClient = useQueryClient();
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState("board");
  const [create, setCreate] = useState(null);
  const [search, setSearch] = useState("");
  const {
    data: tasks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tasks", activeScope?.id],
    queryFn: () => taskApi.list(activeScope.id),
    enabled: Boolean(activeScope),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", activeScope?.id],
    queryFn: () => projectApi.list(activeScope.id),
    enabled: Boolean(activeScope),
  });
  const moveTask = useMutation({
    mutationFn: ({ taskId: movedTaskId, status, targetIndex }) =>
      taskApi.move(activeScope.id, movedTaskId, status, targetIndex),
    onMutate: async ({ taskId: movedTaskId, status, targetIndex }) => {
      const key = ["tasks", activeScope.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (current = []) => {
        const moved = current.find((task) => task.id === movedTaskId);
        if (!moved || moved.status === "blocked") return current;
        const target = current
          .filter((task) => task.id !== movedTaskId && task.status === status)
          .sort((a, b) => a.sort_order - b.sort_order);
        target.splice(Math.min(targetIndex, target.length), 0, {
          ...moved,
          status,
        });
        const positions = new Map(
          target.map((task, index) => [task.id, (index + 1) * 1000]),
        );
        return current.map((task) =>
          task.id === movedTaskId
            ? { ...task, status, sort_order: positions.get(task.id) }
            : positions.has(task.id)
              ? { ...task, sort_order: positions.get(task.id) }
              : task,
        );
      });
      return { previous, key };
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(context.key, context.previous),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["tasks", activeScope.id] }),
  });
  const filtered = tasks.filter((task) =>
    `${task.task_key} ${task.title}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const open = (task) => navigate(`/tasks/${task.id}`);
  const move = (movedTaskId, status, targetIndex) => {
    if (movedTaskId)
      moveTask.mutate({ taskId: movedTaskId, status, targetIndex });
  };
  return (
    <main className="tasker-page">
      <header className="tasker-toolbar">
        <h1>Задачи</h1>
        <div className="view-switch">
          <button
            className={view === "board" ? "active" : ""}
            onClick={() => setView("board")}
          >
            <IconColumns size={17} />
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            <IconList size={17} />
          </button>
        </div>
        <span className="project-count">Проектов: {projects.length}</span>
        <label className="task-search">
          <IconSearch size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по ключу или названию"
          />
        </label>
        <button
          className="new-task"
          onClick={() => setCreate({ status: "todo" })}
        >
          <IconPlus size={17} />
          Новая задача
        </button>
      </header>
      {!activeScope && (
        <div className="tasker-state">Создайте или выберите скоуп.</div>
      )}
      {isLoading && <div className="tasker-state">Загружаю задачи…</div>}
      {error && (
        <div className="tasker-state tasker-state--error">{error.message}</div>
      )}
      {activeScope && !isLoading && !error && view === "board" && (
        <section className="task-board">
          {columns.map((column) => {
            const status = column.statuses[0];
            const items = filtered
              .filter((task) => column.statuses.includes(task.status))
              .sort((a, b) => a.sort_order - b.sort_order);
            const movableCount = items.filter(
              (task) => task.status === status,
            ).length;
            return (
              <section
                className="task-column"
                key={column.label}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  move(
                    event.dataTransfer.getData("text/task-id"),
                    status,
                    movableCount,
                  );
                }}
              >
                <header>
                  <span>{column.label}</span>
                  <small>{items.length}</small>
                </header>
                <div>
                  {items.map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      status={status}
                      index={
                        items
                          .slice(0, index)
                          .filter((item) => item.status === status).length
                      }
                      onMove={move}
                      onOpen={() => open(task)}
                      onEdit={() => navigate(`/tasks/${task.id}/edit`)}
                    />
                  ))}
                </div>
                <button onClick={() => setCreate({ status })}>
                  <IconPlus size={16} />
                  Добавить
                </button>
              </section>
            );
          })}
        </section>
      )}
      {activeScope && !isLoading && !error && view === "list" && (
        <section className="task-list">
          <header>
            <span>Статус</span>
            <span>Ключ и название</span>
            <span>Проект</span>
            <span>Исполнитель</span>
            <span>Приоритет</span>
            <span>Срок</span>
          </header>
          {filtered.map((task) => (
            <button key={task.id} onClick={() => open(task)}>
              <span>
                {columns.find((column) => column.statuses.includes(task.status))
                  ?.label ?? task.status}
              </span>
              <strong>
                <code>{taskReference(task)}</code>
                {task.title}
              </strong>
              <span>{task.project?.title ?? "—"}</span>
              <span>{task.assignee?.name ?? "Не назначен"}</span>
              <span>{priorityLabel(task.priority)}</span>
              <time>
                {task.due_at ? new Date(task.due_at).toLocaleDateString() : "—"}
              </time>
            </button>
          ))}
        </section>
      )}
      {create && activeScope && (
        <CreateDialog
          scopeId={activeScope.id}
          projects={projects}
          initialStatus={create.status}
          onClose={() => setCreate(null)}
        />
      )}{" "}
      {taskId && activeScope && (
        <>
          <div
            className="inspector-backdrop"
            onClick={() => navigate("/tasks")}
          />
          <TaskInspector
            scopeId={activeScope.id}
            taskId={taskId}
            projects={projects}
            onClose={() => navigate("/tasks")}
          />
        </>
      )}
    </main>
  );
}
