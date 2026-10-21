import { departmentColor } from '../../entities/department/colors';
import { departmentLabel } from '../../entities/department/model';
import { DepartmentIcon } from './DepartmentIcon';
import './DepartmentField.css';

export function DepartmentFilter({ departments = [], value, onChange }) {
  const department = departments.find((item) => item.id === value);
  return <select className="department-filter" aria-label="Отдел" title={department ? `Отдел ${department.name}` : 'Отдел'}
    style={department ? { backgroundColor: departmentColor(department) } : undefined}
    value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">Все отделы</option>
    {departments.map((item) => <option key={item.id} value={item.id}>{departmentLabel(item)}</option>)}
  </select>;
}

export function DepartmentStrip({ department }) {
  return department ? <span className="department-strip" style={{ backgroundColor: departmentColor(department) }} title={`Отдел ${departmentLabel(department)}`}>
    {department.icon_svg && <DepartmentIcon department={department}/>}{department.code && <code>{department.code}</code>}<span>{department.name}</span>
  </span> : null;
}
