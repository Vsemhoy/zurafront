import { canManageScopeModules, moduleCatalog, moduleEnabled, moduleForPath, visibleModuleOrder } from '../../entities/scope/modules';
import { ScopeModulesModal } from './ScopeModulesModal';
import { AvatarImage } from '../../shared/ui/AvatarImage';
import { IconAddressBook, IconBox, IconCoin, IconTool } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { IconMoon, IconFiles, IconActivity, IconBell, IconBook2, IconBrain, IconBriefcase2, IconBuildingFactory2, IconCalendarEvent, IconCalendarStats, IconChartBar, IconChecklist, IconChevronDown, IconFolder, IconHome, IconLogout, IconRoute, IconSearch, IconUser, IconUsers, IconX } from '@tabler/icons-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth';
import { scopeApi } from '../../entities/scope/api';
import { headerThemeStartBackground, headerThemeStyle, scopeHeaderTheme } from '../../entities/scope/appearance';
import { ScopeAppearanceModal } from './ScopeAppearanceModal';
import { ScopeMenu } from './ScopeMenu';
import { contractorApi } from '../../entities/contractor/api';
import { darklogTheme } from '../../entities/darklog/model';
import { Brand } from '../../shared/ui/Brand';
import { LanguageMenu } from '../../shared/ui/LanguageMenu';
import { useGuardedEditorAction } from '../../shared/ui/editorGuard';
import './ModuleRail.css';
import './AvatarMenu.css';
import './AppShellLayers.css';
const modules = [
    ['/', 'Home', IconHome, true, '#6d28d9', '#ede9fe'],
    ['/tasks', 'Tasker', IconChecklist, false, '#1d4ed8', '#dbeafe'],
    ['/plans', 'Planner', IconRoute, false, '#0f766e', '#ccfbf1'],
    ['/planner', 'Календарь', IconCalendarStats, false, '#0f766e', '#ccfbf1'],
    ['/projects', 'Projector', IconFolder, false, '#be185d', '#fce7f3'],
    ['/kpi', 'KPI', IconChartBar, false, '#9333ea', '#f3e8ff'],
    ['/reports', 'Reporter', IconBriefcase2, false, '#0369a1', '#e0f2fe'],
    ['/events', 'Eventor', IconCalendarEvent, false, '#2d6cdf', '#e7f0fd'],
    ['/contacts', 'Contactor · Контакты', IconAddressBook, false, '#b83280', '#fce7f3'],
    ['/factor', 'Factor', IconBuildingFactory2, false, '#2b6cb0', '#ebf4ff'],
    ['/darklog', 'Darklog', IconMoon, false, darklogTheme.color, darklogTheme.tint],
    ['/lore', 'Lore', IconBrain, false, '#4f46a5', '#eeecff'],
    ['/books', 'Booker', IconBook2, false, '#d85a30', '#fdf1e7'],
    ['/content', 'Контент', IconFiles, false, '#366a91', '#e2eef7'],
    ['/equip', 'Equip · Экипа', IconBox, false, '#087f72', '#e1f3ee'],
    ['/ledger', 'Ledger', IconCoin, false, '#7c6a46', '#f3eedf'],
    ['/exploiter', 'Exploiter', IconTool, false, '#a45b16', '#fff0db'],
    ['/contractors', 'Пользователи', IconUsers, false, '#7c3aed', '#ede9fe'],
    ['/departments', 'Отделы', IconBuildingFactory2, false, '#0369a1', '#e0f2fe'],
];
export function AppShell() {
    const { t } = useTranslation();
    const { user, logout: rawLogout, check } = useAuth();
    const guardAction = useGuardedEditorAction();
    const logout = () => guardAction(() => { void rawLogout(); });
    const navigate = useNavigate();
    const location = useLocation();
    const searchRef = useRef(null);
    const [headerSearch, setHeaderSearch] = useState('');
    const rawStopActing = useMutation({ mutationFn: contractorApi.stopActing, onSuccess: () => check() });
    const stopActing = { ...rawStopActing, mutate: () => guardAction(() => rawStopActing.mutate()) };
    const { data: scopes = [] } = useQuery({ queryKey: ['scopes'], queryFn: scopeApi.list, refetchInterval: 30000 });
    const [activeScopeId, setActiveScopeId] = useState(() => localStorage.getItem('zuratax-active-scope'));
    const [scopeOpen, setScopeOpen] = useState(false);
    const [modulesOpen, setModulesOpen] = useState(false);
    const [appearanceOpen, setAppearanceOpen] = useState(false);
    const [appearancePreview, setAppearancePreview] = useState(null);
    const [avatarOpen, setAvatarOpen] = useState(false);
    const routeScopeId = location.pathname.match(/^\/(?:lore|darklog|ledger|exploiter|factor|contacts)\/([^/]+)\//)?.[1]
        ?? location.pathname.match(/^\/content\/diagrams\/([^/]+)\//)?.[1];
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
        if (query.length >= 2) navigate(`/search?type=${moduleEnabled(activeScope, 'tasker') ? 'task' : 'all'}&q=${encodeURIComponent(query)}`);
    };
    const selectScope = (scope) => {
      if (scope.id === activeScope?.id) return;
      guardAction(() => {
        setActiveScopeId(scope.id);
        if (routeScopeId) navigate(moduleCatalog[moduleForPath(location.pathname)]?.path ?? '/');
      });
    };
    const currentModule = moduleForPath(location.pathname);
    const unavailable = activeScope && currentModule && !moduleEnabled(activeScope, currentModule);
    const canManageModules = canManageScopeModules(activeScope, user);
    const menu = visibleModuleOrder(activeScope).map((id) => modules.find(([path]) => path === moduleCatalog[id].path)).filter(Boolean);
    const openModules = () => guardAction(() => { setScopeOpen(false); setModulesOpen(true); });
    const headerTheme = scopeHeaderTheme(activeScope, appearancePreview);
    return <div className="app-shell">
      <aside className="module-rail"><div className="module-rail-brand" style={{ backgroundColor: headerThemeStartBackground(headerTheme) }}><Brand compact/></div>{menu.map(([to, label, Icon, end, color, tint]) => <NavLink key={to} to={to} end={end} title={label} aria-label={label} style={{ '--module-color': color, '--module-tint': tint }} className={({ isActive }) => `${isActive ? 'active' : ''} ${to === '/contractors' ? 'module-people' : ''}`}><Icon size={21}/></NavLink>)}</aside>
      <header className="app-header app-header--themed" style={headerThemeStyle(headerTheme)}>
        <button className="scope-pill" onClick={() => setScopeOpen(true)}><i/><span>{activeScope?.name ?? 'Скоуп не выбран'}</span><IconChevronDown size={16}/></button>
        {user?.acting_as && <div className="persona-chip"><IconUser size={15}/><span>От имени <strong>{user.acting_as.name}</strong></span><button title="Вернуться к себе" disabled={stopActing.isPending} onClick={() => stopActing.mutate()}><IconX size={14}/></button></div>}
        <form className="command-search" onSubmit={submitSearch}><IconSearch size={19}/><input ref={searchRef} value={headerSearch} onChange={(event) => setHeaderSearch(event.target.value)} placeholder={t('search')}/></form>
        <div className="header-actions"><button className={`monitoring-trigger ${location.pathname === '/monitoring' ? 'active' : ''}`} aria-label="Мониторинг сервера" title="Мониторинг сервера" onClick={() => navigate('/monitoring')}><IconActivity /></button><button aria-label="Notifications"><IconBell /></button><LanguageMenu /><div className="avatar-menu-wrap"><button className="avatar" onClick={() => setAvatarOpen(!avatarOpen)} title={user?.name} aria-expanded={avatarOpen}>{user?.avatar ? <AvatarImage avatar={user.avatar} name={user.name}/> : user?.name.slice(0, 2).toUpperCase()}</button>{avatarOpen && <div className="avatar-menu"><header><strong>{user?.name}</strong><small>{user?.email ?? user?.identity ?? ''}</small></header><button className="avatar-menu__item" onClick={() => { setAvatarOpen(false); void logout(); }}><IconLogout size={16}/><span>Логаут</span></button></div>}</div></div>
      </header>
      {unavailable ? <main className="scope-module-unavailable"><h1>{moduleCatalog[currentModule].label} отключён</h1><p>Владелец отключил этот модуль в скоупе «{activeScope.name}». Данные сохранены.</p>{canManageModules && <button onClick={openModules}>Настроить модули</button>}<button onClick={() => navigate('/')}>На главную</button></main> : <Outlet key={`${activeScope?.id}:${JSON.stringify(activeScope?.modules?.enabled)}`} context={{ activeScope }}/>}
      {scopeOpen && <ScopeMenu scopes={scopes} active={activeScope} userId={user?.id} canManageModules={canManageModules} onModules={openModules} onSelect={selectScope} onAppearance={() => guardAction(() => { setScopeOpen(false); setAppearanceOpen(true); })} onClose={() => setScopeOpen(false)}/>}
      {modulesOpen && canManageModules && activeScope && <ScopeModulesModal key={activeScope.id} scope={activeScope} onClose={() => setModulesOpen(false)}/>}
      {appearanceOpen && activeScope && <ScopeAppearanceModal key={activeScope.id} scope={activeScope} onClose={() => setAppearanceOpen(false)} onPreview={setAppearancePreview}/>}
      <footer className="status-bar"><span><i />{t('status')}</span><span>Zuratax v2.1</span></footer>
    </div>;
}
