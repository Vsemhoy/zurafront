export function subtaskPayload(parent, title) {
  return {
    title: title.trim(),
    parent_id: parent.id,
    project_id: parent.project_id ?? parent.project?.id ?? null,
    department_id: parent.department_id ?? parent.department?.id ?? null,
    assignee_id: parent.assignee_id ?? parent.assignee?.id ?? null,
  };
}
