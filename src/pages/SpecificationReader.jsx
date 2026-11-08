import { Link } from 'react-router-dom';
import { IconArrowUp, IconCheck, IconChevronRight, IconCopy, IconEdit } from '@tabler/icons-react';
import { acceptanceStates, implementationStates, itemKinds } from '../entities/specifier/model';
import { isSpecificationGroup, specificationBlockTypes, ungroupedSubpoints } from '../entities/specifier/composition';
import { AvatarImage } from '../shared/ui/AvatarImage';
import { SpecificationContentBlock } from './SpecificationStructure';

function EditableBlock({ label, onEdit, children }) {
  const edit = (event) => {
    if (event.target.closest('a, button, input, select, textarea')) return;
    onEdit();
  };
  return <div className={`sp-reader-block ${onEdit ? 'is-editable' : ''}`} onDoubleClick={onEdit ? edit : undefined}>
    {children}
    {onEdit && <button type="button" className="sp-reader-edit" aria-label={`Редактировать блок: ${label}`} onClick={onEdit}><IconEdit size={15}/></button>}
  </div>;
}

function ChildSpoiler({ item, onNavigate }) {
  return <button type="button" className="sp-child-spoiler" onClick={() => onNavigate(item.id)}>
    <small>{item.outline}</small><strong>{item.title}</strong><IconChevronRight size={16} aria-hidden="true"/>
  </button>;
}

export function SpecificationReader({ document, level, blocks, onNavigate, onEditBlock, onEditPoint, onCopyPoint, snapshot = false }) {
  const { point, ancestors, children, missing } = level;
  const childById = new Map(children.map((item) => [item.id, item]));
  const lead = point ? point.content : document.description;
  const leadBlock = { type: 'markdown', text: lead };
  const editLead = onEditBlock ? () => onEditBlock(null) : undefined;
  const renderBlock = (block) => <EditableBlock key={block.id} label={specificationBlockTypes[block.type]} onEdit={onEditBlock ? () => onEditBlock(block.id) : undefined}><SpecificationContentBlock block={block}/></EditableBlock>;
  const renderChild = (item) => <ChildSpoiler key={item.id} item={item} onNavigate={onNavigate}/>;
  const levelBlocks = point ? point.blocks ?? [] : blocks;
  const remaining = ungroupedSubpoints(levelBlocks, children);
  const renderLevelBlock = (block) => {
    if (!isSpecificationGroup(block)) return renderBlock(block);
    const direct = block.item_ids.map((id) => childById.get(id)).filter(Boolean);
    if (!direct.length && !block.title && !onEditBlock) return null;
    const label = block.title || specificationBlockTypes[block.type];
    return <EditableBlock key={block.id} label={label} onEdit={onEditBlock ? () => onEditBlock(block.id) : undefined}>
      <section className="sp-child-list sp-master-body" aria-label={label}>
        {block.title && <h3 className="sp-master-title">{block.title}</h3>}
        {direct.map(renderChild)}
        {!direct.length && onEditBlock && <p className="sp-hint">В этой группе пока нет подпунктов.</p>}
      </section>
    </EditableBlock>;
  };
  return <article className={snapshot ? 'sp-version-reader sp-level-reader' : 'sp-document sp-level-reader'}>
    {(point || missing) && <nav className="sp-breadcrumbs" aria-label="Путь по спецификации">
      <button type="button" className="sp-level-up" onClick={() => onNavigate(ancestors.at(-1)?.id ?? null)}><IconArrowUp size={14}/>На уровень выше</button>
      <button type="button" onClick={() => onNavigate(null)}>{document.title}</button>
      {ancestors.map((item) => <span key={item.id}><IconChevronRight size={13}/><button type="button" onClick={() => onNavigate(item.id)}>{item.outline} {item.title}</button></span>)}
    </nav>}
    {missing ? <p className="sp-error" role="alert">Указанный пункт удалён или недоступен.</p> : <>
      <header>
        <small>{point ? `P-${point.number} · ${itemKinds[point.kind]}` : document.code}</small>
        <div className="sp-level-title"><h2>{point ? `${point.outline} ${point.title}` : document.title}</h2>
          {point && (onCopyPoint || onEditPoint) && <div className="sp-actions">
            {onCopyPoint && <button type="button" aria-label={`Скопировать ссылку P-${point.number}`} onClick={() => onCopyPoint(point.id)}><IconCopy size={14}/></button>}
            {onEditPoint && <button type="button" aria-label={`Редактировать P-${point.number}`} onClick={() => onEditPoint(point)}><IconEdit size={15}/></button>}
          </div>}
        </div>
        {point && !snapshot && <div className="sp-item-meta">
          <span>{implementationStates[point.implementation_status]}</span><span className={`sp-acceptance ${point.acceptance_status}`}>{acceptanceStates[point.acceptance_status]}</span>
          {point.responsible && <span><AvatarImage avatar={point.responsible.avatar} name={point.responsible.name} size={20}/>{point.responsible.name}{point.responsible.type === 'agent' ? ' · агент' : ''}</span>}
        </div>}
      </header>
      {(lead || editLead) && <EditableBlock label={point ? 'Основной текст' : 'Введение'} onEdit={editLead}>
        {lead ? <SpecificationContentBlock block={leadBlock}/> : <p className="sp-hint">{point ? 'Добавить основной текст' : 'Добавить введение'}</p>}
      </EditableBlock>}
      {levelBlocks.map(renderLevelBlock)}
      {point ? <>
        {Boolean(point.acceptance_criteria?.length) && <div className="sp-criteria"><strong>Критерии приёмки</strong><ul>{point.acceptance_criteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul></div>}
        {Boolean(point.tasks?.length) && <div className="sp-task-chips">{point.tasks.map((task) => <Link key={task.id} to={`/tasks/${task.id}/edit`}>{task.task_key || 'Задача'}{task.status === 'done' && <IconCheck size={12}/>}</Link>)}</div>}
        {remaining.length > 0 && <section className="sp-child-list" aria-label="Подпункты"><h3>Подпункты</h3>{remaining.map(renderChild)}</section>}
      </> : remaining.map(renderChild)}
    </>}
  </article>;
}
