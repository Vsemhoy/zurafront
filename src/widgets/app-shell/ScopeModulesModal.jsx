import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconArrowDown, IconArrowUp, IconGripVertical, IconLayoutGrid, IconX } from '@tabler/icons-react';
import { moduleCatalog, scopeModuleSettings, toggleModule } from '../../entities/scope/modules';
import { scopeApi } from '../../entities/scope/api';
import { useSaveForm } from '../../shared/ui/useSaveForm';
import { EditorSaveBar } from '../../shared/ui/EditorSaveBar';
import './ScopeModules.css';

function ModuleRow({ id, settings, change, move, index }) {
  const item = moduleCatalog[id];
  const enabled = settings.enabled[id];
  const blocked = (item.requires ?? []).some((parent) => !settings.enabled[parent]);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 2 : undefined }} className={`scope-module-row ${enabled ? '' : 'is-disabled'}`}>
    <button type="button" className="scope-module-grip" {...attributes} {...listeners} aria-label={`Переместить ${item.label}`}><IconGripVertical size={18}/></button>
    <label><input type="checkbox" checked={enabled} disabled={item.required || blocked} onChange={(event) => change((current) => toggleModule(current, id, event.target.checked))}/><span><strong>{item.label}</strong><small>{item.required ? 'Всегда включён · общие проекты' : item.requires ? 'Требуется Tasker' : id === 'tasker' ? 'При отключении выключаются Календарь, Planner, KPI и Reporter' : id === 'content' ? 'Схемы и Lightbook · вложения других модулей сохраняются' : enabled ? 'Включён' : 'Отключён · данные сохранены'}</small></span></label>
    <div className="scope-module-arrows"><button type="button" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`${item.label}: выше`}><IconArrowUp size={15}/></button><button type="button" disabled={index === settings.order.length - 1} onClick={() => move(index, index + 1)} aria-label={`${item.label}: ниже`}><IconArrowDown size={15}/></button></div>
  </li>;
}

export function ScopeModulesModal({ scope, onClose }) {
  const dialog = useRef(null);
  const client = useQueryClient();
  const form = useSaveForm({ initial: scopeModuleSettings(scope), label: `Модули скоупа «${scope.name}»`, persist: async (draft) => {
    const saved = await scopeApi.updateModules(scope.id, draft);
    const scoped = { predicate: (query) => query.queryKey.includes(scope.id) };
    await client.cancelQueries(scoped);
    client.removeQueries(scoped);
    client.setQueryData(['scopes'], (items = []) => items.map((item) => item.id === saved.id ? saved : item));
    return scopeModuleSettings(saved);
  } });
  const settings = form.draft;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const move = (from, to) => { if (from >= 0 && to >= 0 && from !== to) form.change((current) => ({ ...current, order: arrayMove(current.order, from, to) })); };
  const close = () => form.leave(onClose);
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} className="scope-modules-modal" aria-labelledby="scope-modules-title" onCancel={(event) => { event.preventDefault(); close(); }}>
    <header><h2 id="scope-modules-title"><IconLayoutGrid size={19}/>Модули и меню</h2><button type="button" onClick={close} aria-label="Закрыть модули"><IconX size={19}/></button></header>
    <p><strong>{scope.name}</strong> · Настройки для всех участников. Изменять их может только владелец.</p>
    <p className="scope-modules-hint">Перетаскивайте строки за ручку или используйте стрелки. Отключение скрывает модуль и закрывает доступ к нему, сохраняя данные.</p>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (over) move(settings.order.indexOf(active.id), settings.order.indexOf(over.id)); }}>
      <SortableContext items={settings.order} strategy={verticalListSortingStrategy}><ul>{settings.order.map((id, index) => <ModuleRow key={id} id={id} index={index} settings={settings} change={form.change} move={move}/>)}</ul></SortableContext>
    </DndContext>
    <p className="scope-modules-hint">Главная закреплена сверху. Пользователи и отделы — в служебном блоке снизу. Projector и инфраструктура вложений всегда доступны.</p>
    {form.error && <p role="alert" className="scope-modules-error">{form.error}</p>}
    <footer><EditorSaveBar {...form} onSave={form.save}><button type="button" onClick={close}>Закрыть</button></EditorSaveBar></footer>
  </dialog>;
}
