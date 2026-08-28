import { lazy, Suspense, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconBolt, IconCode, IconFileText, IconHash, IconPlus, IconSearch, IconStar, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { factApi } from '../entities/fact/api';
import './FactorPage.css';

const MarkdownEditor = lazy(() => import('../shared/ui/CompactMarkdownEditor'));
const formats = { text: 'Текст', markdown: 'Markdown', code: 'Код', command: 'Команда', number: 'Число', svg: 'SVG' };
const kinds = { other: 'Прочее', credential: 'Реквизит', command: 'Команда', reference: 'Справка', metric: 'Показатель', configuration: 'Конфигурация' };

export function FactorPage() {
  const { activeScope } = useWorkspace();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const key = ['facts', activeScope?.id];
  const { data: facts = [], isLoading, error } = useQuery({ queryKey: key, queryFn: () => factApi.list(activeScope.id), enabled: Boolean(activeScope) });
  const filtered = facts.filter((fact) => `${fact.label} ${fact.value} ${fact.kind}`.toLowerCase().includes(search.toLowerCase()));
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  return <main className="factor-page"><header className="factor-toolbar"><div><IconBolt size={20}/><h1>Factor</h1><small>{facts.length} фактов</small></div><label><IconSearch size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти факт…"/></label><button onClick={() => setCreating(true)}><IconPlus size={17}/>Новый факт</button></header>{!activeScope && <div className="factor-state">Выберите скоуп.</div>}{isLoading && <div className="factor-state">Загружаю факты…</div>}{error && <div className="factor-state factor-error">{error.message}</div>}<section className="fact-grid">{filtered.map((fact) => <button key={fact.id} className={`fact-card ${fact.is_sensitive ? 'sensitive' : ''}`} onClick={() => setSelectedId(fact.id)}><header><span>{formatIcon(fact.format)}{formats[fact.format] ?? fact.format}</span>{fact.is_pinned && <IconStar size={14} fill="currentColor"/>}</header><strong>{fact.label}</strong><p>{fact.is_sensitive ? '••••••••' : fact.value}</p><footer><span>{kinds[fact.kind] ?? fact.kind}</span>{fact.unit && <code>{fact.unit}</code>}</footer></button>)}</section>{creating && <FactCreate scopeId={activeScope.id} onClose={() => setCreating(false)} onCreated={(fact) => { refresh(); setCreating(false); setSelectedId(fact.id); }}/>} {selectedId && <><div className="factor-backdrop" onClick={() => setSelectedId(null)}/><FactEditor scopeId={activeScope.id} factId={selectedId} onClose={() => setSelectedId(null)} onChanged={refresh}/></>}</main>;
}

function FactCreate({ scopeId, onClose, onCreated }) {
  const [form, setForm] = useState({ label: '', value: '', format: 'text', kind: 'other', is_sensitive: false });
  const create = useMutation({ mutationFn: () => factApi.create(scopeId, form), onSuccess: onCreated });
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  return <div className="fact-modal-backdrop" onMouseDown={onClose}><form className="fact-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); create.mutate(); }}><header><strong>Новый факт</strong><button type="button" onClick={onClose}><IconX size={18}/></button></header><label>Название<input autoFocus required value={form.label} onChange={set('label')} placeholder="Адрес сервера 1С"/></label><div className="fact-form-row"><label>Формат<select value={form.format} onChange={set('format')}>{Object.entries(formats).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Тип<select value={form.kind} onChange={set('kind')}>{Object.entries(kinds).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><label>Значение<textarea required rows="5" value={form.value} onChange={set('value')}/></label><label className="fact-checkbox"><input type="checkbox" checked={form.is_sensitive} onChange={set('is_sensitive')}/>Чувствительные данные</label>{create.error && <p className="factor-error">{create.error.message}</p>}<footer><button type="button" onClick={onClose}>Отмена</button><button className="fact-primary" disabled={create.isPending}>Создать</button></footer></form></div>;
}

function FactEditor({ scopeId, factId, onClose, onChanged }) {
  const queryClient = useQueryClient();
  const key = ['fact', scopeId, factId];
  const { data: fact, isLoading, error } = useQuery({ queryKey: key, queryFn: () => factApi.get(scopeId, factId) });
  const save = useMutation({ mutationFn: (payload) => factApi.update(scopeId, factId, payload), onSuccess: (updated) => { queryClient.setQueryData(key, updated); onChanged(); } });
  if (isLoading) return <aside className="fact-editor">Загружаю…</aside>;
  if (error) return <aside className="fact-editor factor-error">{error.message}</aside>;
  return <aside className="fact-editor"><header><span><IconBolt size={18}/>Факт</span><button onClick={onClose}><IconX size={19}/></button></header><input className="fact-title" value={fact.label} onChange={(event) => queryClient.setQueryData(key, { ...fact, label: event.target.value })} onBlur={(event) => save.mutate({ label: event.target.value })}/><div className="fact-properties"><label>Формат<select value={fact.format} onChange={(event) => save.mutate({ format: event.target.value })}>{Object.entries(formats).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Тип<select value={fact.kind} onChange={(event) => save.mutate({ kind: event.target.value })}>{Object.entries(kinds).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Единица<input value={fact.unit ?? ''} onChange={(event) => queryClient.setQueryData(key, { ...fact, unit: event.target.value })} onBlur={(event) => save.mutate({ unit: event.target.value || null })}/></label></div>{fact.format === 'markdown' ? <Suspense fallback={<div className="factor-state">Загружаю Markdown…</div>}><MarkdownEditor variant="full" value={fact.value} placeholder="Содержание факта…" onSave={(value) => save.mutate({ value: value ?? '' })}/></Suspense> : <textarea className={`fact-value fact-value--${fact.format}`} defaultValue={fact.value} onBlur={(event) => save.mutate({ value: event.target.value })}/>}<label className="fact-context">Контекст<textarea rows="4" defaultValue={fact.context ?? ''} onBlur={(event) => save.mutate({ context: event.target.value || null })}/></label><div className="fact-flags"><label><input type="checkbox" checked={fact.is_sensitive} onChange={(event) => save.mutate({ is_sensitive: event.target.checked })}/>Чувствительный</label><label><input type="checkbox" checked={fact.is_expert} onChange={(event) => save.mutate({ is_expert: event.target.checked })}/>Экспертный</label><label><input type="checkbox" checked={fact.is_pinned} onChange={(event) => save.mutate({ is_pinned: event.target.checked })}/>Закреплён</label></div>{save.error && <p className="factor-error">{save.error.message}</p>}</aside>;
}

function formatIcon(format) { return format === 'code' || format === 'command' ? <IconCode size={14}/> : format === 'number' ? <IconHash size={14}/> : <IconFileText size={14}/>; }
