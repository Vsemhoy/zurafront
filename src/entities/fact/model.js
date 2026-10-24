export const factFormats = { text: 'Текст', markdown: 'Markdown', code: 'Код', command: 'Команда', number: 'Число', svg: 'SVG' };
export const factKinds = { document: 'Документ', technical: 'Технический', professional: 'Рабочий', personal: 'Личный', credential: 'Реквизит', command: 'Команда', reference: 'Справка', metric: 'Показатель', configuration: 'Конфигурация', other: 'Прочее' };
export const factModes = { plain: 'Обычный', large: 'Крупный', mono: 'Моноширинный', article: 'Статья', snippet: 'Код', terminal: 'Команда', metric: 'Показатель', preview: 'SVG', qr: 'QR', masked: 'Скрытый' };
export const visibilityLabels = { private: 'Только я', scope: 'Участники скоупа', project: 'Участники проекта' };
const common = ['project_id', 'visibility', 'allow_member_editing', 'is_pinned', 'sort_order'];
const factFields = ['label', 'value', 'format', 'kind', 'display_mode', 'language', 'unit', 'context', 'search_keywords', 'is_sensitive', 'is_expert', 'valid_from', 'valid_to'];
const contactFields = ['name', 'kind', 'nickname', 'company', 'role', 'phone', 'email', 'birthday_on', 'met_at', 'met_context', 'last_contact_at', 'note_md', 'is_archived', 'user_id'];

export function recordForm(type, record = {}) {
  const form = { id: null, revision: 1, visibility: 'private', project_id: '', allow_member_editing: false, is_pinned: false, sort_order: 0,
    ...(type === 'fact' ? { label: '', value: '', format: 'text', kind: 'other', display_mode: 'plain', language: '', unit: '', context: '', search_keywords: [], is_sensitive: false, is_expert: false, valid_from: '', valid_to: '' }
      : { name: '', kind: 'person', nickname: '', company: '', role: '', phone: '', email: '', birthday_on: '', met_at: '', met_context: '', last_contact_at: '', note_md: '', is_archived: false, user_id: '' }), ...record };
  for (const key of [...common, ...(type === 'fact' ? factFields : contactFields)]) {
    if (form[key] == null && !['value', 'search_keywords'].includes(key)) form[key] = '';
  }
  if (type === 'fact') {
    form.search_keywords = Array.isArray(record.search_keywords) ? record.search_keywords : [];
    form.value = record.is_sensitive ? null : form.value ?? '';
    form.valid_from = (form.valid_from || '').slice(0, 10);
    form.valid_to = (form.valid_to || '').slice(0, 10);
  } else {
    for (const key of ['birthday_on', 'met_at']) form[key] = (form[key] || '').slice(0, 10);
    form.last_contact_at = (form.last_contact_at || '').slice(0, 16);
  }
  return form;
}

export function recordPayload(type, draft, baseline) {
  const payload = {};
  for (const key of [...common, ...(type === 'fact' ? factFields : contactFields)]) {
    if (type === 'fact' && key === 'value' && draft.value == null) continue;
    if (baseline.id && JSON.stringify(draft[key]) === JSON.stringify(baseline[key])) continue;
    if (key === 'search_keywords') { payload[key] = draft[key].map((word) => word.trim()).filter(Boolean); continue; }
    payload[key] = draft[key] === '' && !['label', 'name', 'value'].includes(key) ? null : draft[key];
  }
  if (baseline.id) payload.revision = baseline.revision;
  return payload;
}

export function factRenderMode(fact, mode = 'auto') {
  if (mode !== 'auto') return mode;
  if (fact.display_mode && !['plain', 'masked'].includes(fact.display_mode)) return fact.display_mode;
  return { markdown: 'article', code: 'snippet', command: 'terminal', number: 'metric', svg: 'preview' }[fact.format] ?? 'plain';
}

export function qrAllowed(value) { return typeof value === 'string' && new TextEncoder().encode(value).length > 0 && new TextEncoder().encode(value).length <= 1200; }
export function factExpired(fact, today = new Date().toISOString().slice(0, 10)) { return Boolean(fact.valid_to && fact.valid_to.slice(0, 10) < today); }
export function groupedText(value, size) { const chars = Array.from(String(value)); const groups = []; for (let index = 0; index < chars.length; index += Math.max(1, size)) groups.push(chars.slice(index, index + Math.max(1, size)).join('')); return groups.join('\n'); }
