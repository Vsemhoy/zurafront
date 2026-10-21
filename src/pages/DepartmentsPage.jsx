import { departmentColors, departmentColor } from '../entities/department/colors';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../app/workspace';
import { departmentApi } from '../entities/department/api';
import { contractorApi } from '../entities/contractor/api';
import { departmentIconMaxBytes, normalizeDepartmentCode } from '../entities/department/model';
import { DepartmentIcon } from '../shared/ui/DepartmentIcon';
import './DepartmentsPage.css';
export function DepartmentsPage() {
  const { activeScope } = useWorkspace(); const scopeId = activeScope?.id;
  const client = useQueryClient(); const [editing, setEditing] = useState(null);
  const list = useQuery({ queryKey: ['departments', scopeId], queryFn: () => departmentApi.list(scopeId), enabled: Boolean(scopeId) });
  const people = useQuery({ queryKey: ['contractors-assignable', scopeId], queryFn: () => contractorApi.assignable(scopeId), enabled: Boolean(scopeId) });
  const refresh = () => { client.invalidateQueries({ queryKey: ['departments', scopeId] }); client.invalidateQueries({ queryKey: ['dashboard', scopeId] }); client.invalidateQueries({ queryKey: ['contractors', scopeId] }); client.invalidateQueries({ queryKey: ['tasks', scopeId] }); client.invalidateQueries({ queryKey: ['planner', scopeId] }); };
  const remove = useMutation({ mutationFn: (id) => departmentApi.remove(scopeId, id), onSuccess: refresh });
  if (!scopeId) return <main>Выберите скоуп.</main>;
  return <main className="departments-page"><header><h1>Отделы</h1>{list.data?.can_manage && <button onClick={() => setEditing({ name: '', code: '', icon_svg: '', description: '', color: '#c9f1d5', user_ids: [] })}>Новый отдел</button>}</header>
    <p>Отдел отвечает за задачи и проекты. Личные KPI настраиваются отдельно для каждого сотрудника.</p>
    {(list.error || remove.error) && <p role="alert">{(list.error || remove.error).message}</p>}
    {list.isLoading ? <p>Загружаю отделы…</p> : !list.data?.departments.length && <p>Отделов пока нет.</p>}
    <section className="department-cards">{list.data?.departments.map((department) => <article key={department.id} style={{ borderTop: `4px solid ${departmentColor(department)}` }}><header className="department-card-heading"><DepartmentIcon department={department}/><h2>{department.code && <code>{department.code}</code>}{department.name}</h2></header><p>{department.description}</p><ul>{department.members.map((member) => <li key={member.id}>{member.user?.name || 'Удалённый сотрудник'}</li>)}</ul>{!department.members.length && <p>Нет сотрудников</p>}{list.data.can_manage && <footer><button onClick={() => setEditing({ ...department, user_ids: department.members.map((member) => member.user_id) })}>Редактировать</button><button onClick={() => window.confirm(`Удалить пустой отдел «${department.name}»?`) && remove.mutate(department.id)} disabled={remove.isPending}>Удалить</button></footer>}</article>)}</section>
    {editing && <DepartmentEditor key={`${scopeId}:${editing.id || 'new'}`} scopeId={scopeId} department={editing} people={people.data?.people ?? []} departments={list.data?.departments ?? []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }}/>}</main>;
}
function DepartmentEditor({ scopeId, department, people, departments, onClose, onSaved }) {
  const [form, setForm] = useState(department);
  const [iconError, setIconError] = useState('');
  const save = useMutation({ mutationFn: async () => {
    const saved = await departmentApi.save(scopeId, form.id, { ...form, code: normalizeDepartmentCode(form.code) || null, icon_svg: form.icon_svg?.trim() || null });
    return saved;
  }, onSuccess: onSaved });
  const readIcon = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIconError('');
    if (file.size > departmentIconMaxBytes) { setIconError('SVG-иконка должна быть не больше 32 КБ.'); return; }
    try { const svg = await file.text(); setForm((current) => ({ ...current, icon_svg: svg })); }
    catch { setIconError('Не удалось прочитать SVG-файл.'); }
  };
  return <div className="department-backdrop"><form className="department-editor" role="dialog" aria-modal="true" aria-label={form.id ? 'Редактор отдела' : 'Новый отдел'} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    <h2>{form.id ? 'Редактор отдела' : 'Новый отдел'}</h2>
    <div className="department-identity-fields"><label>Название<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><label>Код · 3 символа<input minLength={3} maxLength={3} value={form.code || ''} pattern="[\p{L}\p{N}]{3}" placeholder="ИТД" autoCapitalize="characters" onChange={(event) => setForm({ ...form, code: normalizeDepartmentCode(event.target.value) })}/></label></div>
    <small>Код: три буквы или цифры, уникальные в этом скоупе. Например ИТД, ADM, WHS.</small>
    <label>Описание<textarea value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })}/></label>
    <fieldset className="department-icon-section"><legend>SVG-иконка отдела</legend><div className="department-icon-preview" style={{ backgroundColor: departmentColor(form) }}><DepartmentIcon department={form}/><span>{form.code || 'КОД'} · {form.name || 'Предпросмотр'}</span></div>
      <label>Исходник SVG<textarea rows={5} maxLength={departmentIconMaxBytes} spellCheck={false} value={form.icon_svg || ''} placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>'} onChange={(event) => { setIconError(''); setForm({ ...form, icon_svg: event.target.value }); }}/></label>
      <div className="department-icon-actions"><label>Загрузить .svg<input type="file" accept=".svg,image/svg+xml" onChange={readIcon}/></label><button type="button" disabled={!form.icon_svg} onClick={() => { setIconError(''); setForm({ ...form, icon_svg: '' }); }}>Убрать иконку</button></div>
      <small>До 32 КБ. Только статическая графика, без скриптов и внешних ресурсов.</small>{iconError && <p role="alert">{iconError}</p>}
    </fieldset>
    <fieldset className="department-palette"><legend>Цвет отдела</legend>{departmentColors.map(([color, label]) => <button type="button" key={color} aria-label={label} title={label} aria-pressed={(form.color || '#c9f1d5') === color} style={{ backgroundColor: color }} onClick={() => setForm({ ...form, color })}/>)}</fieldset>
    <fieldset><legend>Сотрудники</legend><p>Выбор сотрудника из другого отдела перенесёт его сюда.</p>{people.map((person) => { const old = departments.find((item) => item.members.some((member) => member.user_id === person.id)); return <label className="department-member" key={person.id}><input type="checkbox" checked={form.user_ids.includes(person.id)} onChange={(event) => setForm({ ...form, user_ids: event.target.checked ? [...form.user_ids, person.id] : form.user_ids.filter((id) => id !== person.id) })}/>{person.name}{old && ` · ${old.name}`}</label>; })}</fieldset>
    {save.error && <p role="alert">{save.error.message}</p>}<footer><button type="button" disabled={save.isPending} onClick={onClose}>Отмена</button><button disabled={save.isPending}>Сохранить</button></footer>
  </form></div>;
}
