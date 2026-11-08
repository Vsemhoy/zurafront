import { specificationOutline } from './model.js';

export const specificationBlockTypes = {
  master: 'Группа подпунктов', subpoints: 'Группа подпунктов', markdown: 'Текст', callout: 'Врезка', code: 'Код',
  image: 'Изображение по ссылке', svg: 'SVG', link: 'Ссылка', divider: 'Разделитель',
};

export const ungroupedSubpointsId = 'ungrouped-subpoints';
export const isSpecificationGroup = ({ type }) => type === 'master' || type === 'subpoints';

export function newSpecificationBlock(type) {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let number = BigInt(Date.now());
  for (const byte of crypto.getRandomValues(new Uint8Array(10))) number = (number << 8n) | BigInt(byte);
  let id = '';
  for (let i = 0; i < 26; i++, number >>= 5n) id = alphabet[Number(number & 31n)] + id;
  return { id, type, ...(isSpecificationGroup({ type }) ? { item_ids: [] } : {}) };
}

export function documentBlocks(document, items = []) {
  return document?.composition ?? [{ id: document?.id ?? 'legacy', type: 'master', item_ids: specificationOutline(items).map(({ id }) => id) }];
}

export const placedItemIds = (blocks) => blocks.filter(isSpecificationGroup).flatMap(({ item_ids }) => item_ids);

export function specificationPlacementOrder(items = [], rootBlocks = []) {
  const parents = new Map(items.map(({ id, parent_id }) => [id, parent_id]));
  const local = items.flatMap(({ id, blocks }) => placedItemIds(blocks ?? []).filter((child) => parents.get(child) === id));
  return [...new Set([...local, ...placedItemIds(rootBlocks)])];
}

export function ungroupedSubpoints(blocks, children) {
  const placed = new Set(placedItemIds(blocks));
  return children.filter(({ id }) => !placed.has(id));
}

export function movePlacedItem(blocks, itemId, masterId, beforeId = null) {
  if (itemId === beforeId || !placedItemIds(blocks).includes(itemId)) return blocks;
  const target = blocks.find((block) => block.id === masterId && isSpecificationGroup(block));
  if (!target || (beforeId && !target.item_ids.includes(beforeId))) return blocks;
  return blocks.map((block) => {
    if (!isSpecificationGroup(block) || (block !== target && !block.item_ids.includes(itemId))) return block;
    const ids = block.item_ids.filter((id) => id !== itemId);
    if (block === target) ids.splice(beforeId ? ids.indexOf(beforeId) : ids.length, 0, itemId);
    return { ...block, item_ids: ids };
  });
}

export function moveSpecificationBlock(blocks, id, offset) {
  const from = blocks.findIndex((block) => block.id === id), to = from + offset;
  if (from < 0 || to < 0 || to >= blocks.length) return blocks;
  const result = [...blocks];
  result.splice(to, 0, ...result.splice(from, 1));
  return result;
}

export function removeSpecificationBlock(blocks, id) {
  const index = blocks.findIndex((block) => block.id === id);
  if (index < 0) return blocks;
  const block = blocks[index];
  if (block.type !== 'master') return blocks.filter((row) => row.id !== id);
  const next = blocks.slice(index + 1).find((row) => row.type === 'master');
  const target = next ?? blocks.slice(0, index).findLast((row) => row.type === 'master');
  if (!target) return blocks;
  return blocks.filter((row) => row.id !== id).map((row) => row === target
    ? { ...row, item_ids: next ? [...block.item_ids, ...row.item_ids] : [...row.item_ids, ...block.item_ids] }
    : row);
}
