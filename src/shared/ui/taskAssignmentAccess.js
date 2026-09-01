export function contractorCanAccessProject(contractor, projectId) {
  if (contractor.project_access_mode === "all") return true;
  if (contractor.project_access_mode === "none" || !projectId) return false;
  return contractor.project_ids?.includes(projectId);
}
