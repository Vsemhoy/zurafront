import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconCheck,
  IconChecklist,
  IconLink,
  IconLockOpen,
  IconPlus,
  IconSubtask,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { taskApi } from "../entities/task/api";
import "./TaskerPage.css";
import "./Subtasks.css";
import "./Relations.css";

export function BlockerPanel({ task, scopeId, taskId, refresh }) {
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
          {resolve.error && <p className="form-error">{resolve.error.message}</p>}
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

export function TaskChecklistPanel({ task, scopeId, refresh }) {
  const [title, setTitle] = useState("");
  const items = task.checklist_items ?? [];
  const add = useMutation({
    mutationFn: () => taskApi.createChecklistItem(scopeId, task.id, title),
    onSuccess: () => {
      setTitle("");
      refresh();
    },
  });
  const toggle = useMutation({
    mutationFn: ({ item, completed }) =>
      taskApi.setChecklistItemCompleted(scopeId, task.id, item.id, completed),
    onSuccess: refresh,
  });
  const convert = useMutation({
    mutationFn: (itemId) =>
      taskApi.convertChecklistItem(scopeId, task.id, itemId),
    onSuccess: refresh,
  });

  return (
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
          <label className={item.completed_at ? "completed" : ""} key={item.id}>
            <input
              type="checkbox"
              checked={Boolean(item.completed_at)}
              onChange={(event) =>
                toggle.mutate({ item, completed: event.target.checked })
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
                  convert.mutate(item.id);
                }}
                disabled={convert.isPending}
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
          if (title.trim()) add.mutate();
        }}
      >
        <IconPlus size={17} />
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Добавить пункт…"
        />
        <button disabled={!title.trim() || add.isPending}>Добавить</button>
      </form>
      {(add.error || convert.error) && (
        <p className="form-error">{add.error?.message ?? convert.error?.message}</p>
      )}
    </section>
  );
}

export function SubtasksPanel({ task, scopeId, refresh }) {
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
      scheduled: "Запланировано",
      todo: "К выполнению",
      in_progress: "В работе",
      blocked: "Заблокировано",
      review: "На проверке",
      done: "Готово",
      cancelled: "Удалено",
    }[status] ?? status
  );
}

const relationLabels = {
  blocks: "Блокирует",
  blocked_by: "Заблокирована задачей",
  related: "Связана",
  duplicate: "Дубликат",
};

export function RelationsPanel({ task, scopeId }) {
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
            <select value={relation} onChange={(event) => setRelation(event.target.value)}>
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
