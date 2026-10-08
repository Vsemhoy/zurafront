import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kpiApi } from '../entities/kpi/api';
import './KpiProfileEditor.css';
export function KpiProfileEditor({ scopeId, personId, month, people }) {
  const profile = useQuery({ queryKey: ['kpi-profile', scopeId, personId, month], queryFn: () => kpiApi.profile(scopeId, personId, month), enabled: Boolean(personId && month) });
  if (!personId) return <p>Выберите сотрудника для настройки личного KPI.</p>;
  if (profile.error) return <p role="alert">{profile.error.message}</p>;
  if (!profile.data) return <p>Загружаю профиль…</p>;
  return <ProfileForm key={`${scopeId}:${personId}:${month}:${profile.data.effective_month}`} profile={profile.data} scopeId={scopeId} personId={personId} month={month} people={people}/>;
}
function ProfileForm({ profile, scopeId, personId, month, people }) {
  const client = useQueryClient(); const [form, setForm] = useState({ effective_month: month, targets: profile.targets, items: profile.items });
  const [source, setSource] = useState('');
  const save = useMutation({ mutationFn: () => kpiApi.saveProfile(scopeId, personId, form), onSuccess: (saved) => { setForm({ effective_month: saved.effective_month, targets: saved.targets, items: saved.items }); client.invalidateQueries(); } });
  const copy = useMutation({ mutationFn: () => kpiApi.profile(scopeId, source, month), onSuccess: (data) => setForm((current) => ({ ...current, targets: data.targets, items: data.items })) });
  const canEdit = profile.can_manage && month >= new Date().toISOString().slice(0, 7);
  const field = (index, key, value) => setForm({ ...form, items: form.items.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  return <form className="kpi-profile" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><header><h2>Личный профиль KPI</h2><p>{profile.personal ? `Действует с ${profile.effective_month}` : 'Используются общие настройки. Сохранение создаст независимый личный профиль.'}</p><p>Настройки действуют с {month} и дальше до следующей версии. Прошедшие месяцы защищены.</p></header>
    <fieldset disabled={!canEdit || save.isPending || copy.isPending}>
      <div className="kpi-profile-copy"><label>Взять профиль коллеги<select value={source} onChange={(event) => setSource(event.target.value)}><option value="">Выберите сотрудника</option>{people.filter((person) => person.id !== personId).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><button type="button" disabled={!source} onClick={() => copy.mutate()}>Копировать в форму</button></div>
      <div className="kpi-profile-targets">{[['salary_target_points', 'Цель по окладу'], ['bonus_target_points', 'Цель по премии'], ['bonus_cap_percent', 'Потолок премии, %']].map(([key, label]) => <label key={key}>{label}<input type="number" required min={key === 'bonus_cap_percent' ? 0 : 1} max={key === 'bonus_cap_percent' ? 100 : 1000} value={form.targets[key]} onChange={(event) => setForm({ ...form, targets: { ...form.targets, [key]: Number(event.target.value) } })}/></label>)}</div>
      {form.items.map((item, index) => <article key={index}><label>Показатель<input required maxLength={255} value={item.name} onChange={(event) => field(index, 'name', event.target.value)}/></label><label>Описание<textarea value={item.description || ''} onChange={(event) => field(index, 'description', event.target.value)}/></label><div className="kpi-profile-targets"><label>Тип<select value={item.kind} onChange={(event) => field(index, 'kind', event.target.value)}><option value="bonus">Премия</option><option value="salary">Оклад</option></select></label><label>Баллы<input required type="number" min={0} max={1000} value={item.points} onChange={(event) => field(index, 'points', Number(event.target.value))}/></label><label>Задач для зачёта<input required type="number" min={1} max={1000} value={item.minimum_completed_tasks} onChange={(event) => field(index, 'minimum_completed_tasks', Number(event.target.value))}/></label></div><button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}>Убрать из профиля</button></article>)}
      <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { name: '', description: '', kind: 'bonus', points: 15, minimum_completed_tasks: 1, is_active: true }] })}>Добавить показатель</button>
      <button type="submit">{save.isPending ? 'Сохраняю…' : `Сохранить с ${month}`}</button>
    </fieldset>{(save.error || copy.error) && <p role="alert">{(save.error || copy.error).message}</p>}{save.isSuccess && <p role="status">Личный профиль сохранён.</p>}{!canEdit && <p>Изменение доступно управляющему сотрудниками для текущего и будущих месяцев.</p>}</form>;
}
