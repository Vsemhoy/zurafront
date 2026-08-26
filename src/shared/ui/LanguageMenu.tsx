import { useState } from 'react'
import { IconCheck, IconChevronDown, IconWorld } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

type Language = 'en' | 'ru' | 'zh-CN'
const languages: Array<{ code: Language; label: string; short: string }> = [
  { code: 'en', label: 'English', short: 'EN' }, { code: 'ru', label: 'Русский', short: 'RU' }, { code: 'zh-CN', label: '简体中文', short: '中文' },
]

export function LanguageMenu() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const active = languages.find((item) => item.code === i18n.language) ?? languages[0]
  return <div className="language"><button className="language__trigger" onClick={() => setOpen(!open)} aria-expanded={open}><IconWorld size={17}/><span>{active.short}</span><IconChevronDown size={15}/></button>{open && <div className="language__menu">{languages.map((item) => <button key={item.code} onClick={() => { void i18n.changeLanguage(item.code); setOpen(false) }}><span>{item.label}</span><small>{item.code}</small>{item.code === active.code && <IconCheck size={15}/>}</button>)}</div>}</div>
}
