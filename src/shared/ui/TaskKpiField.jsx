import { useQuery } from '@tanstack/react-query';
import { kpiApi } from '../../entities/kpi/api';
import './TaskKpiField.css';

export function TaskKpiField({ scopeId, value, onChange, disabled = false }) {
    const { data: kpis = [], isLoading } = useQuery({ queryKey: ['kpis', scopeId, 'all'], queryFn: () => kpiApi.list(scopeId, true), enabled: Boolean(scopeId) });
    return <label className="task-kpi-field">KPI<select value={value ?? ''} disabled={disabled || isLoading} onChange={(event) => onChange(event.target.value || null)}><option value="">Без KPI</option>{kpis.map((kpi) => <option key={kpi.id} value={kpi.id}>{kpi.is_active ? '' : '⏸ '}{kpi.kind === 'bonus' ? 'Премия' : 'Оклад'} · {kpi.name} · {kpi.points} бал.</option>)}</select></label>;
}
