import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconChevronDown, IconChevronRight, IconFolder, IconPlus, IconSettings, IconTrash, IconX } from '@tabler/icons-react';
import { structureApi } from '../../entities/content-navigation/structureApi';
import { descendantsOf, sectionChoices, sectionTree } from '../../entities/content-navigation/structure';
import './ContentStructure.css';

export function StructureFields({ value, onChange, catalog = {}, disabled = false }) {
  const sections = sectionChoices(catalog.sections || [], value.section_id);
  const categories = (catalog.categories || []).filter((row) => !row.is_archived || row.id === value.category_id);
  return <div className="content-structure-fields">
    <label>Секция<select aria-label="Секция" disabled={disabled} value={value.section_id || ''} onChange={(event) => onChange({ section_id: event.target.value || null })}><option value="">Без секции</option>{value.section_id && !sections.some((row) => row.id === value.section_id) && <option value={value.section_id}>Текущая секция недоступна</option>}{sections.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>
    <label>Категория<select aria-label="Категория" disabled={disabled} value={value.category_id || ''} onChange={(event) => onChange({ category_id: event.target.value || null })}><option value="">Без категории</option>{value.category_id && !categories.some((row) => row.id === value.category_id) && <option value={value.category_id}>Текущая категория недоступна</option>}{categories.map((row) => <option key={row.id} value={row.id}>{row.name}{row.is_archived ? ' (архив)' : ''}</option>)}</select></label>
  </div>;
}

export function ContentStructureNav({ catalog = {}, value, onChange, onManage }) {
  const [collapsed, setCollapsed] = useState(new Set());
  const [archive, setArchive] = useState(false);
  const rows = sectionTree(catalog.sections || []);
  const hidden = new Set();
  for (const id of collapsed) for (const descendant of descendantsOf(rows, id)) if (descendant !== id) hidden.add(descendant);
  const toggle = (id) => setCollapsed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return <nav className="content-structure-nav" aria-label="Секции контента"><header><strong>Секции</strong>{onManage && <button title="Секции и категории" aria-label="Секции и категории" onClick={onManage}><IconSettings size={15}/></button>}</header>
    <button className={value === '' ? 'active' : ''} onClick={() => onChange('')}>Все записи</button>
    <button className={value === 'none' ? 'active' : ''} onClick={() => onChange('none')}>Без секции</button>
    <div className="content-section-tree">{rows.filter((row) => !hidden.has(row.id) && (archive || !row.archived || row.id === value)).map((row) => <div key={row.id} style={{ '--section-depth': row.depth }} className={`${value === row.id ? 'active' : ''} ${row.archived ? 'is-archived' : ''}`}>
      <button className="section-expand" disabled={!row.hasChildren} aria-label={`${collapsed.has(row.id) ? 'Развернуть' : 'Свернуть'} ${row.name}`} onClick={() => toggle(row.id)}>{row.hasChildren && (collapsed.has(row.id) ? <IconChevronRight size={13}/> : <IconChevronDown size={13}/>)}</button>
      <button className="section-name" title={row.name} onClick={() => onChange(row.id)}><IconFolder size={14} style={{ color: row.color || '#77859a' }}/><span>{row.name}</span></button>
    </div>)}</div>
    {rows.some((row) => row.archived) && <button className="structure-archive-toggle" onClick={() => setArchive(!archive)}>{archive ? 'Скрыть архив' : 'Показать архив'}</button>}
  </nav>;
}

export function ContentStructureManager({ scopeId, module, catalog = {}, onClose }) {
  const client = useQueryClient();
  const [kind, setKind] = useState('sections');
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(false);
  const rows = kind === 'sections' ? sectionTree(catalog.sections || []) : catalog.categories || [];
  const refresh = () => client.invalidateQueries({ queryKey: ['content-structure', scopeId] });
  return <div className="content-structure-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label="Секции и категории" className="content-structure-manager">
    <header><div><strong>Секции и категории</strong><small>Общие для Ивентора и Лайтбука. Доступ к записям не меняют.</small></div><button aria-label="Закрыть" onClick={onClose}><IconX size={19}/></button></header>
    <nav>{[['sections', 'Секции-папки'], ['categories', 'Категории']].map(([id, label]) => <button key={id} className={kind === id ? 'active' : ''} onClick={() => { setKind(id); setEditing(null); setSaved(false); }}>{label}</button>)}</nav>
    <div className="structure-manager-body"><aside>{catalog.can_create && <button className="structure-create" onClick={() => { setEditing(null); setSaved(false); }}><IconPlus size={15}/>Создать {kind === 'sections' ? 'секцию' : 'категорию'}</button>}{rows.map((row) => <button key={row.id} style={{ paddingLeft: 8 + (row.depth || 0) * 12 }} className={editing?.id === row.id ? 'active' : ''} onClick={() => { setEditing(row); setSaved(false); }}><i style={{ background: row.color || '#8a98ad' }}/><span>{row.name}</span>{row.is_archived && <small>архив</small>}</button>)}{!rows.length && <p>Пока пусто.</p>}</aside>
    {editing || catalog.can_create ? <StructureForm key={`${kind}:${editing?.id || 'new'}:${editing?.revision || 0}`} scopeId={scopeId} module={module} kind={kind} initial={editing} catalog={catalog} saved={saved}
      onSaved={async (record) => { await refresh(); const current = client.getQueryData(['content-structure', scopeId, module]); setEditing(current?.[kind]?.find((row) => row.id === record.id) || { ...record, can_manage: false }); setSaved(true); }} onRemoved={async () => { await refresh(); setEditing(null); setSaved(false); }}/>
      : <p className="structure-readonly">Выберите запись для просмотра. Для создания нужны права записи в модуле.</p>}</div>
  </section></div>;
}

function StructureForm({ scopeId, module, kind, initial, catalog, onSaved, onRemoved, saved }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState({ name: initial?.name || '', description: initial?.description || '', color: initial?.color?.slice(0, 7) || '#74859d',
    parent_id: initial?.parent_id || '', visibility: initial?.visibility || 'scope', sort_order: initial?.sort_order || 0, is_archived: initial?.is_archived || false });
  const editable = initial ? initial.can_manage : catalog.can_create;
  const save = useMutation({ mutationFn: () => {
    const { parent_id, visibility, ...common } = draft;
    return structureApi.save(scopeId, module, kind, initial?.id, { ...common, sort_order: Number(common.sort_order),
      ...(kind === 'sections' ? { parent_id: parent_id || null, visibility } : {}), ...(initial ? { revision: initial.revision } : {}) });
  }, onSuccess: onSaved });
  const remove = useMutation({ mutationFn: () => structureApi.remove(scopeId, module, kind, initial.id, initial.revision), onSuccess: onRemoved });
  const set = (field) => (event) => setDraft((current) => ({ ...current, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const parentChoices = sectionChoices(catalog.sections || [], draft.parent_id, initial?.id);
  return <form className="content-structure-form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><fieldset disabled={!editable || save.isPending || remove.isPending}>
    <legend>{initial ? 'Свойства' : 'Новая запись'}</legend><label>Название<input autoFocus required maxLength={96} value={draft.name} onChange={set('name')}/></label>
    {kind === 'sections' && <><label>Родительская секция<select value={draft.parent_id} onChange={set('parent_id')}><option value="">В корне</option>{parentChoices.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label><label>Видимость названия папки<select value={draft.visibility} onChange={set('visibility')}><option value="scope">В скоупе</option><option value="private">Только создатель и владелец</option>{draft.visibility === 'public' && <option value="public">В скоупе (прежняя публичная)</option>}</select></label></>}
    <div className="structure-field-row"><label>Цвет<input type="color" value={draft.color} onChange={set('color')}/></label><label>Порядок<input type="number" min={0} max={1000000} value={draft.sort_order} onChange={set('sort_order')}/></label></div>
    <label>Описание<textarea rows={3} maxLength={255} value={draft.description} onChange={set('description')}/></label><label className="structure-check"><input type="checkbox" checked={draft.is_archived} onChange={set('is_archived')}/>В архиве</label>
  </fieldset>{!editable && <p>Изменять может создатель или владелец скоупа с правом записи.</p>}{saved && !save.error && <p className="structure-saved" role="status">Сохранено</p>}{(save.error || remove.error) && <p role="alert" className="structure-error">{save.error?.message || remove.error?.message}</p>}
    {save.error?.status === 409 && <button type="button" onClick={() => client.invalidateQueries({ queryKey: ['content-structure', scopeId] })}>Обновить список и выбрать запись заново</button>}
    <footer>{initial && editable && <button type="button" className="structure-delete" disabled={remove.isPending || save.isPending} onClick={() => window.confirm('Удалить пустую запись справочника? Заполненную можно только архивировать или сначала освободить.') && remove.mutate()}><IconTrash size={14}/>Удалить</button>}<span/>{editable && <button type="submit" className="structure-primary" disabled={save.isPending || remove.isPending}>{save.isPending ? 'Сохраняю…' : 'Сохранить'}</button>}</footer>
  </form>;
}
