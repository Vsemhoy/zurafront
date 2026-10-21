import { useState } from 'react';
import { departmentIconSource } from '../../entities/department/model';
import './DepartmentField.css';

export function DepartmentIcon({ department, className = '' }) {
  const src = departmentIconSource(department?.icon_svg);
  const [failedSource, setFailedSource] = useState(null);
  return src && src !== failedSource
    ? <img className={`department-icon ${className}`} src={src} alt="" aria-hidden="true" onError={() => setFailedSource(src)}/>
    : <span className={`department-icon department-icon--fallback ${className}`} aria-hidden="true">{(department?.code || department?.name || '?').slice(0, 1)}</span>;
}
