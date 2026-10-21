export const departmentIconMaxBytes = 32768;

export function normalizeDepartmentCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function departmentLabel(department) {
  return department.code ? `${department.code} · ${department.name}` : department.name;
}

export function departmentShortLabel(department) {
  return department?.code || department?.name || 'Без отдела';
}

export function departmentIconSource(svg) {
  if (typeof svg !== 'string' || !svg.trim() || new TextEncoder().encode(svg).length > departmentIconMaxBytes) return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
