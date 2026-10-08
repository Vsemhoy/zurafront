import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../app/workspace';
import { departmentApi } from '../entities/department/api';
import { contractorApi } from '../entities/contractor/api';
import './DepartmentsPage.css';
export function DepartmentsPage() {
  const { activeScope } = useWorkspace(); const scopeId = activeScope?.id;
  const client = useQueryClient(); const [editing, setEditing] = useState(null);
  const list = useQuery({ queryKey: ['departments', scopeId], queryFn: () => departmentApi.list(scopeId), enabled: Boolean(scopeId) });
  const people = useQuery({ queryKey: ['contractors-assignable', scopeId], queryFn: () => contractorApi.assignable(scopeId), enabled: Boolean(scopeId) });
  const refresh = () => { client.invalidateQueries({ queryKey: ['departments', scopeId] }); client.invalidateQueries({ queryKey: ['dashboard', scopeId] }); client.invalidateQueries({ queryKey: ['contractors', scopeId] }); };
  const remove = useMutation({ mutationFn: (id) => departmentApi.remove(scopeId, id), onSuccess: refresh });
  if (!scopeId) return <main>Выберите скоуп.</main>;
  return <main className="departments-page"><header><h1>Отделы</h1>{list.data?.can_manage && <button onClick={() => setEditing({ name: '', description: '', user_ids: [] })}>Новый отдел</button>}</header>
    <p>Отдел отвечает за задачи и проекты. Личные KPI настраиваются отдельно для каждого сотрудника.</p>
    {(list.error || remove.error) && <p role="alert">{(list.error || remove.error).message}</p>}
    {list.isLoading ? <p>Загружаю отделы…</p> : !list.data?.departments.length && <p>Отделов пока нет.</p>}
    <section className="department-cards">{list.data?.departments.map((department) => <article key={department.id}><h2>{department.name}</h2><p>{department.description}</p><ul>{department.members.map((member) => <li key={member.id}>{member.user?.name || 'Удалённый сотрудник'}</li>)}</ul>{!department.members.length && <p>Нет сотрудников</p>}{list.data.can_manage && <footer><button onClick={() => setEditing({ ...department, user_ids: department.members.map((member) => member.user_id) })}>Редактировать</button><button onClick={() => window.confirm(`Удалить пустой отдел «${department.name}»?`) && remove.mutate(department.id)} disabled={remove.isPending}>Удалить</button></footer>}</article>)}</section>
    {editing && <DepartmentEditor key={`${scopeId}:${editing.id || 'new'}`} scopeId={scopeId} department={editing} people={people.data?.people ?? []} departments={list.data?.departments ?? []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }}/>}</main>;
}
function DepartmentEditor({ scopeId, department, people, departments, onClose, onSaved }) {
  const [form, setForm] = useState(department);
  const save = useMutation({ mutationFn: async () => {
    const saved = await departmentApi.save(scopeId, form.id, form);
    return saved;
  }, onSuccess: onSaved });
  return <div className="department-backdrop"><form className="department-editor" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><h2>{form.id ? 'Редактор отдела' : 'Новый отдел'}</h2><label>Название<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><label>Описание<textarea value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })}/></label><fieldset><legend>Сотрудники</legend><p>Выбор сотрудника из другого отдела перенесёт его сюда.</p>{people.map((person) => { const old = departments.find((item) => item.members.some((member) => member.user_id === person.id)); return <label className="department-member" key={person.id}><input type="checkbox" checked={form.user_ids.includes(person.id)} onChange={(event) => setForm({ ...form, user_ids: event.target.checked ? [...form.user_ids, person.id] : form.user_ids.filter((id) => id !== person.id) })}/>{person.name}{old && ` · ${old.name}`}</label>; })}</fieldset>{save.error && <p role="alert">{save.error.message}</p>}<footer><button type="button" disabled={save.isPending} onClick={onClose}>Отмена</button><button disabled={save.isPending}>Сохранить</button></footer></form></div>;
}
