import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconBriefcase2, IconLayoutGrid, IconPalette, IconPlus, IconSearch } from '@tabler/icons-react';
import { scopeApi } from '../../entities/scope/api';
import { canManageScopeAppearance, headerThemeBackground, scopeHeaderTheme } from '../../entities/scope/appearance';
import './ScopeAppearance.css';

export function ScopeMenu({ scopes, active, userId, onSelect, onAppearance, onClose, canManageModules, onModules }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', slug: '', is_private: true });
  const createScope = useMutation({ mutationFn: () => scopeApi.create(form), onSuccess: (scope) => { queryClient.setQueryData(['scopes'], (current = []) => [scope, ...current]); onSelect(scope); onClose(); } });
  const filtered = scopes.filter((scope) => scope.name.toLowerCase().includes(search.toLowerCase()));
  return <div className="overlay" onMouseDown={onClose}>
    <section className="scope-switcher" role="dialog" aria-modal="true" aria-label="Выбор скоупа" onMouseDown={(event) => event.stopPropagation()}>
      {creating ? <form className="scope-create" onSubmit={(event) => { event.preventDefault(); createScope.mutate(); }}>
        <header><div><strong>Новый скоуп</strong><small>Изолированное рабочее пространство</small></div><button type="button" onClick={() => setCreating(false)}>×</button></header>
        <label>Название<input autoFocus required value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="Работа или Личное"/></label>
        <label>Системный адрес<input required minLength={2} pattern="[A-Za-z0-9_-]+" value={form.slug} onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))} placeholder="work"/><small>Только латиница, цифры, дефис и подчёркивание</small></label>
        <label className="scope-private"><input type="checkbox" checked={form.is_private} onChange={(event) => setForm((value) => ({ ...value, is_private: event.target.checked }))}/><span><strong>Приватный скоуп</strong><small>Доступ только у добавленных участников</small></span></label>
        {createScope.error && <p className="scope-error">{createScope.error.message}</p>}
        <footer><button type="button" onClick={() => setCreating(false)}>Отмена</button><button className="scope-create-submit" disabled={createScope.isPending}>{createScope.isPending ? 'Создаю…' : 'Создать скоуп'}</button></footer>
      </form> : <>
        <div className="scope-search"><IconSearch size={20}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Переключить скоуп…"/><kbd>⌘K</kbd></div>
        <p className="section-label">Доступные скоупы</p>
        <div className="scope-list">{filtered.map((scope) => {
          const isActive = scope.id === active?.id;
          return <div key={scope.id} className={`scope-row ${isActive ? 'scope-row--active' : ''}`} style={isActive ? { backgroundImage: headerThemeBackground(scopeHeaderTheme(scope)) } : undefined}>
            <button type="button" className="scope-row-select" aria-current={isActive ? 'true' : undefined} onClick={() => { onSelect(scope); onClose(); }}>
              <span className="scope-icon scope-icon--work"><IconBriefcase2 size={20}/></span>
              <span className="scope-row-label"><strong>{scope.name}</strong><small>{isActive ? 'Активный' : scope.is_private ? 'Приватный' : 'Общий'}</small></span>
            </button>
            {isActive && canManageModules && <button type="button" className="scope-appearance-trigger" aria-label={`Модули скоупа «${scope.name}»`} title="Модули и меню" onClick={onModules}><IconLayoutGrid size={18}/></button>}
            {isActive && (canManageScopeAppearance(scope, userId)
              ? <button type="button" className="scope-appearance-trigger" aria-label={`Оформление скоупа «${scope.name}»`} title="Оформление скоупа" onClick={onAppearance}><IconPalette size={18}/></button>
              : <i aria-label="Активный скоуп"/>)}
          </div>;
        })}{filtered.length === 0 && <p className="scope-empty">Ничего не найдено</p>}</div>
        <footer><span>{scopes.length} {scopes.length === 1 ? 'скоуп' : 'скоупов'}</span><button onClick={() => setCreating(true)}><IconPlus size={16}/>Создать скоуп</button></footer>
      </>}
    </section>
  </div>;
}
