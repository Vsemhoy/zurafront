import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconBook2, IconFolderPlus, IconSearch, IconTrash, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { bookApi } from '../entities/book/api';
import { projectApi } from '../entities/project/api';
import './ProjectorPage.css';

const empty = { title: '', key: '', description: '', result: '', status: 'planning', priority: 2, color: '#2668D8', sort_order: 0 };

export function ProjectorPage() {
  const { activeScope } = useWorkspace();
  const scopeId = activeScope?.id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const { data: projects = [], isLoading, error } = useQuery({ queryKey: ['projects', scopeId], queryFn: () => projectApi.list(scopeId), enabled: Boolean(scopeId) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['projects', scopeId] });
  const rows = projects.filter((project) => `${project.key} ${project.title} ${project.description ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  return <main className="projector-page">
    <header className="projector-toolbar"><div><small>Управление проектами</small><h1>Projector</h1></div><label><IconSearch size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Проект или литерал…"/></label><button onClick={() => setCreating(true)}><IconFolderPlus size={17}/>Новый проект</button></header>
    <section className="projector-grid">{rows.map((project) => <button key={project.id} className="projector-card" style={{ borderLeftColor: project.color }} onDoubleClick={() => setSelected(project.id)} onClick={() => setSelected(project.id)}><header><code>{project.key}</code><span>{project.status}</span></header><strong>{project.title}</strong><p>{project.description || 'Описание проекта пока не задано.'}</p><footer><span>{project.tasks_count ?? 0} задач</span><span><IconBook2 size={13}/>{project.books_count ?? 0} книг</span></footer></button>)}</section>
    {isLoading && <p className="projector-state">Загружаю проекты…</p>}
    {error && <p className="projector-state error">{error.message}</p>}
    {(creating || selected) && <ProjectEditor scopeId={scopeId} projectId={selected} onClose={() => { setCreating(false); setSelected(null); }} onSaved={refresh}/>}
  </main>;
}

function ProjectEditor({ scopeId, projectId, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const { data: project } = useQuery({ queryKey: ['project', scopeId, projectId], queryFn: () => projectApi.get(scopeId, projectId), enabled: Boolean(projectId) });
  const { data: books = [] } = useQuery({ queryKey: ['books', scopeId], queryFn: () => bookApi.books(scopeId) });
  const [draft, setDraft] = useState(projectId ? null : empty);
  const form = draft ?? (project ? { ...empty, ...project } : null);
  const save = useMutation({ mutationFn: (payload) => projectId ? projectApi.update(scopeId, projectId, payload) : projectApi.create(scopeId, payload), onSuccess: (saved) => { queryClient.invalidateQueries({ queryKey: ['project', scopeId, projectId] }); onSaved(); if (!projectId) onClose(); else setDraft({ ...empty, ...saved }); } });
  const attach = useMutation({ mutationFn: ({ book, checked }) => bookApi.updateBook(scopeId, book.id, { project_id: checked ? projectId : null }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['books', scopeId] }); queryClient.invalidateQueries({ queryKey: ['project', scopeId, projectId] }); onSaved(); } });
  const remove = useMutation({ mutationFn: () => projectApi.remove(scopeId, projectId), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects', scopeId] }); queryClient.invalidateQueries({ queryKey: ['tasks', scopeId] }); queryClient.invalidateQueries({ queryKey: ['books', scopeId] }); onClose(); } });

  if (!form) return <aside className="projector-editor">Загружаю…</aside>;
  const set = (key) => (event) => setDraft({ ...form, [key]: event.target.value });
  const confirmDelete = () => { if (window.confirm(`Удалить проект ${form.key} · ${form.title}? Задачи и книги сохранятся без проекта.`)) remove.mutate(); };

  return <>
    <div className="projector-backdrop" onClick={onClose}/>
    <aside className="projector-editor">
      <header><div><small>{projectId ? form.key : 'Новый'}</small><h2>{projectId ? 'Редактор проекта' : 'Создание проекта'}</h2></div><button onClick={onClose}><IconX size={18}/></button></header>
      <form onSubmit={(event) => { event.preventDefault(); save.mutate({ ...form, priority: Number(form.priority), sort_order: Number(form.sort_order), key: form.key.toUpperCase() }); }}>
        <label>Название<input autoFocus required value={form.title} onChange={set('title')}/></label>
        <div className="projector-form-grid"><label>Литерал<input required maxLength="12" value={form.key} disabled={Boolean(projectId)} onChange={set('key')}/></label><label>Цвет<input type="color" value={form.color} onChange={set('color')}/></label><label>Статус<select value={form.status} onChange={set('status')}><option value="planning">Планируется</option><option value="active">Активный</option><option value="on_hold">На паузе</option><option value="completed">Завершён</option><option value="archived">Архив</option></select></label><label>Приоритет<input type="number" min="1" max="5" value={form.priority} onChange={set('priority')}/></label></div>
        <label>Описание<textarea rows="4" value={form.description ?? ''} onChange={set('description')}/></label>
        <label>Результат<textarea rows="3" value={form.result ?? ''} onChange={set('result')}/></label>
        {projectId && <fieldset><legend>Книги проекта</legend>{books.map((book) => <label className="projector-book" key={book.id}><input type="checkbox" checked={book.project_id === projectId} onChange={(event) => attach.mutate({ book, checked: event.target.checked })}/><span>{book.title}</span>{book.project && book.project_id !== projectId && <small>сейчас: {book.project.key}</small>}</label>)}{!books.length && <p>Книг в скоупе пока нет.</p>}</fieldset>}
        {(save.error || remove.error) && <p className="error">{save.error?.message ?? remove.error?.message}</p>}
        <div className="projector-editor-actions">{projectId && <button type="button" className="projector-delete" disabled={remove.isPending} onClick={confirmDelete}><IconTrash size={16}/>{remove.isPending ? 'Удаляю…' : 'Удалить проект'}</button>}<button className="projector-save" disabled={save.isPending}>{save.isPending ? 'Сохраняю…' : 'Сохранить'}</button></div>
      </form>
    </aside>
  </>;
}
