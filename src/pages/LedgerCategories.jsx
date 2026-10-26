import { useMemo, useState } from 'react';
import { IconChevronDown, IconChevronRight, IconFolder, IconPencil, IconPlus } from '@tabler/icons-react';
import { LEDGER_CATEGORY_LEVELS, ledgerCategoryOptions } from '../entities/ledger/categories';
import { categoryKinds } from '../entities/ledger/model';

export default function LedgerCategories({ categories, projects, onEdit, onAdd }) {
  const [collapsed, setCollapsed] = useState(new Set());
  const rows = useMemo(() => ledgerCategoryOptions(categories), [categories]);
  return <div className="ledger-category-tree">{rows.filter((row) => !row.ancestorIds.some((id) => collapsed.has(id))).map((row) => {
    const project = projects.find((item) => item.id === row.project_id);
    return <article key={row.id} className={row.is_archived || row.parentArchived ? 'is-archived' : ''} style={{ '--category-depth': row.depth }}>
      <button type="button" className="ledger-category-toggle" disabled={!row.hasChildren} aria-label={`${collapsed.has(row.id) ? 'Раскрыть' : 'Свернуть'} ${row.path}`} aria-expanded={row.hasChildren ? !collapsed.has(row.id) : undefined} onClick={() => setCollapsed((previous) => { const next = new Set(previous); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; })}>{row.hasChildren ? collapsed.has(row.id) ? <IconChevronRight size={15}/> : <IconChevronDown size={15}/> : <span/>}</button>
      <IconFolder size={17} style={{ color: row.color, flexShrink: 0 }}/>
      <div className="ledger-category-details"><strong title={row.path}>{row.title}</strong><small>{project?.title} · {categoryKinds[row.kind]}{row.is_archived ? ' · Архив' : row.parentArchived ? ' · Родитель в архиве' : ''}</small>{row.keywords?.length > 0 && <small className="ledger-category-keywords">Ключевые слова: {row.keywords.join(', ')}</small>}</div>
      {project?.can_manage && <div className="ledger-category-actions">{row.depth < LEDGER_CATEGORY_LEVELS - 1 && !row.is_archived && !row.parentArchived && <button type="button" title="Добавить подкатегорию" aria-label={`Добавить подкатегорию: ${row.path}`} onClick={() => onAdd(row)}><IconPlus size={15}/></button>}<button type="button" title="Настроить категорию" aria-label={`Настроить: ${row.path}`} onClick={() => onEdit(row)}><IconPencil size={15}/></button></div>}
    </article>;
  })}{!rows.length && <p className="ledger-empty">Категорий пока нет.</p>}</div>;
}
