export function diagramSettings(item) {
  return { title: item.title ?? '', description: item.description ?? '', project_id: item.project_id || null, visibility: item.visibility ?? 'private', allow_member_editing: Boolean(item.allow_member_editing), revision: item.revision ?? 1 };
}
export function diagramSettingsKey(value) {
  const { revision: _revision, ...settings } = diagramSettings(value);
  return JSON.stringify(settings);
}
