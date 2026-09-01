import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconBolt,
  IconCheck,
  IconCode,
  IconCopy,
  IconFileText,
  IconHash,
  IconPlus,
  IconSearch,
  IconStar,
  IconX,
} from '@tabler/icons-react';
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
  const [kindFilter, setKindFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [expertOnly, setExpertOnly] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const key = ['facts', activeScope?.id];
  const { data: facts = [], isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => factApi.list(activeScope.id),
    enabled: Boolean(activeScope),
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return facts.filter((fact) => {
      if (kindFilter !== 'all' && fact.kind !== kindFilter) return false;
      if (formatFilter !== 'all' && fact.format !== formatFilter) return false;
      if (pinnedOnly && !fact.is_pinned) return false;
      if (expertOnly && !fact.is_expert) return false;
      if (!query) return true;
      return `${fact.label} ${fact.value} ${fact.context ?? ''} ${fact.kind} ${fact.format}`.toLowerCase().includes(query);
    });
  }, [expertOnly, facts, formatFilter, kindFilter, pinnedOnly, search]);

  useEffect(() => {
    if (!copiedId) return undefined;
    const timeout = window.setTimeout(() => setCopiedId(null), 1500);
    return () => window.clearTimeout(timeout);
  }, [copiedId]);

  const hasFilters = Boolean(search || kindFilter !== 'all' || formatFilter !== 'all' || pinnedOnly || expertOnly);
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const resetFilters = () => {
    setSearch('');
    setKindFilter('all');
    setFormatFilter('all');
    setPinnedOnly(false);
    setExpertOnly(false);
  };
  const copyFact = async (event, fact) => {
    event.stopPropagation();
    await navigator.clipboard.writeText(fact.value ?? '');
    setCopiedId(fact.id);
  };

  return (
    <main className="factor-page">
      <header className="factor-toolbar">
        <div className="factor-heading">
          <IconBolt size={20} />
          <h1>Factor</h1>
          <small>{filtered.length === facts.length ? `${facts.length} фактов` : `${filtered.length} из ${facts.length}`}</small>
        </div>
        <button className="factor-create" onClick={() => setCreating(true)} disabled={!activeScope}>
          <IconPlus size={17} />Новый факт
        </button>
      </header>

      <section className="factor-filters" aria-label="Фильтры фактов">
        <label className="factor-search">
          <IconSearch size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти факт…" />
          {search && <button type="button" onClick={() => setSearch('')} title="Очистить поиск"><IconX size={14} /></button>}
        </label>
        <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)} aria-label="Тип факта">
          <option value="all">Все типы</option>
          {Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)} aria-label="Формат факта">
          <option value="all">Все форматы</option>
          {Object.entries(formats).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="button" className={pinnedOnly ? 'is-active' : ''} onClick={() => setPinnedOnly((value) => !value)}>
          <IconStar size={14} />Закреплённые
        </button>
        <button type="button" className={expertOnly ? 'is-active' : ''} onClick={() => setExpertOnly((value) => !value)}>
          Экспертные
        </button>
        {hasFilters && <button type="button" className="factor-reset" onClick={resetFilters}><IconX size={14} />Сбросить</button>}
      </section>

      {!activeScope && <div className="factor-state">Выберите скоуп.</div>}
      {isLoading && <div className="factor-state">Загружаю факты…</div>}
      {error && <div className="factor-state factor-error">{error.message}</div>}

      {activeScope && !isLoading && !error && (
        <section className="fact-table" aria-label="Факты">
          <div className="fact-table-head" aria-hidden="true">
            <span>Название</span><span>Значение</span><span>Тип</span><span>Формат</span><span>Ед.</span><span />
          </div>
          {filtered.map((fact) => (
            <div
              key={fact.id}
              className={`fact-table-row ${fact.is_sensitive ? 'sensitive' : ''}`}
              role="button"
              tabIndex="0"
              onClick={() => setSelectedId(fact.id)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(fact.id); }}
            >
              <span className="fact-table-name">
                {fact.is_pinned && <IconStar size={13} fill="currentColor" />}
                <strong>{fact.label}</strong>
                {fact.is_expert && <em>expert</em>}
              </span>
              <span className={`fact-table-value ${fact.is_sensitive ? 'is-masked' : ''}`}>
                {fact.is_sensitive ? '••••••••' : fact.value}
              </span>
              <span>{kinds[fact.kind] ?? fact.kind}</span>
              <span className="fact-table-format">{formatIcon(fact.format)}{formats[fact.format] ?? fact.format}</span>
              <span>{fact.unit || '—'}</span>
              <button
                type="button"
                className={copiedId === fact.id ? 'fact-copy is-copied' : 'fact-copy'}
                onClick={(event) => copyFact(event, fact)}
                title={copiedId === fact.id ? 'Скопировано' : 'Скопировать значение'}
                aria-label={`Скопировать значение факта «${fact.label}»`}
              >
                {copiedId === fact.id ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </button>
            </div>
          ))}
          {!filtered.length && <div className="fact-table-empty">По этим фильтрам фактов нет.</div>}
        </section>
      )}

      {creating && <FactCreate scopeId={activeScope.id} onClose={() => setCreating(false)} onCreated={(fact) => { refresh(); setCreating(false); setSelectedId(fact.id); }} />}
      {selectedId && <><div className="factor-backdrop" onClick={() => setSelectedId(null)} /><FactEditor scopeId={activeScope.id} factId={selectedId} onClose={() => setSelectedId(null)} onChanged={refresh} /></>}
    </main>
  );
}

function FactCreate({ scopeId, onClose, onCreated }) {
  const [form, setForm] = useState({ label: '', value: '', format: 'text', kind: 'other', is_sensitive: false });
  const create = useMutation({ mutationFn: () => factApi.create(scopeId, form), onSuccess: onCreated });
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  return <div className="fact-modal-backdrop" onMouseDown={onClose}><form className="fact-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); create.mutate(); }}><header><strong>Новый факт</strong><button type="button" onClick={onClose}><IconX size={18} /></button></header><label>Название<input autoFocus required value={form.label} onChange={set('label')} placeholder="Адрес сервера 1С" /></label><div className="fact-form-row"><label>Формат<select value={form.format} onChange={set('format')}>{Object.entries(formats).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Тип<select value={form.kind} onChange={set('kind')}>{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><label>Значение<textarea required rows="5" value={form.value} onChange={set('value')} /></label><label className="fact-checkbox"><input type="checkbox" checked={form.is_sensitive} onChange={set('is_sensitive')} />Чувствительные данные</label>{create.error && <p className="factor-error">{create.error.message}</p>}<footer><button type="button" onClick={onClose}>Отмена</button><button className="fact-primary" disabled={create.isPending}>Создать</button></footer></form></div>;
}

function FactEditor({ scopeId, factId, onClose, onChanged }) {
  const queryClient = useQueryClient();
  const key = ['fact', scopeId, factId];
  const { data: fact, isLoading, error } = useQuery({ queryKey: key, queryFn: () => factApi.get(scopeId, factId) });
  const save = useMutation({ mutationFn: (payload) => factApi.update(scopeId, factId, payload), onSuccess: (updated) => { queryClient.setQueryData(key, updated); onChanged(); } });
  if (isLoading) return <aside className="fact-editor">Загружаю…</aside>;
  if (error) return <aside className="fact-editor factor-error">{error.message}</aside>;
  return <aside className="fact-editor"><header><span><IconBolt size={18} />Факт</span><button onClick={onClose}><IconX size={19} /></button></header><input className="fact-title" value={fact.label} onChange={(event) => queryClient.setQueryData(key, { ...fact, label: event.target.value })} onBlur={(event) => save.mutate({ label: event.target.value })} /><div className="fact-properties"><label>Формат<select value={fact.format} onChange={(event) => save.mutate({ format: event.target.value })}>{Object.entries(formats).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Тип<select value={fact.kind} onChange={(event) => save.mutate({ kind: event.target.value })}>{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Единица<input value={fact.unit ?? ''} onChange={(event) => queryClient.setQueryData(key, { ...fact, unit: event.target.value })} onBlur={(event) => save.mutate({ unit: event.target.value || null })} /></label></div>{fact.format === 'markdown' ? <Suspense fallback={<div className="factor-state">Загружаю Markdown…</div>}><MarkdownEditor variant="full" value={fact.value} placeholder="Содержание факта…" onSave={(value) => save.mutate({ value: value ?? '' })} /></Suspense> : <textarea className={`fact-value fact-value--${fact.format}`} defaultValue={fact.value} onBlur={(event) => save.mutate({ value: event.target.value })} />}<label className="fact-context">Контекст<textarea rows="4" defaultValue={fact.context ?? ''} onBlur={(event) => save.mutate({ context: event.target.value || null })} /></label><div className="fact-flags"><label><input type="checkbox" checked={fact.is_sensitive} onChange={(event) => save.mutate({ is_sensitive: event.target.checked })} />Чувствительный</label><label><input type="checkbox" checked={fact.is_expert} onChange={(event) => save.mutate({ is_expert: event.target.checked })} />Экспертный</label><label><input type="checkbox" checked={fact.is_pinned} onChange={(event) => save.mutate({ is_pinned: event.target.checked })} />Закреплён</label></div>{save.error && <p className="factor-error">{save.error.message}</p>}</aside>;
}

function formatIcon(format) {
  return format === 'code' || format === 'command' ? <IconCode size={14} /> : format === 'number' ? <IconHash size={14} /> : <IconFileText size={14} />;
}
