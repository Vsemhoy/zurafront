import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconBook2, IconFolderPlus, IconGripVertical, IconLock, IconSearch, IconTrash, IconUsers, IconX } from "@tabler/icons-react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "../app/workspace";
import { bookApi } from "../entities/book/api";
import { projectApi } from "../entities/project/api";
import "./ProjectorPage.css";

const empty = { title: "", key: "", description: "", result: "", status: "planning", priority: 2, color: "#2668D8", visibility: "private", sort_order: 0 };

function creatorName(project) {
  return project.creator?.name ?? project.creator?.username ?? "Неизвестный автор";
}

function SortableProjectCard({ project, onOpen, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id, disabled });
  return (
    <article ref={setNodeRef} className={`projector-card ${isDragging ? "is-dragging" : ""}`} style={{ borderLeftColor: project.color, transform: CSS.Transform.toString(transform), transition }}>
      <button type="button" className="projector-card-open" onClick={() => onOpen(project.id)}>
        <header><code>{project.key}</code><span>{project.status}</span></header>
        <strong>{project.title}</strong>
        <p title={project.description ?? ""}>{project.description || "Описание проекта пока не задано."}</p>
        <footer>
          <span>{project.tasks_count ?? 0} задач</span>
          <span><IconBook2 size={13} />{project.books_count ?? 0} книг</span>
          <span title={creatorName(project)}>{creatorName(project)}</span>
          <span title={project.visibility === "private" ? "Только создатель" : "Участники скоупа"}>{project.visibility === "private" ? <IconLock size={13} /> : <IconUsers size={13} />}</span>
        </footer>
      </button>
      <button type="button" className="projector-drag-handle" title="Перетащить — порядок сохранится во всех списках" aria-label={`Изменить порядок проекта ${project.title}`} {...attributes} {...listeners}><IconGripVertical size={17} /></button>
    </article>
  );
}

export function ProjectorPage() {
  const { activeScope } = useWorkspace();
  const scopeId = activeScope?.id;
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [creatorId, setCreatorId] = useState("all");
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [projectOrder, setProjectOrder] = useState({ scopeId: null, ids: [] });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const { data: projects = [], isLoading, error } = useQuery({ queryKey: ["projects", scopeId], queryFn: () => projectApi.list(scopeId), enabled: Boolean(scopeId) });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["projects", scopeId] });
  const serverOrder = projects.map((project) => project.id);
  const orderedIds = projectOrder.scopeId === scopeId && projectOrder.ids.length === serverOrder.length && projectOrder.ids.every((id) => serverOrder.includes(id)) ? projectOrder.ids : serverOrder;
  const orderedProjects = useMemo(() => {
    const byId = new Map(projects.map((project) => [project.id, project]));
    return orderedIds.map((id) => byId.get(id)).filter(Boolean);
  }, [orderedIds, projects]);
  const creators = useMemo(() => {
    const unique = new Map();
    projects.forEach((project) => {
      if (project.created_by && project.creator) unique.set(project.created_by, creatorName(project));
    });
    return [...unique.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [projects]);
  const needle = search.trim().toLowerCase();
  const rows = orderedProjects.filter((project) => (creatorId === "all" || project.created_by === creatorId) && `${project.key} ${project.title} ${project.description ?? ""}`.toLowerCase().includes(needle));
  const reorder = useMutation({
    mutationFn: (ids) => projectApi.reorder(scopeId, ids),
    onSuccess: (saved) => {
      queryClient.setQueryData(["projects", scopeId], saved);
      setProjectOrder({ scopeId, ids: saved.map((project) => project.id) });
    },
    onError: () => setProjectOrder({ scopeId, ids: serverOrder }),
  });
  const dragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const visibleIds = rows.map((project) => project.id);
    const from = visibleIds.indexOf(active.id);
    const to = visibleIds.indexOf(over.id);
    if (from < 0 || to < 0) return;
    const movedVisible = arrayMove(visibleIds, from, to);
    const visibleSet = new Set(visibleIds);
    let visibleIndex = 0;
    const next = orderedIds.map((id) => visibleSet.has(id) ? movedVisible[visibleIndex++] : id);
    setProjectOrder({ scopeId, ids: next });
    reorder.mutate(next);
  };
  const selectedProjectId = selected ?? params.get("project");
  const closeEditor = () => {
    setCreating(false);
    setSelected(null);
    if (params.has("project")) {
      const next = new URLSearchParams(params);
      next.delete("project");
      setParams(next, { replace: true });
    }
  };

  return (
    <main className="projector-page">
      <header className="projector-toolbar">
        <div><small>Управление проектами</small><h1>Projector</h1></div>
        <label><IconSearch size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Проект или литерал…" /></label>
        <label className="projector-creator-filter"><span>Создатель</span><select value={creatorId} onChange={(event) => setCreatorId(event.target.value)}><option value="all">Все</option>{creators.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <button onClick={() => setCreating(true)}><IconFolderPlus size={17} />Новый проект</button>
      </header>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={rows.map((project) => project.id)} strategy={rectSortingStrategy}>
          <section className="projector-grid">{rows.map((project) => <SortableProjectCard key={project.id} project={project} onOpen={setSelected} disabled={reorder.isPending} />)}</section>
        </SortableContext>
      </DndContext>
      {reorder.isPending && <p className="projector-order-state">Сохраняю порядок…</p>}
      {reorder.error && <p className="projector-state error">{reorder.error.message}</p>}
      {isLoading && <p className="projector-state">Загружаю проекты…</p>}
      {error && <p className="projector-state error">{error.message}</p>}
      {!isLoading && !error && rows.length === 0 && <p className="projector-state">По этим фильтрам проектов нет.</p>}
      {(creating || selectedProjectId) && <ProjectEditor scopeId={scopeId} projectId={selectedProjectId} onClose={closeEditor} onSaved={refresh} />}
    </main>
  );
}

function ProjectEditor({ scopeId, projectId, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const { data: project } = useQuery({ queryKey: ["project", scopeId, projectId], queryFn: () => projectApi.get(scopeId, projectId), enabled: Boolean(projectId) });
  const { data: books = [] } = useQuery({ queryKey: ["books", scopeId], queryFn: () => bookApi.books(scopeId) });
  const [draft, setDraft] = useState(projectId ? null : empty);
  const form = draft ?? (project ? { ...empty, ...project } : null);
  const save = useMutation({ mutationFn: (payload) => projectId ? projectApi.update(scopeId, projectId, payload) : projectApi.create(scopeId, payload), onSuccess: (saved) => { queryClient.invalidateQueries({ queryKey: ["project", scopeId, projectId] }); onSaved(); if (!projectId) onClose(); else setDraft({ ...empty, ...saved }); } });
  const attach = useMutation({ mutationFn: ({ book, checked }) => bookApi.updateBook(scopeId, book.id, { project_id: checked ? projectId : null }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["books", scopeId] }); queryClient.invalidateQueries({ queryKey: ["project", scopeId, projectId] }); onSaved(); } });
  const remove = useMutation({ mutationFn: () => projectApi.remove(scopeId, projectId), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects", scopeId] }); queryClient.invalidateQueries({ queryKey: ["tasks", scopeId] }); queryClient.invalidateQueries({ queryKey: ["books", scopeId] }); onClose(); } });

  if (!form) return <aside className="projector-editor">Загружаю…</aside>;
  const set = (key) => (event) => setDraft({ ...form, [key]: event.target.value });
  const confirmDelete = () => { if (window.confirm(`Удалить проект ${form.key} · ${form.title}? Задачи и книги сохранятся без проекта.`)) remove.mutate(); };

  return <><div className="projector-backdrop" onClick={onClose} /><aside className="projector-editor">
    <header><div><small>{projectId ? form.key : "Новый"}</small><h2>{projectId ? "Редактор проекта" : "Создание проекта"}</h2></div><button onClick={onClose}><IconX size={18} /></button></header>
    <form onSubmit={(event) => { event.preventDefault(); save.mutate({ ...form, priority: Number(form.priority), sort_order: Number(form.sort_order), key: form.key.toUpperCase() }); }}>
      <label>Название<input autoFocus required value={form.title} onChange={set("title")} /></label>
      <label className="projector-privacy">Приватность<select value={form.visibility} onChange={set("visibility")}><option value="private">Только создатель</option><option value="scope">Участники скоупа с доступом к проекту</option></select><small>{form.visibility === "private" ? "Проект и его задачи скрыты от коллег." : "Проект и задачи видны участникам согласно их доступам."}</small></label>
      <div className="projector-form-grid"><label>Литерал<input required maxLength="12" value={form.key} disabled={Boolean(projectId)} onChange={set("key")} /></label><label>Цвет<input type="color" value={form.color} onChange={set("color")} /></label><label>Статус<select value={form.status} onChange={set("status")}><option value="planning">Планируется</option><option value="active">Активный</option><option value="on_hold">На паузе</option><option value="completed">Завершён</option><option value="archived">Архив</option></select></label><label>Приоритет<input type="number" min="1" max="5" value={form.priority} onChange={set("priority")} /></label></div>
      <label>Описание<textarea rows="4" value={form.description ?? ""} onChange={set("description")} /></label>
      <label>Результат<textarea rows="3" value={form.result ?? ""} onChange={set("result")} /></label>
      {projectId && <fieldset><legend>Книги проекта</legend>{books.map((book) => <label className="projector-book" key={book.id}><input type="checkbox" checked={book.project_id === projectId} onChange={(event) => attach.mutate({ book, checked: event.target.checked })} /><span>{book.title}</span>{book.project && book.project_id !== projectId && <small>сейчас: {book.project.key}</small>}</label>)}{!books.length && <p>Книг в скоупе пока нет.</p>}</fieldset>}
      {(save.error || remove.error) && <p className="error">{save.error?.message ?? remove.error?.message}</p>}
      <div className="projector-editor-actions">{projectId && <button type="button" className="projector-delete" disabled={remove.isPending} onClick={confirmDelete}><IconTrash size={16} />{remove.isPending ? "Удаляю…" : "Удалить проект"}</button>}<button className="projector-save" disabled={save.isPending}>{save.isPending ? "Сохраняю…" : "Сохранить"}</button></div>
    </form>
  </aside></>;
}
