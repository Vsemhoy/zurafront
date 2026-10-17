export const referenceKinds = { file: 'Файл', diagram: 'Диаграмма', lore: 'ЛОР' };

export async function findReferenceFile(id, fetchPage) {
    for (let page = 1; ; page++) {
        const result = await fetchPage(page);
        const file = result.data.find((item) => item.id === id);
        if (file) return file;
        if (!result.meta?.has_more) throw new Error('Файл удалён или недоступен.');
    }
}
