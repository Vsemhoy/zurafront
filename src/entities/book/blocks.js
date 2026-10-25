export const bookBlockTypes = [['markdown', 'Текст'], ['callout', 'Врезка'], ['code', 'Код'], ['checklist', 'Чеклист'], ['table', 'Таблица'], ['photo', 'Фотография'], ['svg', 'SVG'], ['embed', 'Встраивание'], ['divider', 'Разделитель']];
export const isSupportedBookBlock = (type) => bookBlockTypes.some(([value]) => value === type);
// Keep unsupported legacy data intact; omit it only from presentation.
export const visibleBookGroups = (groups = []) => groups.filter((group) => isSupportedBookBlock(group.type));
export const visibleBookSnapshot = (snapshot) => ({ ...snapshot, blocks: (snapshot?.blocks ?? []).filter(({ group }) => isSupportedBookBlock(group?.type)) });
