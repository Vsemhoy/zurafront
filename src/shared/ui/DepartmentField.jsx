import { useQuery } from '@tanstack/react-query';
import { departmentApi } from '../../entities/department/api';
export function DepartmentField({ scopeId, value, onChange }) {
  const list = useQuery({ queryKey: ['departments', scopeId], queryFn: () => departmentApi.list(scopeId), enabled: Boolean(scopeId) });
  return <label>Ответственный отдел<select value={value || ''} onChange={(event) => onChange(event.target.value || null)}><option value="">Без отдела</option>{list.data?.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>{list.error && <small role="alert">{list.error.message}</small>}</label>;
}
