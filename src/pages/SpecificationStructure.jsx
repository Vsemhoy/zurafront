import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { IconArrowDown, IconArrowUp, IconEdit, IconGripVertical, IconPlus, IconTrash } from '@tabler/icons-react';
import { isSpecificationGroup, movePlacedItem, moveSpecificationBlock, newSpecificationBlock, removeSpecificationBlock, specificationBlockTypes, ungroupedSubpoints, ungroupedSubpointsId } from '../entities/specifier/composition';
import { specificationDraftKey } from '../entities/specifier/model';
import { specifierApi } from '../entities/specifier/api';
import MarkdownRenderer from '../shared/ui/MarkdownRenderer';
import { EditorSaveBar } from '../shared/ui/EditorSaveBar';
import { useSaveForm } from '../shared/ui/useSaveForm';

function webUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function SpecificationContentBlock({ block }) {
  const { title, text, type, language } = block;
  if (type === 'divider') return <div className="sp-divider-block">{title && <small>{title}</small>}<hr className="sp-content-divider"/></div>;
  if (type === 'code') return <figure className="sp-content-block">{(title || language) && <figcaption>{title || language}</figcaption>}<pre><code>{text}</code></pre></figure>;
  if (type === 'image' || type === 'svg') {
    const src = type === 'svg'
      ? (/^\s*<svg(?:\s|>)/i.test(text ?? '') ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}` : null)
      : webUrl(block.url);
    return src ? <figure className="sp-content-block"><img src={src} alt={title ?? ''} loading="lazy" referrerPolicy="no-referrer"/>{title && <figcaption>{title}</figcaption>}</figure> : <p className="sp-hint">Источник изображения не задан.</p>;
  }
  if (type === 'link') {
    const href = webUrl(block.url);
    return href ? <p className="sp-content-block"><a href={href} target="_blank" rel="noopener noreferrer">{title || href}</a></p> : <p className="sp-hint">Адрес ссылки не задан.</p>;
  }
  return <div className={`sp-content-block ${type === 'callout' ? 'sp-callout' : ''}`}>
    {title && <strong>{title}</strong>}{text ? <MarkdownRenderer>{text}</MarkdownRenderer> : !title && <p className="sp-hint">Пустой блок</p>}
  </div>;
}

export function SpecificationBlockFields({ block, onChange, markdown, markdownControlsRef, lead = false }) {
  const usesUrl = ['image', 'link'].includes(block.type);
  const hasText = !usesUrl && !isSpecificationGroup(block) && block.type !== 'divider';
  const isMarkdown = ['markdown', 'callout'].includes(block.type);
  const titleField = !lead && <label>Заголовок<input maxLength={255} value={block.title ?? ''} onChange={(event) => onChange({ title: event.target.value })}/></label>;
  return <div className={`sp-structure-fields${markdownControlsRef ? ' sp-structure-fields--markdown' : ''}`}>
    {markdownControlsRef ? <div className="sp-md-title-row">{titleField || <small>Markdown</small>}<div ref={markdownControlsRef}/></div> : titleField}
    {usesUrl && <label>URL<input type="url" required maxLength={2048} value={block.url ?? ''} placeholder="https://…" onChange={(event) => onChange({ url: event.target.value })}/></label>}
    {block.type === 'code' && <label>Язык<input maxLength={40} value={block.language ?? ''} onChange={(event) => onChange({ language: event.target.value })}/></label>}
    {hasText && (isMarkdown && markdown ? markdown : <label>{block.type === 'svg' ? 'Исходник SVG' : block.type === 'code' ? 'Код' : 'Markdown'}<textarea rows={8} maxLength={50000} value={block.text ?? ''} onChange={(event) => onChange({ text: event.target.value })}/></label>)}
  </div>;
}

const groupLabel = (block, groups) => block.id === ungroupedSubpointsId ? 'Без группы' : `Группа подпунктов ${groups.indexOf(block) + 1}`;

function PlacementRow({ item, master, masters, disabled, select, move }) {
  const data = { masterId: master.id, beforeId: item.id };
  const { setNodeRef, isOver } = useDroppable({ id: `before:${item.id}`, data, disabled });
  const { isDragging, setNodeRef: setDragRef, setActivatorNodeRef, attributes, listeners } = useDraggable({ id: `item:${item.id}`, data: { itemId: item.id }, disabled });
  return <div className={`sp-placement ${isOver && !isDragging ? 'is-over' : ''} ${isDragging ? 'is-dragging' : ''}`} ref={setNodeRef}>
    {!disabled && <button type="button" className="sp-placement-grip" ref={setActivatorNodeRef} aria-label={`Перетащить P-${item.number}`} {...attributes} {...listeners}><IconGripVertical size={15}/></button>}
    <button type="button" className="sp-placement-name" ref={setDragRef} onClick={() => select(item.id)} title={item.title}><small>{item.outline}</small>{item.title}</button>
    {!disabled && masters.length > 1 && <select aria-label={`Группа для P-${item.number}`} value={master.id} onChange={(event) => move(item.id, event.target.value)}>{masters.map((block) => <option key={block.id} value={block.id}>{block.title || groupLabel(block, masters)}</option>)}</select>}
  </div>;
}

function MasterEnd({ id, disabled }) {
  const { setNodeRef, isOver } = useDroppable({ id: `end:${id}`, data: { masterId: id, beforeId: null }, disabled });
  return <div ref={setNodeRef} className={`sp-master-drop ${isOver ? 'is-over' : ''}`}>Перетащите пункт сюда</div>;
}

export function StructureBlockList({ blocks, onChange, editable, itemsById, onSelect, onAddPoint, savedGroupIds, nested = false }) {
  const [editing, setEditing] = useState(null);
  const [dragged, setDragged] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const masters = blocks.filter(isSpecificationGroup);
  const ungrouped = blocks.find(({ id }) => id === ungroupedSubpointsId);
  const move = (itemId, masterId, beforeId) => onChange(movePlacedItem(blocks, itemId, masterId, beforeId));
  const change = (id, patch) => onChange(blocks.map((block) => block.id === id ? { ...block, ...patch } : block));
  const add = (event) => {
    const block = newSpecificationBlock(event.target.value);
    if (block.type === 'subpoints' && !masters.some((group) => group.id !== ungroupedSubpointsId)) {
      block.item_ids = ungrouped?.item_ids ?? [];
    }
    onChange([...blocks.filter((row) => row !== ungrouped), block]);
    setEditing(block.id);
  };
  return <div className="sp-structure">
    {editable && <label className="sp-structure-add"><IconPlus size={15}/><select aria-label="Добавить блок" value="" onChange={add} disabled={blocks.length - Number(Boolean(ungrouped)) >= 100}><option value="" disabled>Добавить блок…</option>{Object.entries(specificationBlockTypes).filter(([type]) => type !== (nested ? 'master' : 'subpoints')).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label>}
    {!blocks.some((block) => block !== ungrouped) && <p className="sp-hint">Блоков пока нет.</p>}
    <DndContext sensors={sensors} collisionDetection={pointerWithin}
      onDragStart={({ active }) => setDragged(active.data.current?.itemId)}
      onDragCancel={() => setDragged(null)}
      onDragEnd={({ active, over }) => { setDragged(null); if (editable && over?.data.current) move(active.data.current.itemId, over.data.current.masterId, over.data.current.beforeId); }}>
      {blocks.map((block, index) => {
        const master = isSpecificationGroup(block);
        const virtual = block === ungrouped;
        if (virtual && !block.item_ids.length && masters.length === 1) return null;
        const typeLabel = master ? groupLabel(block, masters) : specificationBlockTypes[block.type];
        const visibleItems = master ? block.item_ids.map((id) => itemsById.get(id)).filter(Boolean) : [];
        return <section className="sp-structure-block" key={block.id}>
          <header><strong>{block.title || typeLabel}</strong>{editable && !virtual && <div>
            <button type="button" aria-label={`Редактировать: ${typeLabel}`} aria-expanded={editing === block.id} onClick={() => setEditing(editing === block.id ? null : block.id)}><IconEdit size={14}/></button>
            <button type="button" aria-label={`Выше: ${typeLabel}`} disabled={index === 0} onClick={() => onChange(moveSpecificationBlock(blocks, block.id, -1))}><IconArrowUp size={13}/></button>
            <button type="button" aria-label={`Ниже: ${typeLabel}`} disabled={index === blocks.length - 1 || blocks[index + 1] === ungrouped} onClick={() => onChange(moveSpecificationBlock(blocks, block.id, 1))}><IconArrowDown size={13}/></button>
            <button type="button" aria-label={`Убрать: ${typeLabel}`} disabled={master && !nested && masters.length === 1} title={master ? 'Убрать группу; подпункты не удалятся' : 'Убрать блок'} onClick={() => onChange(removeSpecificationBlock(blocks, block.id))}><IconTrash size={13}/></button>
          </div>}</header>
          {editable && !virtual && editing === block.id && <SpecificationBlockFields block={block} onChange={(patch) => change(block.id, patch)}/>}
          {master && <>
            {visibleItems.map((item) => <PlacementRow key={item.id} item={item} master={block} masters={masters} disabled={!editable} select={onSelect} move={move}/>)}
            {editable && (!virtual || masters.length > 1) && <MasterEnd id={block.id} disabled={!editable}/>}
            {!editable && !visibleItems.length && <p className="sp-hint">Нет пунктов.</p>}
            {editable && onAddPoint && !virtual && (nested || savedGroupIds?.has(block.id)) && <button type="button" className="sp-master-add"
              disabled={!savedGroupIds?.has(block.id)} title={!savedGroupIds?.has(block.id) ? 'Сначала сохраните группу' : undefined}
              onClick={() => onAddPoint(block.id)}><IconPlus size={14}/>Пункт в эту группу</button>}
          </>}
        </section>;
      })}
      <DragOverlay>{dragged && <div className="sp-placement-overlay">{itemsById?.get(dragged)?.title}</div>}</DragOverlay>
    </DndContext>
  </div>;
}

export function PointBlockStructure({ scope, document, item, childrenById, onSelect, onAddPoint, active, onPersisted }) {
  const editable = document.status === 'draft' && item.can_write;
  const initial = useMemo(() => ({ revision: document.revision, blocks: item.blocks ?? [] }), [document.revision, item.blocks]);
  const form = useSaveForm({ initial, label: 'Блоки пункта', active: editable && active, key: specificationDraftKey,
    persist: async (draft, baseline) => {
      const value = await specifierApi.item(scope.id, document.id, item.id, { revision: baseline.revision, blocks: draft.blocks });
      onPersisted(value);
      return { revision: value.revision, blocks: value.items.find(({ id }) => id === item.id)?.blocks ?? [] };
    } });
  const blocks = editable ? form.draft.blocks : initial.blocks;
  const ungrouped = ungroupedSubpoints(blocks, [...childrenById.values()]);
  const displayBlocks = editable || ungrouped.length ? [...blocks, { id: ungroupedSubpointsId, type: 'subpoints', item_ids: ungrouped.map(({ id }) => id) }] : blocks;
  return <>
    <p className="sp-hint">Группы можно разместить между блоками. Подпункты без группы остаются внизу страницы.</p>
    <StructureBlockList nested blocks={displayBlocks} itemsById={childrenById} onSelect={onSelect} editable={editable && !form.busy}
      onAddPoint={document.can_write ? onAddPoint : undefined} savedGroupIds={new Set(initial.blocks.filter(isSpecificationGroup).map(({ id }) => id))}
      onChange={(next) => form.change((old) => ({ ...old, blocks: next.filter(({ id }) => id !== ungroupedSubpointsId) }))}/>
    {form.error && <p className="sp-error" role="alert">{form.error}</p>}
    {editable && <EditorSaveBar {...form} onSave={form.save}/>}
  </>;
}
