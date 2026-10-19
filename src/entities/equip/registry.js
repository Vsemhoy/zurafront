import { useEffect, useState } from 'react';

export const equipColumns = [
  { key: 'photo', label: 'Фото' },
  { key: 'name', label: 'Название', sort: 'name' },
  { key: 'type', label: 'Тип', sort: 'type' },
  { key: 'inventory_number', label: 'Инвентарный №', sort: 'inventory_number' },
  { key: 'serial_number', label: 'Серийный №', sort: 'serial_number' },
  { key: 'manufacturer', label: 'Производитель', sort: 'manufacturer' },
  { key: 'model', label: 'Модель', sort: 'model' },
  { key: 'department', label: 'Отдел', sort: 'department' },
  { key: 'assignee', label: 'Выдано сотруднику', sort: 'assignee' },
  { key: 'owner', label: 'Собственник', sort: 'owner' },
  { key: 'condition', label: 'Состояние', sort: 'condition' },
  { key: 'suitability', label: 'Пригодность', sort: 'suitability' },
  { key: 'container_kind', label: 'Вид контейнера', sort: 'container_kind' },
  { key: 'supplier', label: 'Поставщик', sort: 'supplier' },
  { key: 'purchased_on', label: 'Дата приобретения', sort: 'purchased_on' },
  { key: 'purchase_cost', label: 'Стоимость', sort: 'purchase_cost' },
  { key: 'registration_basis', label: 'Основание внесения', sort: 'registration_basis' },
  { key: 'characteristics', label: 'Характеристики' },
  { key: 'description', label: 'Описание', sort: 'description' },
  { key: 'wms_product_id', label: 'Товар WMS', sort: 'wms_product_id' },
  { key: 'wms_inventory_unit', label: 'Экземпляр WMS', sort: 'wms_inventory_unit' },
  { key: 'created_at', label: 'Добавлено', sort: 'created_at' },
  { key: 'updated_at', label: 'Обновлено', sort: 'updated_at' },
];
export const defaultColumns = ['photo', 'name', 'type', 'inventory_number', 'serial_number', 'department', 'assignee', 'condition', 'supplier'];

export function useEquipColumns(scopeId) {
  const storageKey = `zuratax.equip.columns.${scopeId}`;
  const [columns, setColumns] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(stored)) return [...new Set(['name', ...stored.filter((key) => equipColumns.some((column) => column.key === key))])];
    } catch { /* A disabled or outdated browser storage must not block the registry. */ }
    return defaultColumns;
  });
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(columns)); } catch { /* Preferences are optional. */ } }, [storageKey, columns]);
  return [columns, setColumns];
}

