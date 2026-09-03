import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconBell, IconBook2, IconBrain, IconBriefcase2, IconBuildingFactory2, IconCalendarEvent, IconCalendarStats, IconChartBar, IconChecklist, IconChevronDown, IconFolder, IconHome, IconPlus, IconSearch, IconUser, IconUsers, IconX } from '@tabler/icons-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth';
import { scopeApi } from '../../entities/scope/api';
import { contractorApi } from '../../entities/contractor/api';
import { Brand } from '../../shared/ui/Brand';
import { LanguageMenu } from '../../shared/ui/LanguageMenu';
import './ModuleRail.css';
const modules = [
    ['/', 'Home', IconHome, true, '#6d28d9', '#ede9fe'],
    ['/tasks', 'Tasker', IconChecklist, false, '#1d4ed8', '#dbeafe'],
    ['/planner', 'Planner', IconCalendarStats, false, '#0f766e', '#ccfbf1'],
    ['/projects', 'Projector', IconFolder, false, '#be185d', '#fce7f3'],
    ['/contractors', 'Contractor', IconUsers, false, '#7c3aed', '#ede9fe'],
    ['/kpi', 'KPI', IconChartBar, false, '#9333ea', '#f3e8ff'],
    ['/events', 'Eventor', IconCalendarEvent, false, '#2d6cdf', '#e7f0fd'],
    ['/factor', 'Factor', IconBuildingFactory2, false, '#2b6cb0', '#ebf4ff'],
    ['/lore', 'Lore', IconBrain, false, '#4f46a5', '#eeecff'],
    ['/books', 'Booker', IconBook2, false, '#d85a30', '#fdf1e7'],
];
function ScopeMenu({ scopes, active, onSelect, onClose }) {
    const queryClient = useQueryClient();
    const [creating, setCreating] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ name: '', slug: '', is_private: true });
    const createScope = useMutation({ mutationFn: () => scopeApi.create(form), onSuccess: (scope) => { queryClient.setQueryData(['scopes'], (current = []) => [scope, ...current]); onSelect(scope); onClose(); } });
    const filtered = scopes.filter((scope) => scope.name.toLowerCase().includes(search.toLowerCase()));
    return <div className="overlay" onMouseDown={onClose}><section className="scope-switcher" onMouseDown={(event) => event.stopPropagation()}>{creating ? <form className="scope-create" onSubmit={(event) => { event.preventDefault(); createScope.mutate(); }}><header><div><strong>Новый скоуп</strong><small>Изолированное рабочее пространство</small></div><button type="button" onClick={() => setCreating(false)}>×</button></header><label>Название<input autoFocus required value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="Работа или Личное"/></label><label>Системный адрес<input required minLength={2} pattern="[A-Za-z0-9_-]+" value={form.slug} onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))} placeholder="work"/><small>Только латиница, цифры, дефис и подчёркивание</small></label><label className="scope-private"><input type="checkbox" checked={form.is_private} onChange={(event) => setForm((value) => ({ ...value, is_private: event.target.checked }))}/><span><strong>Приватный скоуп</strong><small>Доступ только у добавленных участников</small></span></label>{createScope.error && <p className="scope-error">{createScope.error.message}</p>}<footer><button type="button" onClick={() => setCreating(false)}>Отмена</button><button className="scope-create-submit" disabled={createScope.isPending}>{createScope.isPending ? 'Создаю…' : 'Создать скоуп'}</button></footer></form> : <><div className="scope-search"><IconSearch size={20}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Переключить скоуп…"/><kbd>⌘K</kbd></div><p className="section-label">Доступные скоупы</p><div className="scope-list">{filtered.map((scope) => <button key={scope.id} className={`scope-row ${scope.id === active?.id ? 'scope-row--active' : ''}`} onClick={() => { onSelect(scope); onClose(); }}><span className="scope-icon scope-icon--work"><IconBriefcase2 size={20}/></span><span><strong>{scope.name}</strong><small>{scope.id === active?.id ? 'Активный' : scope.is_private ? 'Приватный' : 'Общий'}</small></span>{scope.id === active?.id && <i />}</button>)}{filtered.length === 0 && <p className="scope-empty">Ничего не найдено</p>}</div><footer><span>{scopes.length} {scopes.length === 1 ? 'скоуп' : 'скоупов'}</span><button onClick={() => setCreating(true)}><IconPlus size={16}/>Создать скоуп</button></footer></>}</section></div>;
}
export function AppShell() {
    const { t } = useTranslation();
    const { user, logout, check } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const searchRef = useRef(null);
    const [headerSearch, setHeaderSearch] = useState('');
    const stopActing = useMutation({ mutationFn: contractorApi.stopActing, onSuccess: () => check() });
    const { data: scopes = [] } = useQuery({ queryKey: ['scopes'], queryFn: scopeApi.list });
    const [activeScopeId, setActiveScopeId] = useState(() => localStorage.getItem('zuratax-active-scope'));
    const [scopeOpen, setScopeOpen] = useState(false);
    const routeScopeId = location.pathname.match(/^\/lore\/([^/]+)\//)?.[1];
    const activeScope = scopes.find((scope) => scope.id === routeScopeId) ?? scopes.find((scope) => scope.id === activeScopeId) ?? scopes[0] ?? null;
    useEffect(() => { if (activeScope)
        localStorage.setItem('zuratax-active-scope', activeScope.id); }, [activeScope]);
    useEffect(() => {
        const focusSearch = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', focusSearch);
        return () => window.removeEventListener('keydown', focusSearch);
    }, []);
    const submitSearch = (event) => {
        event.preventDefault();
        const query = headerSearch.trim();
        if (query.length >= 2) navigate(`/search?q=${encodeURIComponent(query)}`);
    };
    return <div className="app-shell"><aside className="module-rail"><Brand compact/>{modules.map(([to, label, Icon, end, color, tint]) => <NavLink key={to} to={to} end={end} title={label} aria-label={label} style={{ '--module-color': color, '--module-tint': tint }} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={21}/></NavLink>)}</aside><header className="app-header"><button className="scope-pill" onClick={() => setScopeOpen(true)}><i />{activeScope?.name ?? 'Скоуп не выбран'}<IconChevronDown size={16}/></button>{user?.acting_as && <div className="persona-chip"><IconUser size={15}/><span>От имени <strong>{user.acting_as.name}</strong></span><button title="Вернуться к себе" disabled={stopActing.isPending} onClick={() => stopActing.mutate()}><IconX size={14}/></button></div>}<form className="command-search" onSubmit={submitSearch}><IconSearch size={19}/><input ref={searchRef} value={headerSearch} onChange={(event) => setHeaderSearch(event.target.value)} placeholder={t('search')}/></form><div className="header-actions"><button aria-label="Create"><IconPlus /></button><button aria-label="Notifications"><IconBell /></button><LanguageMenu /><button className="avatar" onClick={() => void logout()} title={user?.name}>{user?.name.slice(0, 2).toUpperCase()}</button></div></header><Outlet context={{ activeScope }}/>{scopeOpen && <ScopeMenu scopes={scopes} active={activeScope} onSelect={(scope) => setActiveScopeId(scope.id)} onClose={() => setScopeOpen(false)}/>}<footer className="status-bar"><span><i />{t('status')}</span><span>Zuratax v2.1</span></footer></div>;
}
