import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconBell, IconBook2, IconBriefcase2, IconBuildingFactory2, IconCalendarEvent, IconChecklist, IconChevronDown, IconFileText, IconHome, IconMapPin, IconPlus, IconRocket, IconSearch, IconUser, IconWallet } from '@tabler/icons-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth'
import { scopeApi } from '../../entities/scope/api'
import type { Scope } from '../../entities/scope/model'
import { Brand } from '../../shared/ui/Brand'
import { LanguageMenu } from '../../shared/ui/LanguageMenu'

const modules = [
  ['/', 'Home', IconHome, true], ['/tasks', 'Tasker', IconChecklist], ['/ledger', 'Ledger', IconWallet], ['/events', 'Eventor', IconCalendarEvent], ['/factor', 'Factor', IconBuildingFactory2], ['/contacts', 'Contactor', IconUser], ['/books', 'Booker', IconBook2], ['/stuffer', 'Stuffer', IconBriefcase2], ['/exploiter', 'Exploiter', IconRocket], ['/tracker', 'Tracker', IconMapPin], ['/reports', 'Reporter', IconFileText],
] as const

function ScopeMenu({ scopes, active, onSelect, onClose }: { scopes: Scope[]; active: Scope | null; onSelect: (scope: Scope) => void; onClose: () => void }) {
  return <div className="overlay" onMouseDown={onClose}><section className="scope-switcher" onMouseDown={(event) => event.stopPropagation()}><div className="scope-search"><IconSearch size={20}/><input placeholder="Переключить скоуп…"/><kbd>⌘K</kbd></div><p className="section-label">Доступные скоупы</p>{scopes.map((scope) => <button key={scope.id} className={`scope-row ${scope.id === active?.id ? 'scope-row--active' : ''}`} onClick={() => { onSelect(scope); onClose() }}><span className="scope-icon scope-icon--work"><IconBriefcase2 size={20}/></span><span><strong>{scope.name}</strong><small>{scope.id === active?.id ? 'Active' : 'Workspace'}</small></span>{scope.id === active?.id && <i/>}</button>)}</section></div>
}

export function AppShell() {
  const { t } = useTranslation(); const { user, logout } = useAuth(); const { data: scopes = [] } = useQuery({ queryKey: ['scopes'], queryFn: scopeApi.list })
  const [activeScopeId, setActiveScopeId] = useState(() => localStorage.getItem('zuratax-active-scope')); const [scopeOpen, setScopeOpen] = useState(false)
  const activeScope = scopes.find((scope) => scope.id === activeScopeId) ?? scopes[0] ?? null
  useEffect(() => { if (activeScope) localStorage.setItem('zuratax-active-scope', activeScope.id) }, [activeScope])
  return <div className="app-shell"><aside className="module-rail"><Brand compact/>{modules.map(([to, label, Icon, end]) => <NavLink key={to} to={to} end={end} title={label} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={21}/></NavLink>)}</aside><header className="app-header"><button className="scope-pill" onClick={() => setScopeOpen(true)}><i/>{activeScope?.name ?? 'Скоуп не выбран'}<IconChevronDown size={16}/></button><label className="command-search"><IconSearch size={19}/><input placeholder={t('search')}/></label><div className="header-actions"><button aria-label="Create"><IconPlus/></button><button aria-label="Notifications"><IconBell/></button><LanguageMenu/><button className="avatar" onClick={() => void logout()} title={user?.name}>{user?.name.slice(0, 2).toUpperCase()}</button></div></header><Outlet context={{ activeScope }}/>{scopeOpen && <ScopeMenu scopes={scopes} active={activeScope} onSelect={(scope) => setActiveScopeId(scope.id)} onClose={() => setScopeOpen(false)}/>}<footer className="status-bar"><span><i/>{t('status')}</span><span>Zuratax v2.1</span></footer></div>
}
