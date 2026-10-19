import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { equipApi } from '../entities/equip/api';
import { containerKinds, responsibilities } from '../entities/equip/model';

function useDelayed(value) {
  const [delayed, setDelayed] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDelayed(value), 250); return () => clearTimeout(timer); }, [value]);
  return delayed;
}

export function SupplierPicker({ scopeId, value, name, disabled, onChange, onPendingChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const delayed = useDelayed(query);
  const suppliers = useQuery({ queryKey: ['equip-suppliers', scopeId, delayed], queryFn: ({ signal }) => equipApi.suppliers(scopeId, delayed, signal), enabled: open && !disabled });
  const client = useQueryClient();
  const select = (supplier) => { onChange(supplier); setQuery(''); setOpen(false); onPendingChange(false); };
  const create = useMutation({ mutationFn: () => equipApi.createSupplier(scopeId, query.trim()), onSuccess: (supplier) => { client.invalidateQueries({ queryKey: ['equip-suppliers', scopeId] }); select(supplier); } });
  return <div className="equip-supplier"><label htmlFor="equip-supplier-input">Поставщик</label>
    {value ? <span className="equip-supplier-tag">{name || 'Поставщик'}{!disabled && <button type="button" aria-label="Убрать поставщика" onClick={() => select(null)}>×</button>}</span> : <>
      <input id="equip-supplier-input" aria-label="Поставщик" placeholder="Найти или добавить поставщика" maxLength={120} disabled={disabled || create.isPending} value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); onPendingChange(!!event.target.value.trim()); }} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); } if (event.key === 'Enter') { event.preventDefault(); if (query.trim() && !create.isPending) create.mutate(); } }}/>
      {open && !disabled && <div className="equip-picker-results"><div className="equip-picker-caption">Выберите поставщика или добавьте нового<button type="button" onClick={() => { setOpen(false); setQuery(''); onPendingChange(false); }}>Закрыть</button></div>{suppliers.isPending && <p>Загружаю…</p>}{suppliers.data?.map((supplier) => <button type="button" key={supplier.id} disabled={create.isPending} onClick={() => select(supplier)}>{supplier.name}</button>)}{query.trim() && <button type="button" className="equip-create-option" disabled={create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Добавляю…' : `Добавить «${query.trim()}»`}</button>}{suppliers.error && <p role="alert">{suppliers.error.message}</p>}</div>}
    </>}{create.error && <p role="alert" className="equip-error">{create.error.message}</p>}
  </div>;
}

const date = (value) => value ? new Date(value).toLocaleString('ru-RU') : 'по настоящее время';

export function EquipOperations({ scopeId, thing, options, mode, onSaved, onOpenThing }) {
  const client = useQueryClient();
  const state = useQuery({ queryKey: ['equip-operations', scopeId, thing.id], queryFn: () => equipApi.operations(scopeId, thing.id), refetchOnWindowFocus: false });
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const operation = useMutation({ mutationFn: (payload) => equipApi.operate(scopeId, thing.id, payload), onSuccess: (result) => {
    setNotice('Операция сохранена.');
    client.invalidateQueries({ queryKey: ['equip-operations', scopeId] });
    client.invalidateQueries({ queryKey: ['equip-periods', scopeId] });
    client.invalidateQueries({ queryKey: ['equip-history', scopeId] });
    client.invalidateQueries({ queryKey: ['equip-thing', scopeId] });
    onSaved(result);
  } });
  const run = (payload, message) => {
    setNotice('');
    const request = { revision: state.data.revision, ...payload };
    if (message) setConfirmation({ message, request });
    else operation.mutate(request);
  };
  return <div className="equip-dialog-body equip-form equip-operations">
    {state.isPending ? <p>Загружаю состав и назначения…</p> : state.error ? <p role="alert" className="equip-error">{state.error.message}</p> : <>
      <div className="equip-operation-toolbar"><span>{mode === 'assignments' ? 'Ответственность за оборудование' : 'Комплектация'}</span><button type="button" className="equip-secondary" disabled={operation.isPending || state.isFetching || !!confirmation} onClick={() => { operation.reset(); state.refetch(); }}>Обновить</button></div>
      <fieldset disabled={operation.isPending || state.isFetching || !!confirmation}>
        {mode === 'assignments' ? <AssignmentForm state={state.data} options={options} run={run}/> : <CompositionForm key={state.data.revision} scopeId={scopeId} thing={thing} state={state.data} options={options} run={run} onOpenThing={onOpenThing}/>}
      </fieldset>
      {confirmation && <section className="equip-operation-confirm" aria-label="Подтверждение операции"><p>{confirmation.message}</p><div className="equip-operation-buttons"><button type="button" className="equip-primary" onClick={() => { operation.mutate(confirmation.request); setConfirmation(null); }}>Подтвердить</button><button type="button" className="equip-secondary" onClick={() => setConfirmation(null)}>Отмена</button></div></section>}
      {operation.error && <p role="alert" className="equip-error">{operation.error.message}{operation.error.status === 409 && ' Нажмите «Обновить» и проверьте список ещё раз.'}</p>}
      {notice && <p role="status" className="equip-operation-success">{notice}</p>}
      <PeriodHistory key={`${thing.id}:${mode}`} scopeId={scopeId} id={thing.id} kind={mode}/>
    </>}
  </div>;
}

function AssignmentForm({ state, options, run }) {
  const [person, setPerson] = useState('');
  const [responsibility, setResponsibility] = useState('use');
  const [note, setNote] = useState('');
  const revisions = Object.fromEntries(state.assembly.map((item) => [item.id, item.revision]));
  const assigned = state.assembly.some((item) => item.current_assignment);
  const submit = (operation) => run({ operation, expected_revisions: revisions, ...(operation === 'assign' ? { user_id: person, responsibility } : {}), note }, operation === 'return' ? `Вернуть весь текущий состав (${state.assembly.length} шт.)? Все действующие назначения перечисленных вещей будут закрыты.` : `Выдать весь текущий состав (${state.assembly.length} шт.) сотруднику «${options.assignees.find((item) => item.id === person)?.name}»? Предыдущие назначения будут закрыты.`);
  return <>
    <h3>Текущий состав · {state.assembly.length}</h3>
    <p className="equip-operation-help">Выдача, передача и возврат применяются ко всем вещам ниже, включая вложенные компоненты. Собственники не меняются.</p>
    <ul className="equip-assembly-list">{state.assembly.map((item) => <li key={item.id}><div><strong>{item.name}</strong><small>{item.inventory_number || 'Без инвентарного номера'}</small></div><span>{item.current_assignment ? <>{item.current_assignment.user_name}<small>{responsibilities[item.current_assignment.responsibility]}</small></> : 'Не выдано'}</span></li>)}</ul>
    {state.hidden_components && <p className="equip-error">Часть состава находится вне вашей области доступа. Выдать или вернуть комплект целиком сможет сотрудник с доступом ко всему составу.</p>}
    {state.can_assign ? <>
      <div className="equip-form-row"><label>Кому выдать<select value={person} onChange={(event) => setPerson(event.target.value)}><option value="">Выберите сотрудника</option>{options.assignees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Ответственность<select value={responsibility} onChange={(event) => setResponsibility(event.target.value)}>{Object.entries(responsibilities).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
      <label>Основание / примечание<textarea rows={2} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Например, выдача на рабочее место или передача на время ремонта"/></label>
      <div className="equip-operation-buttons"><button type="button" className="equip-primary" disabled={!person} onClick={() => submit('assign')}>{assigned ? 'Выдать / передать весь состав' : 'Выдать весь состав'}</button><button type="button" className="equip-secondary" disabled={!assigned} onClick={() => submit('return')}>Вернуть весь состав</button></div>
    </> : <p className="equip-operation-help">Для выдачи, передачи и возврата нужно отдельное право «Выдавать оборудование» на весь состав.</p>}
  </>;
}

function CompositionForm({ scopeId, thing, state, options, run, onOpenThing }) {
  const [kind, setKind] = useState(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const delayed = useDelayed(query);
  const candidates = useQuery({ queryKey: ['equip-candidates', scopeId, delayed], queryFn: ({ signal }) => equipApi.list(scopeId, new URLSearchParams({ q: delayed }).toString(), signal), enabled: options.permissions.compose && !!delayed.trim() && !selected });
  const children = state.relations.filter((item) => item.direction === 'child');
  const parents = state.relations.filter((item) => item.direction === 'parent');
  const links = (items) => <ul className="equip-composition-list">{items.map((item) => <li key={item.id}><div>{item.thing ? <button type="button" className="equip-text-link" onClick={() => onOpenThing(item.thing.id)}>{item.thing.name}</button> : <span>Оборудование вне вашей области доступа</span>}<small>{containerKinds[item.kind]} · с {date(item.started_at)}</small></div>{item.can_detach && <button type="button" className="equip-secondary" onClick={() => run({ operation: 'detach', relation_id: item.id, note }, 'Извлечь вещь из состава? Собственность и выдача сотруднику сохранятся.')}>Извлечь</button>}</li>)}</ul>;
  return <>
    <h3>{containerKinds[state.container_kind]}</h3>
    <p className="equip-operation-help">Физический контейнер — корпус или стойка; логический — рабочее место или набор. У вещи может быть только один физический контейнер.</p>
    {options.permissions.compose && <div className="equip-container-settings"><label>Вид контейнера<select value={kind ?? state.container_kind} disabled={children.length > 0} onChange={(event) => setKind(event.target.value)}>{Object.entries(containerKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button type="button" className="equip-secondary" disabled={children.length > 0 || (kind ?? state.container_kind) === state.container_kind} onClick={() => { run({ operation: 'container', container_kind: kind }); setKind(null); }}>Применить</button></div>}
    {!!parents.length && <><h3>Входит в состав</h3>{links(parents)}</>}
    {state.container_kind !== 'none' && <><h3>Непосредственный состав · {children.length}</h3>{children.length ? links(children) : <p className="equip-operation-help">Контейнер пока пуст.</p>}
      {options.permissions.compose && <>
        <p className="equip-operation-help">Добавление и извлечение сохраняют текущие назначения. После добавления новых вещей откройте «Выдачу» и подтвердите выдачу всего состава.</p>
        <label>Добавить оборудование<input value={query} maxLength={120} placeholder="Название, серийник или инвентарный номер" onChange={(event) => { setQuery(event.target.value); setSelected(null); }}/></label>
        {selected ? <div className="equip-selected-component">{selected.name}<button type="button" onClick={() => { setSelected(null); setQuery(''); }}>Убрать</button></div> : delayed.trim() && <div className="equip-picker-results">{candidates.isPending && <p>Поиск…</p>}{candidates.data?.data.filter((item) => item.id !== thing.id && !children.some((relation) => relation.thing?.id === item.id)).map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item); setQuery(item.name); }}>{item.name}<small>{item.inventory_number || item.serial_number || 'Без номера'}</small></button>)}{candidates.data?.meta.total > 30 && <p>Уточните запрос — показаны первые 30 совпадений.</p>}{candidates.data?.data.length === 0 && <p>Ничего не найдено.</p>}{candidates.error && <p role="alert">{candidates.error.message}</p>}</div>}
        <label>Примечание к изменению состава<textarea rows={2} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)}/></label>
        <div className="equip-operation-buttons"><button type="button" className="equip-primary" disabled={!selected} onClick={() => run({ operation: 'attach', child_id: selected.id, child_revision: selected.revision, note })}>Добавить в состав</button><button type="button" className="equip-secondary" disabled={!children.length || children.some((item) => !item.can_detach)} onClick={() => run({ operation: 'disband', note }, 'Расформировать непосредственный состав? Вещи, их вложенный состав, назначения и история сохранятся.')}>Расформировать</button></div>
      </>}
    </>}
  </>;
}

function PeriodHistory({ scopeId, id, kind }) {
  const [page, setPage] = useState(1);
  const history = useQuery({ queryKey: ['equip-periods', scopeId, id, kind, page], queryFn: () => equipApi.periods(scopeId, id, kind, page) });
  return <section className="equip-period-history"><h3>{kind === 'assignments' ? 'История выдач этой вещи' : 'История состава'}</h3>
    {history.isPending ? <p>Загружаю историю…</p> : history.error ? <p role="alert" className="equip-error">{history.error.message}</p> : !history.data.data.length ? <p className="equip-operation-help">Операций ещё не было.</p> : <>{history.data.data.map((period) => <article key={period.id}><strong>{kind === 'assignments' ? period.user_name : `${period.parent_name} ← ${period.child_name}`}</strong><span>{kind === 'assignments' ? responsibilities[period.responsibility] : containerKinds[period.kind]}</span><small>{date(period.started_at)} — {date(period.ended_at)}</small>{period.note && <p>{period.note}</p>}{period.closing_note && <p>При завершении: {period.closing_note}</p>}</article>)}{history.data.meta.last_page > 1 && <nav className="equip-pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Назад</button><span>{page} / {history.data.meta.last_page}</span><button disabled={page >= history.data.meta.last_page} onClick={() => setPage(page + 1)}>Далее</button></nav>}</>}
  </section>;
}
