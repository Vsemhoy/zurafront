import { useQuery } from '@tanstack/react-query';
import { kpiApi } from '../../entities/kpi/api';
import './TaskKpiField.css';

export function TaskKpiField({ scopeId, value, onChange, userId, month }) {
    const { data: kpis = [], isLoading } = useQuery({ queryKey: ['kpis', scopeId, 'personal', userId, month], queryFn: () => kpiApi.list(scopeId, true, userId, month), enabled: Boolean(scopeId) });
    return <label className="task-kpi-field">KPI<select value={value ?? ''} disabled={isLoading} onChange={(event) => onChange(event.target.value || null)}><option value="">Без KPI</option>{value && !kpis.some((item) => item.id === value) && <option value={value}>Прежний KPI — вне профиля сотрудника</option>}{kpis.map((kpi) => <option key={kpi.id} value={kpi.id}>{kpi.is_active ? '' : '⏸ '}{kpi.kind === 'bonus' ? 'Премия' : 'Оклад'} · {kpi.name} · {kpi.points} бал.</option>)}</select></label>;
}
