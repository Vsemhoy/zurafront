import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { IconBox, IconPlus, IconSearch, IconX, IconSettings, IconPhoto, IconFiles, IconHistory, IconPencil } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { equipApi } from '../entities/equip/api';
import { departmentLabel, departmentShortLabel } from '../entities/department/model';
import { conditions, suitability, ownerKinds, fieldLabels, newThing, thingPayload, ownerLabel, containerKinds, responsibilities, eventLabels } from '../entities/equip/model';
import { EquipLinks } from './EquipLinks';
import { EquipOperations, SupplierPicker } from './EquipOperations';
import { ExploitationPanel } from './ExploiterPage';
import { moduleEnabled } from '../entities/scope/modules';
import { EquipActionBoard, EquipActionItem } from './EquipExploitationDrag';
import { entryKinds, entryStatuses, entryPriorities } from '../entities/exploiter/model';
import { EquipPhoto, EquipTable, EquipViewControls } from './EquipRegistry';
import { useEquipColumns } from '../entities/equip/registry';
import { PhotoPanel } from '../shared/ui/PhotoPanel';
import { FilePanel } from './FilerPage';
import './EquipPage.css';

export function EquipPage() {
  const { activeScope } = useWorkspace();
  return activeScope ? <EquipWorkspace key={activeScope.id} scope={activeScope}/> : <main className="equip-page">Выберите организацию.</main>;
}

function EquipWorkspace({ scope }) {
  const [params, setParams] = useSearchParams();
  const [searchDraft, setSearchDraft] = useState(null);
  const [typeEditor, setTypeEditor] = useState(false);
  const [columns, setColumns] = useEquipColumns(scope.id);
  const view = params.get('view') === 'table' ? 'table' : 'cards';
  const sort = params.get('sort') || 'id';
  const direction = params.get('direction') === 'asc' ? 'asc' : 'desc';
  const client = useQueryClient();
  const options = useQuery({ queryKey: ['equip-options', scope.id], queryFn: () => equipApi.options(scope.id) });
  const filters = new URLSearchParams();
  for (const key of ['q', 'department_id', 'thing_type_id', 'condition', 'page', 'sort', 'direction']) {
    if (params.get(key)) filters.set(key, params.get(key));
  }
  const filterKey = filters.toString();
  const hasFilters = ['q', 'department_id', 'thing_type_id', 'condition'].some((key) => params.has(key));
  const list = useQuery({ queryKey: ['equip', scope.id, filterKey], queryFn: ({ signal }) => equipApi.list(scope.id, filterKey, signal), enabled: options.isSuccess });
  const selected = params.get('item');
  const urlSearch = params.get('q') || '';
  const search = searchDraft?.source === urlSearch ? searchDraft.value : urlSearch;
  const change = (key, value) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    if (value) next.set(key, value); else next.delete(key);
    if (key === 'item') next.delete('exploitation_kind');
    if (!['page', 'item', 'view'].includes(key)) next.delete('page');
    return next;
  });
  const changeSort = (field, order) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    next.set('sort', field); next.set('direction', order); next.delete('page');
    return next;
  });
  const resetFilters = () => setParams((previous) => {
    const next = new URLSearchParams(previous);
    for (const key of ['q', 'department_id', 'thing_type_id', 'condition', 'page']) next.delete(key);
    return next;
  });
  const refresh = () => client.invalidateQueries({ queryKey: ['equip', scope.id] });
  const permissions = options.data?.permissions ?? {};
  const error = options.error || list.error;
  return <main className="equip-page">
    <header className="equip-heading"><span className="equip-mark"><IconBox size={28}/></span><div><h1>Equip</h1><p>Оборудование и оснащение команды</p></div><div className="equip-heading-actions">
      {permissions.types && <button type="button" className="equip-secondary" onClick={() => setTypeEditor(true)}><IconSettings size={17}/>Типы</button>}
      {permissions.create && <button type="button" className="equip-primary" onClick={() => change('item', 'new')}><IconPlus size={18}/>Добавить</button>}
    </div></header>
    {error ? <p role="alert" className="equip-error">{error.status === 403 ? 'Нет доступа к Equip. Обратитесь к владельцу организации.' : error.message}<button onClick={() => { options.refetch(); list.refetch(); }}>Повторить</button></p> : <>
      <section className="equip-toolbar" aria-label="Фильтры оборудования"><form onSubmit={(event) => { event.preventDefault(); change('q', search.trim()); setSearchDraft(null); }}><IconSearch size={18}/><input aria-label="Поиск оборудования" placeholder="Название, серийник или код WMS" maxLength={120} value={search} onChange={(event) => setSearchDraft({ source: urlSearch, value: event.target.value })}/><button type="submit">Найти</button></form>
        <select aria-label="Отдел" value={params.get('department_id') || ''} onChange={(event) => change('department_id', event.target.value)}><option value="">Все доступные отделы</option>{options.data?.departments.map((item) => <option key={item.id} value={item.id}>{departmentLabel(item)}</option>)}</select>
        <select aria-label="Тип оборудования" value={params.get('thing_type_id') || ''} onChange={(event) => change('thing_type_id', event.target.value)}><option value="">Все типы</option>{options.data?.types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="Состояние" value={params.get('condition') || ''} onChange={(event) => change('condition', event.target.value)}><option value="">Любое состояние</option>{Object.entries(conditions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        {hasFilters && <button className="equip-secondary" onClick={resetFilters}>Сбросить</button>}
      </section>
      {!permissions.access_all && options.data && <p className="equip-scope-note">Показано оборудование вашего отдела. Доступ к другим отделам настраивает владелец организации.</p>}
      <EquipViewControls view={view} onView={(value) => change('view', value)} columns={columns} onColumns={setColumns} sort={sort} direction={direction} onSort={changeSort}/>
      {(options.isPending || list.isLoading) ? <p className="equip-empty">Загружаю Экипу…</p> : <>
        <div className="equip-count">Оборудование <strong>{list.data?.meta.total ?? 0}</strong></div>
        {!list.data?.data.length ? <section className="equip-empty"><IconBox size={46}/><h2>{hasFilters ? 'Ничего не найдено' : 'Здесь начинается ваша Экипа'}</h2><p>{hasFilters ? 'Попробуйте изменить фильтры или поисковый запрос.' : 'Компьютеры, мониторы, инструменты — всё, чем работает команда.'}</p>{permissions.create && <button className="equip-primary" onClick={() => change('item', 'new')}>Добавить оборудование</button>}</section> : view === 'table' ? <EquipTable things={list.data.data} scope={scope} types={options.data?.types || []} columns={columns} sort={sort} direction={direction} onSort={changeSort} onOpen={(id) => change('item', id)}/> : <EquipActionBoard enabled={permissions.update && moduleEnabled(scope, 'exploiter')} onAction={(thing, kind) => setParams((previous) => { const next = new URLSearchParams(previous); next.set('item', thing.id); next.set('exploitation_kind', kind); return next; })}><div className="equip-grid">{list.data.data.map((thing) => <EquipActionItem key={thing.id} thing={thing} enabled={permissions.update && moduleEnabled(scope, 'exploiter')}><button className="equip-card" key={thing.id} onClick={() => change('item', thing.id)}>
          <div className="equip-card-top"><EquipPhoto scopeId={scope.id} thing={thing}/><span className={`equip-condition equip-condition--${thing.condition}`}>{conditions[thing.condition]}</span></div>
          <small>{thing.type?.name}</small><strong>{thing.name}</strong><span className="equip-model">{[thing.manufacturer, thing.model].filter(Boolean).join(' ') || 'Модель не указана'}</span>
          <dl><div><dt>Инв. №</dt><dd>{thing.inventory_number || '—'}</dd></div><div><dt>Собственник</dt><dd>{ownerLabel(thing, scope.name)}</dd></div><div><dt>Выдано</dt><dd>{thing.current_assignment?.user_name || 'Не выдано'}</dd></div></dl>
          <footer title={thing.department?.name || 'Без отдела'} style={{ background: thing.department?.color || '#edf2f4' }}>{departmentShortLabel(thing.department)}</footer>
        </button></EquipActionItem>)}</div></EquipActionBoard>}
        {list.data?.meta.last_page > 1 && <nav className="equip-pagination" aria-label="Страницы реестра"><button disabled={list.data.meta.page <= 1} onClick={() => change('page', list.data.meta.page - 1)}>Назад</button><span>{list.data.meta.page} / {list.data.meta.last_page}</span><button disabled={list.data.meta.page >= list.data.meta.last_page} onClick={() => change('page', list.data.meta.page + 1)}>Далее</button></nav>}
      </>}
    </>}
    {selected && options.data && <ThingSidebar key={`${scope.id}:${selected}`} scope={scope} id={selected} options={options.data} departmentId={params.get('department_id')} initialExploitation={params.get('exploitation_kind')} onClose={() => change('item', null)} onSaved={(thing) => { refresh(); change('item', thing.id); }}/>}
    {typeEditor && <TypeEditor scopeId={scope.id} types={options.data?.types ?? []} onClose={() => setTypeEditor(false)} onSaved={() => { client.invalidateQueries({ queryKey: ['equip-options', scope.id] }); setTypeEditor(false); }}/>}
  </main>;
}

function EquipDialog({ title, onClose, children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className={`equip-dialog ${className}`} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}><header className="equip-dialog-heading"><div><small>Equip</small><h2>{title}</h2></div><button type="button" aria-label="Закрыть" onClick={onClose}><IconX size={22}/></button></header>{children}</dialog>;
}

function ThingSidebar({ scope, id, options, departmentId, initialExploitation, onClose, onSaved }) {
  const isNew = id === 'new';
  const [tab, setTab] = useState(initialExploitation && moduleEnabled(scope, 'exploiter') ? 'exploitation' : 'details');
  const [editing, setEditing] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const client = useQueryClient();
  const thing = useQuery({ queryKey: ['equip-thing', scope.id, id], queryFn: () => equipApi.get(scope.id, id), enabled: !isNew, refetchOnWindowFocus: !dirty });
  const close = () => { if (!dirty || window.confirm('Закрыть карточку без сохранения изменений?')) onClose(); };
  const canEdit = options.permissions.update;
  const cancel = () => { setDirty(false); setEditing(false); setFormVersion((version) => version + 1); if (isNew) onClose(); };
  const saved = (result) => { setDirty(false); setEditing(false); client.setQueryData(['equip-thing', scope.id, result.id], result); client.invalidateQueries({ queryKey: ['equip-history', scope.id, result.id] }); onSaved(result); };
  return <EquipDialog title={isNew ? 'Новое оборудование' : thing.data?.name || 'Карточка оборудования'} onClose={close}>
    {!isNew && <nav className="equip-tabs" aria-label="Разделы карточки">{[['details', 'Карточка', IconBox], ['assignments', 'Выдача', IconPencil], ['compositions', 'Состав', IconBox], ['photos', 'Фото', IconPhoto], ['files', 'Документы', IconFiles], ['links', 'Связи', IconFiles], ...(moduleEnabled(scope, 'exploiter') ? [['exploitation', 'Эксплуатация', IconHistory]] : []), ['history', 'История', IconHistory]].map(([key, label, Icon]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon size={16}/>{label}</button>)}</nav>}
    {thing.error ? <p role="alert" className="equip-error">{thing.error.message}<button onClick={() => thing.refetch()}>Повторить</button></p> : !isNew && thing.isPending ? <p className="equip-empty">Загружаю карточку…</p> : <>
      <div hidden={tab !== 'details'} className="equip-dialog-body">
        {!isNew && <div className="equip-container-summary"><span>{containerKinds[thing.data.container_kind] || containerKinds.none}</span><button type="button" className="equip-secondary" disabled={dirty} onClick={() => setTab('compositions')}>Состав и контейнер</button></div>}
        {!isNew && !editing && canEdit && <button className="equip-edit-trigger" onClick={() => setEditing(true)}><IconPencil size={16}/>Редактировать</button>}
        <ThingForm key={isNew ? 'new' : `${id}:${thing.data.revision}:${formVersion}`} initial={isNew ? newThing(departmentId || options.default_department_id || '') : thing.data} options={options} scopeId={scope.id} editing={editing} isNew={isNew} onDirty={() => setDirty(true)} onSaved={saved} onCancel={cancel}/>
      </div>
      {thing.data && tab === 'photos' && <div className="equip-dialog-body"><PhotoPanel nativePreview scopeId={scope.id} type="thing" id={id} readOnly={!canEdit} onChanged={() => client.invalidateQueries({ queryKey: ['equip', scope.id] })}/></div>}
      {thing.data && tab === 'files' && <div className="equip-dialog-body"><FilePanel nativePreview scopeId={scope.id} category="thing" subjectType="thing" subjectId={id} readOnly={!canEdit}/></div>}
      {thing.data && tab === 'links' && <EquipLinks scopeId={scope.id} id={id} permissions={options.permissions}/>}
      {thing.data && tab === 'exploitation' && (dirty ? <p className="equip-dialog-body">Сначала сохраните изменения карточки оборудования.</p> : <ExploitationPanel key={id} scope={scope} thing={thing.data} options={options} initialKind={initialExploitation}/>)}
      {thing.data && tab === 'history' && <ThingHistory scopeId={scope.id} id={id} options={options}/>}
      {thing.data && ['assignments', 'compositions'].includes(tab) && (dirty ? <p className="equip-dialog-body">Сначала сохраните изменения во вкладке «Карточка», затем продолжите операцию.</p> : <EquipOperations key={tab} scopeId={scope.id} thing={thing.data} options={options} mode={tab} onSaved={saved} onOpenThing={(nextId) => onSaved({ id: nextId })}/>)}
    </>}
  </EquipDialog>;
}

function ThingForm({ initial, options, scopeId, editing, isNew, onDirty, onSaved, onCancel }) {
  const [form, setForm] = useState({ ...initial, characteristics: initial.characteristics || {} });
  const [supplierPending, setSupplierPending] = useState(false);
  const save = useMutation({ mutationFn: () => equipApi.save(scopeId, isNew ? null : initial.id, thingPayload(form, !isNew)), onSuccess: onSaved });
  const type = options.types.find((item) => item.id === form.thing_type_id);
  const set = (key, value) => { setForm((current) => ({ ...current, [key]: value })); onDirty(); };
  const input = (key, label, inputType = 'text', extra = {}) => <label>{label}<input type={inputType} value={form[key] ?? ''} onChange={(event) => set(key, event.target.value)} maxLength={inputType === 'text' ? 255 : undefined} {...extra}/></label>;
  const editable = editing && (isNew ? options.permissions.create : options.permissions.update);
  return <form className="equip-form" onSubmit={(event) => { event.preventDefault(); if (!supplierPending) save.mutate(); }}>
    <fieldset disabled={!editable || save.isPending}><legend>Основное</legend>
      {isNew && <><label>Что создаём<select value={form.container_kind || 'none'} disabled={!options.permissions.compose} onChange={(event) => set('container_kind', event.target.value)}><option value="none">Отдельная вещь</option><option value="physical">Физический контейнер — компьютер, стойка</option><option value="logical">Логический комплект — рабочее место, набор</option></select></label><small>{options.permissions.compose ? 'После создания добавьте компоненты во вкладке «Состав». Вложенные контейнеры поддерживаются.' : 'Для создания контейнера нужно право «Управлять комплектацией». Можно создать отдельную вещь.'}</small></>}
      {input('name', 'Название *', 'text', { required: true, autoFocus: isNew, placeholder: 'Например, монитор дизайнера' })}
      <div className="equip-form-row"><label>Тип *<select required value={form.thing_type_id} onChange={(event) => { if (Object.keys(form.characteristics).length && !window.confirm('При смене типа заполненные характеристики будут очищены. Продолжить?')) return; setForm((value) => ({ ...value, thing_type_id: event.target.value, characteristics: {} })); onDirty(); }}><option value="">Выберите тип</option>{options.types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Отдел<select required={!options.permissions.access_all} value={form.department_id || ''} onChange={(event) => set('department_id', event.target.value)}><option value="">Без отдела</option>{options.departments.map((item) => <option key={item.id} value={item.id}>{departmentLabel(item)}</option>)}</select></label></div>
      <div className="equip-form-row">{input('manufacturer', 'Производитель')}{input('model', 'Модель')}</div>
      <div className="equip-form-row">{input('inventory_number', 'Инвентарный номер')}{input('serial_number', 'Серийный номер')}</div>
    </fieldset>
    <fieldset disabled={!editable || save.isPending}><legend>Происхождение</legend>
      <label>Основание внесения *<textarea required maxLength={10000} rows={3} value={form.registration_basis || ''} onChange={(event) => set('registration_basis', event.target.value)} placeholder="Счёт, передача, личная вещь или первичная инвентаризация"/></label>
      <small>Подтверждающие файлы можно добавить во вкладке «Документы» после сохранения.</small>
      <div className="equip-form-row">{input('purchased_on', 'Дата приобретения', 'date')}{input('purchase_cost', 'Стоимость приобретения', 'number', { min: 0, max: 999999999999.99, step: '0.01' })}</div>
      <SupplierPicker scopeId={scopeId} value={form.supplier_id} name={form.supplier_entry?.name || form.supplier} disabled={!editable || save.isPending} onPendingChange={(pending) => { setSupplierPending(pending); if (pending) onDirty(); }} onChange={(supplier) => { setForm((current) => ({ ...current, supplier_id: supplier?.id || '', supplier_entry: supplier, supplier: supplier?.name || '' })); onDirty(); }}/>
    </fieldset>
    <fieldset disabled={!editable || save.isPending || (!isNew && !options.permissions.ownership)}><legend>Собственность</legend><small>Собственник и сотрудник, которому выдана вещь, — разные роли.</small>
      <label>Кому принадлежит<select value={form.owner_kind} onChange={(event) => { setForm((current) => ({ ...current, owner_kind: event.target.value, owner_id: '', owner_name: '' })); onDirty(); }}>{Object.entries(ownerKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {form.owner_kind === 'employee' && <label>Собственник *<select required value={form.owner_id || ''} onChange={(event) => set('owner_id', event.target.value)}><option value="">Выберите сотрудника</option>{options.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
      {form.owner_kind === 'external' && input('owner_name', 'Название или имя собственника *', 'text', { required: true })}
    </fieldset>
    <fieldset disabled={!editable || save.isPending || (!isNew && !options.permissions.state)}><legend>Состояние</legend><div className="equip-form-row">
      <label>Техническое состояние<select value={form.condition} onChange={(event) => set('condition', event.target.value)}>{Object.entries(conditions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Пригодность для работы<select value={form.suitability} onChange={(event) => set('suitability', event.target.value)}>{Object.entries(suitability).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    </fieldset>
    {!!type?.schema?.length && <fieldset disabled={!editable || save.isPending}><legend>Характеристики</legend><div className="equip-form-row">{type.schema.map((field) => <label key={field.key}>{field.label}{field.unit ? `, ${field.unit}` : ''}
      {field.type === 'boolean' ? <select value={form.characteristics[field.key] === undefined ? '' : String(form.characteristics[field.key])} onChange={(event) => { const next = { ...form.characteristics }; if (event.target.value === '') delete next[field.key]; else next[field.key] = event.target.value === 'true'; set('characteristics', next); }}><option value="">Не указано</option><option value="true">Да</option><option value="false">Нет</option></select> : <input type={field.type === 'number' ? 'number' : 'text'} step={field.type === 'number' ? 'any' : undefined} maxLength={field.type === 'text' ? 1000 : undefined} value={form.characteristics[field.key] ?? ''} onChange={(event) => { const next = { ...form.characteristics }; if (event.target.value === '') delete next[field.key]; else next[field.key] = field.type === 'number' ? Number(event.target.value) : event.target.value; set('characteristics', next); }}/>}
    </label>)}</div></fieldset>}
    <fieldset disabled={!editable || save.isPending}><legend>Описание</legend><label className="equip-sr-only" htmlFor="equip-description">Описание оборудования</label><textarea id="equip-description" rows={3} maxLength={20000} value={form.description || ''} onChange={(event) => set('description', event.target.value)} placeholder="Особенности, комплектация, примечания"/></fieldset>
    <fieldset disabled={!editable || save.isPending}><legend>Связь с WMS</legend><small>Можно оставить пустыми до подключения складской программы.</small><div className="equip-form-row">{input('wms_product_id', 'ID товара', 'text', { maxLength: 128 })}{input('wms_inventory_unit', 'ID экземпляра', 'text', { maxLength: 128 })}</div></fieldset>
    {save.error && <p role="alert" className="equip-error">{save.error.message}</p>}
    {supplierPending && <p className="equip-operation-help">Выберите поставщика из списка или нажмите «Добавить», чтобы сохранить его по ID.</p>}
    {editable && <footer className="equip-form-footer"><button type="button" className="equip-secondary" disabled={save.isPending} onClick={onCancel}>Отменить</button><button className="equip-primary" disabled={save.isPending || supplierPending}>{save.isPending ? 'Сохраняю…' : isNew ? 'Создать оборудование' : 'Сохранить изменения'}</button></footer>}
  </form>;
}

function ThingHistory({ scopeId, id, options }) {
  const [page, setPage] = useState(1);
  const history = useQuery({ queryKey: ['equip-history', scopeId, id, page], queryFn: () => equipApi.history(scopeId, id, page) });
  const format = (key, value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (key === 'condition') return conditions[value];
    if (key === 'kind') return entryKinds[value] || value;
    if (key === 'status') return entryStatuses[value] || value;
    if (key === 'priority') return entryPriorities[value] || value;
    if (key === 'is_pinned') return value ? 'Да' : 'Нет';
    if (key === 'performer_id') return options.people.find((item) => item.id === value)?.name || 'Бывший участник';
    if (key === 'suitability') return suitability[value];
    if (key === 'owner_kind') return ownerKinds[value];
    if (key === 'container_kind' || key === 'relation_kind') return containerKinds[value];
    if (key === 'responsibility') return responsibilities[value];
    if (key === 'department_id') return options.departments.find((item) => item.id === value)?.name || 'Другой отдел';
    if (key === 'owner_id') return options.people.find((item) => item.id === value)?.name || 'Сотрудник';
    if (key === 'thing_type_id') return options.types.find((item) => item.id === value)?.name || 'Тип оборудования';
    if (key === 'characteristics') {
      const fields = options.types.flatMap((type) => type.schema || []);
      return Object.entries(value).map(([name, entry]) => `${fields.find((field) => field.key === name)?.label || name}: ${typeof entry === 'boolean' ? entry ? 'Да' : 'Нет' : entry}`).join('\n') || '—';
    }
    return String(value);
  };
  return <div className="equip-dialog-body equip-history">{history.isPending && <p>Загружаю историю…</p>}{history.error && <p role="alert">{history.error.message}</p>}{history.data?.data.map((event) => <article key={event.id}><strong>{eventLabels[event.action] || event.action}</strong><small>{event.actor?.name || 'Удалённый пользователь'} · {new Date(event.created_at).toLocaleString('ru-RU')}</small><dl>{[...new Set([...Object.keys(event.before || {}), ...Object.keys(event.after || {})])].filter((key) => fieldLabels[key]).map((key) => [key, event.after?.[key]]).map(([key, value]) => <div key={key}><dt>{fieldLabels[key]}</dt><dd>{event.before && <><span className="equip-history-before">{format(key, event.before[key])}</span><span aria-label="изменено на"> → </span></>}{format(key, value)}</dd></div>)}</dl></article>)}{history.data?.meta.last_page > 1 && <nav className="equip-pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Назад</button><span>{page}</span><button disabled={page >= history.data.meta.last_page} onClick={() => setPage(page + 1)}>Далее</button></nav>}</div>;
}

function TypeEditor({ scopeId, types, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', parent_id: '', schema: [] });
  const save = useMutation({ mutationFn: () => equipApi.createType(scopeId, { ...form, parent_id: form.parent_id || null }), onSuccess: onSaved });
  const field = (index, key, value) => setForm((current) => ({ ...current, schema: current.schema.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  return <EquipDialog title="Новый тип оборудования" onClose={onClose}><form className="equip-form equip-dialog-body" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><p>Свой тип будет доступен только в этой организации. Характеристики задаются при создании типа.</p><fieldset disabled={save.isPending}><label>Название *<input autoFocus required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><label>Группа<select value={form.parent_id} onChange={(event) => setForm({ ...form, parent_id: event.target.value })}><option value="">Без группы</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
    {form.schema.map((item, index) => <section className="equip-schema-field" key={index}><div className="equip-form-row"><label>Название характеристики<input required maxLength={100} value={item.label} onChange={(event) => field(index, 'label', event.target.value)}/></label><label>Ключ латиницей<input required pattern="[a-z][a-z0-9_]{0,49}" maxLength={50} value={item.key} onChange={(event) => field(index, 'key', event.target.value)}/></label><label>Формат<select value={item.type} onChange={(event) => field(index, 'type', event.target.value)}><option value="text">Текст</option><option value="number">Число</option><option value="boolean">Да / нет</option></select></label><label>Единица измерения<input maxLength={30} value={item.unit || ''} onChange={(event) => field(index, 'unit', event.target.value)}/></label></div><button type="button" onClick={() => setForm({ ...form, schema: form.schema.filter((_, i) => i !== index) })}>Убрать характеристику</button></section>)}
    <button type="button" disabled={form.schema.length >= 50} onClick={() => setForm({ ...form, schema: [...form.schema, { key: '', label: '', type: 'text', unit: '' }] })}>Добавить характеристику</button></fieldset>{save.error && <p role="alert" className="equip-error">{save.error.message}</p>}<footer className="equip-form-footer"><button className="equip-primary" disabled={save.isPending}>Создать тип</button></footer></form></EquipDialog>;
}
