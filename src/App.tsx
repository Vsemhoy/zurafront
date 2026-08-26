import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IconBell, IconBook2, IconBriefcase2, IconBuildingFactory2, IconCalendarEvent, IconCheck,
  IconChecklist, IconChevronDown, IconClock, IconFileText, IconHome, IconKey, IconLock,
  IconMapPin, IconPlus, IconReceipt, IconRocket, IconSearch, IconSparkles, IconUser,
  IconWallet, IconWorld, IconX,
} from '@tabler/icons-react'
import './App.css'
import { useAuth } from './auth'

type Language = 'en' | 'ru' | 'zh-CN'

const languages: Array<{ code: Language; label: string; short: string }> = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'zh-CN', label: '简体中文', short: '中文' },
]

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand--compact' : ''}`}><span className="brand__mark">Z</span>{!compact && <strong>Zuratax</strong>}</div>
}

function LanguageMenu() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const active = languages.find((item) => item.code === i18n.language) ?? languages[0]
  return <div className="language"><button className="language__trigger" onClick={() => setOpen(!open)} aria-expanded={open}><IconWorld size={17}/><span>{active.short}</span><IconChevronDown size={15}/></button>{open && <div className="language__menu">{languages.map((item) => <button key={item.code} onClick={() => { void i18n.changeLanguage(item.code); setOpen(false) }}><span>{item.label}</span><small>{item.code}</small>{item.code === active.code && <IconCheck size={15}/>}</button>)}</div>}</div>
}

function PublicLogin({ onLogin }: { onLogin: (identity: string, password: string) => Promise<void> }) {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const inputs = event.currentTarget.querySelectorAll('input')
    setError(''); setSubmitting(true)
    try { await onLogin(inputs[0].value, inputs[1].value) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Login failed.') }
    finally { setSubmitting(false) }
  }
  return <main className="public-page">
    <section className="login-pane">
      <header className="public-header"><Brand/><LanguageMenu/></header>
      <div className="login-card">
        <p className="eyebrow">PRIVATE WORKSPACE</p><h1>{t('welcome')}</h1><p className="lead">{t('loginLead')}</p>
        <form onSubmit={submit}>
          <label>{t('identity')}<span className="field"><IconUser size={18}/><input type="text" placeholder="name@company.com" autoComplete="username" required/></span></label>
          <label><span className="label-row"><span>{t('password')}</span><a href="#forgot">{t('forgot')}</a></span><span className="field"><IconLock size={18}/><input type="password" placeholder="••••••••" autoComplete="current-password" required/></span></label>
          <button className="primary-button" type="submit">{t('login')} <span>→</span></button>
          {error && <p className="login-error" role="alert">{error}</p>}
          {submitting && <p className="login-progress" aria-live="polite">Signing in…</p>}
        </form>
        <div className="system-status"><span></span>{t('status')}</div>
      </div>
      <footer className="public-footer"><nav><a href="#features">{t('features')}</a><a href="#changelog">{t('changelog')}</a><a href="#docs">{t('docs')}</a><a href="https://github.com" target="_blank">GitHub</a><a href="#self-hosting">{t('selfHosting')}</a></nav><small>© 2026 Zuratax · v2.1</small></footer>
    </section>
    <section className="release-pane">
      <img src="/mascot-release.png" alt="" className="release-pane__image"/>
      <article className="release-card"><div className="release-card__meta"><span>{t('version')}</span><i></i></div><h2>{t('releaseTitle')}</h2><p>{t('releaseText')}</p><div className="release-features"><span><IconSparkles size={18}/> Smart sorting</span><span><IconRocket size={18}/> Faster workflows</span></div><div className="release-actions"><a href="#changelog">{t('whatsNew')} ↗</a><a href="https://github.com" target="_blank">{t('deploy')} ↗</a></div></article>
    </section>
  </main>
}

const modules = [IconHome, IconChecklist, IconWallet, IconCalendarEvent, IconBuildingFactory2, IconUser, IconBook2, IconBriefcase2, IconRocket, IconMapPin, IconFileText]

function ScopeSwitcher({ onClose, onPin }: { onClose: () => void; onPin: () => void }) {
  const { t } = useTranslation()
  return <div className="overlay" onMouseDown={onClose}><section className="scope-switcher" onMouseDown={(event) => event.stopPropagation()}><div className="scope-search"><IconSearch size={20}/><input placeholder={t('switchScope')}/><kbd>⌘K</kbd></div><p className="section-label">{t('activeRecent')}</p><button className="scope-row scope-row--active"><span className="scope-icon scope-icon--work"><IconBriefcase2 size={20}/></span><span><strong>{t('activeScope')}</strong><small>Active</small></span><i></i></button><button className="scope-row"><span className="scope-icon scope-icon--side"><IconRocket size={20}/></span><span><strong>Side Project Alpha</strong><small>{t('recent')}</small></span></button><p className="section-label">RESTRICTED</p><button className="scope-row scope-row--locked" onClick={onPin}><span className="scope-icon scope-icon--personal"><IconLock size={20}/></span><span><strong>{t('personal')}</strong><small>{t('privacy')}</small></span><span>›</span></button><footer><label><input type="checkbox"/> {t('hideLocked')}</label><div><button>{t('manage')}</button><button><IconPlus size={16}/> {t('createScope')}</button></div></footer></section></div>
}

function PinModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  return <div className="overlay"><section className="pin-modal"><button className="close-button" onClick={onClose}><IconX size={18}/></button><span className="pin-modal__icon"><IconLock/></span><h2>{t('enterPin')}</h2><p>{t('pinLead')}</p><div className="pin-cells">{[0,1,2,3].map((cell) => <input key={cell} inputMode="numeric" maxLength={1} type="password" aria-label={`PIN ${cell + 1}`}/>)}</div><p className="pin-error">{t('wrongPin')}</p><label className="auto-lock"><input type="checkbox" defaultChecked/> {t('lockAfter')}</label><div className="pin-actions"><button onClick={onClose}>{t('cancel')}</button><button className="primary-button"><IconKey size={17}/> {t('unlock')}</button></div></section></div>
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation()
  const [scopeOpen, setScopeOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  return <div className="app-shell">
    <aside className="module-rail"><Brand compact/>{modules.map((Icon, index) => <button className={index === 0 ? 'active' : ''} key={index} title={`Module ${index + 1}`}><Icon size={21}/></button>)}</aside>
    <header className="app-header"><button className="scope-pill" onClick={() => setScopeOpen(true)}><i></i>{t('activeScope')}<IconChevronDown size={16}/></button><label className="command-search"><IconSearch size={19}/><input placeholder={t('search')}/></label><div className="header-actions"><button><IconPlus/></button><button><IconBell/></button><LanguageMenu/><button className="avatar" onClick={onLogout}>ZA</button></div></header>
    <main className="dashboard"><section className="dashboard-main"><div className="dashboard-title"><div><p className="eyebrow"><span className="online-dot"></span>{t('status')}</p><h1>{t('dashboardGreeting')}</h1><p>{t('dashboardSummary')}</p></div><div className="quick-actions"><button className="blue"><IconPlus size={18}/>{t('newTask')}</button><button><IconClock size={18}/>{t('startTimer')}</button><button><IconReceipt size={18}/>{t('logExpense')}</button></div></div><section className="trajectory panel"><header><h2>{t('trajectory')}</h2><small>OCT 26</small></header><div className="timeline"><article className="timeline-row overdue"><strong>{t('overdue')}</strong><span>Submit Q3 corporate tax filing</span></article><article className="timeline-row progress"><strong>{t('inProgress')}</strong><span>Reconcile client ledger accounts <time>45:15</time></span></article><article className="timeline-row"><strong>{t('upcoming')}</strong><span>14:00 · Global expansion sync</span><span>16:30 · Review vendor contracts</span></article></div></section><h3 className="content-heading">{t('portfolios')}</h3><section className="portfolios"><article><strong>Alpha Merger Docs</strong><span>78%</span><i style={{width:'78%'}}></i></article><article><strong>Client Onboarding Q4</strong><span>32%</span><i style={{width:'32%'}}></i></article></section></section><aside className="dashboard-side"><article className="ledger-card"><small>{t('ledger')}</small><strong>$1.24M</strong><span>↗ +14% QoQ</span></article><article className="panel pinned-card"><small>{t('pinned')}</small><p>Corporate tax deadline moved to Nov 15.</p><p>Warehouse B inventory audit due Friday.</p></article><article className="assistant-card"><div><strong><IconSparkles size={18}/>{t('assistant')}</strong><p>{t('assistantText')}</p></div><img src="/mascot-release.png" alt=""/></article></aside></main>
    {scopeOpen && <ScopeSwitcher onClose={() => setScopeOpen(false)} onPin={() => { setScopeOpen(false); setPinOpen(true) }}/>} {pinOpen && <PinModal onClose={() => setPinOpen(false)}/>}<footer className="status-bar"><span><i></i>{t('status')}</span><span>Zuratax v2.1</span></footer>
  </div>
}

export default function App() {
  const { user, status, check, login, logout } = useAuth()
  useEffect(() => { void check() }, [check])

  if (status === 'checking') return <main className="auth-loading"><Brand/><span>Loading workspace…</span></main>
  return user ? <Dashboard onLogout={() => void logout()}/> : <PublicLogin onLogin={login}/>
}
