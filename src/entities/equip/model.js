export const conditions = { working: 'Исправно', maintenance: 'Нужно обслуживание', broken: 'Неисправно' };
export const suitability = { unassessed: 'Не оценено', suitable: 'Соответствует потребностям', limited: 'Ограниченно пригодно', unsuitable: 'Не соответствует потребностям' };
export const ownerKinds = { organization: 'Организация', employee: 'Сотрудник', external: 'Внешний собственник' };
export const containerKinds = { none: 'Обычная вещь', physical: 'Физический контейнер', logical: 'Логический комплект' };
export const responsibilities = { use: 'В работе', custody: 'На хранении', temporary: 'Временно выдано' };
export const eventLabels = { 'equip.task_linked': 'Привязана задача', 'equip.task_unlinked': 'Отвязана задача', 'equip.diagram_linked': 'Привязана диаграмма', 'equip.diagram_unlinked': 'Отвязана диаграмма', 'equip.created': 'Оборудование зарегистрировано', 'equip.updated': 'Карточка изменена', 'equip.assigned': 'Выдано сотруднику', 'equip.transferred': 'Передано / изменена ответственность', 'equip.returned': 'Возвращено', 'equip.container_changed': 'Изменён вид контейнера', 'equip.attached': 'Добавлено в состав', 'equip.detached': 'Извлечено из состава' };
export const fieldLabels = {
  name: 'Название', thing_type_id: 'Тип', department_id: 'Отдел', manufacturer: 'Производитель', model: 'Модель',
  serial_number: 'Серийный номер', inventory_number: 'Инвентарный номер', registration_basis: 'Основание внесения',
  owner_kind: 'Вид собственности', owner_id: 'Собственник', owner_name: 'Внешний собственник', purchased_on: 'Дата приобретения',
  purchase_cost: 'Стоимость приобретения', supplier: 'Поставщик', condition: 'Техническое состояние', suitability: 'Пригодность',
  characteristics: 'Характеристики', description: 'Описание', wms_product_id: 'Товар WMS', wms_inventory_unit: 'Экземпляр WMS',
  responsible: 'Ответственный', responsibility: 'Тип ответственности', batch_root: 'Выдаваемый комплект', note: 'Примечание', container: 'Контейнер', component: 'Компонент', container_kind: 'Вид контейнера', relation_kind: 'Вид включения',
};

export function newThing(departmentId = '') {
  return { name: '', thing_type_id: '', department_id: departmentId, container_kind: 'none', manufacturer: '', model: '', serial_number: '', inventory_number: '', registration_basis: '', owner_kind: 'organization', owner_id: '', owner_name: '', purchased_on: '', purchase_cost: '', supplier_id: '', condition: 'working', suitability: 'unassessed', characteristics: {}, description: '', wms_product_id: '', wms_inventory_unit: '' };
}

export function thingPayload(form, existing = false) {
  const payload = Object.fromEntries(Object.keys(newThing()).map((key) => [key, form[key] === '' ? null : form[key]]));
  payload.characteristics = form.characteristics ?? {};
  if (existing) {
    delete payload.container_kind;
    payload.revision = form.revision;
  } else payload.container_kind = form.container_kind || 'none';
  return payload;
}

export function ownerLabel(thing, organizationName) {
  return thing.owner_kind === 'employee' ? (thing.owner?.name || 'Сотрудник') : thing.owner_kind === 'external' ? thing.owner_name : organizationName;
}
