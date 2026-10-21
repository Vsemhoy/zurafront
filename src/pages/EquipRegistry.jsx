import { equipColumns, defaultColumns } from '../entities/equip/registry';
import { IconBox } from '@tabler/icons-react';
import { FileImage } from '../shared/ui/PhotoPanel';
import { conditions, suitability, containerKinds, ownerLabel } from '../entities/equip/model';
import { departmentShortLabel } from '../entities/department/model';

export function EquipPhoto({ scopeId, thing }) {
  return <span className="equip-card-icon">{thing.cover_photo_id ? <FileImage scopeId={scopeId} fileId={thing.cover_photo_id} alt={`Фото: ${thing.name}`} className="equip-cover"/> : <IconBox size={23}/>}</span>;
}

export function EquipViewControls({ view, onView, columns, onColumns, sort, direction, onSort }) {
  return <div className="equip-view-controls">
    <div className="equip-view-switch" role="group" aria-label="Вид реестра"><button type="button" aria-pressed={view === 'cards'} onClick={() => onView('cards')}>Карточки</button><button type="button" aria-pressed={view === 'table'} onClick={() => onView('table')}>Таблица</button></div>
    <label className="equip-sort-label">Сортировка<select aria-label="Сортировка оборудования" value={sort} onChange={(event) => onSort(event.target.value, event.target.value === 'id' ? 'desc' : 'asc')}><option value="id">Порядок добавления</option>{equipColumns.filter((column) => column.sort).map((column) => <option key={column.key} value={column.sort}>{column.label}</option>)}</select></label>
    <button type="button" className="equip-secondary" title={direction === 'asc' ? 'По возрастанию; изменить порядок' : 'По убыванию; изменить порядок'} aria-label="Изменить направление сортировки" onClick={() => onSort(sort, direction === 'asc' ? 'desc' : 'asc')}>{direction === 'asc' ? '↑' : '↓'}</button>
    {view === 'table' && <details className="equip-column-picker"><summary>Колонки · {columns.length}</summary><div className="equip-column-options"><div className="equip-column-option-actions"><button type="button" onClick={() => onColumns(equipColumns.map((column) => column.key))}>Все</button><button type="button" onClick={() => onColumns(defaultColumns)}>По умолчанию</button></div>{equipColumns.map((column) => <label key={column.key}><input type="checkbox" checked={columns.includes(column.key)} disabled={column.key === 'name'} onChange={(event) => onColumns(event.target.checked ? [...columns, column.key] : columns.filter((key) => key !== column.key))}/>{column.label}</label>)}</div></details>}
  </div>;
}

export function EquipTable({ things, scope, types, columns, sort, direction, onSort, onOpen }) {
  const visible = equipColumns.filter((column) => columns.includes(column.key));
  const cell = (thing, key) => {
    switch (key) {
      case 'photo': return <EquipPhoto scopeId={scope.id} thing={thing}/>;
      case 'name': return <button type="button" className="equip-table-name" onClick={() => onOpen(thing.id)}>{thing.name}</button>;
      case 'type': return thing.type?.name || '—';
      case 'department': return <span className="equip-table-department" title={thing.department?.name || 'Без отдела'} style={{ background: thing.department?.color || '#edf2f4' }}>{departmentShortLabel(thing.department)}</span>;
      case 'assignee': return thing.current_assignment?.user_name || 'Не выдано';
      case 'owner': return ownerLabel(thing, scope.name) || '—';
      case 'condition': return <span className={`equip-condition equip-condition--${thing.condition}`}>{conditions[thing.condition]}</span>;
      case 'suitability': return suitability[thing.suitability];
      case 'container_kind': return containerKinds[thing.container_kind];
      case 'supplier': return thing.supplier_entry?.name || thing.supplier || '—';
      case 'purchase_cost': return thing.purchase_cost == null ? '—' : Number(thing.purchase_cost).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'purchased_on': return thing.purchased_on ? thing.purchased_on.slice(0, 10).split('-').reverse().join('.') : '—';
      case 'created_at': case 'updated_at': return thing[key] ? new Date(thing[key]).toLocaleString('ru-RU') : '—';
      case 'characteristics': {
        const schema = types.find((type) => type.id === thing.thing_type_id)?.schema || [];
        return Object.entries(thing.characteristics || {}).map(([field, value]) => {
          const description = schema.find((entry) => entry.key === field);
          return `${description?.label || field}: ${typeof value === 'boolean' ? value ? 'Да' : 'Нет' : value}${description?.unit ? ` ${description.unit}` : ''}`;
        }).join('\n') || '—';
      }
      default: return thing[key] ?? '—';
    }
  };
  return <div className="equip-table-scroll" role="region" aria-label="Таблица оборудования" tabIndex={0}><table className="equip-table"><thead><tr>{visible.map((column) => <th key={column.key} scope="col" aria-sort={column.sort === sort ? direction === 'asc' ? 'ascending' : 'descending' : column.sort ? 'none' : undefined}>{column.sort ? <button type="button" onClick={() => onSort(column.sort, column.sort === sort && direction === 'asc' ? 'desc' : 'asc')}>{column.label}<span aria-hidden="true">{column.sort === sort ? direction === 'asc' ? ' ↑' : ' ↓' : ' ↕'}</span></button> : column.label}</th>)}</tr></thead><tbody>{things.map((thing) => <tr key={thing.id} onDoubleClick={() => onOpen(thing.id)}>{visible.map((column) => <td key={column.key} className={`equip-cell-${column.key}`}>{cell(thing, column.key)}</td>)}</tr>)}</tbody></table></div>;
}
