import { useQuery } from '@tanstack/react-query';
import { IconRefresh, IconServer } from '@tabler/icons-react';
import { apiRequest } from '../api';
import './MonitoringPage.css';

const sizes = (bytes) => `${(bytes / 1024 ** 3).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ГиБ`;
const labels = { ok: 'Места достаточно', warning: 'Диск заполняется', critical: 'Мало свободного места' };

export function MonitoringPage() {
    const { data, error, isPending, isFetching, refetch } = useQuery({
        queryKey: ['host-monitoring'],
        queryFn: async ({ signal }) => (await apiRequest('/monitoring/storage', { signal })).data,
        refetchInterval: 30000,
        retry: false,
    });
    return <main className="monitoring-page">
        <header><div><h1><IconServer size={23}/>Мониторинг</h1><p>Общий диск сервера · Zuratax, Тефтеле, базы, логи и резервные копии</p></div><button onClick={() => refetch()} disabled={isFetching}><IconRefresh size={16}/>{isFetching ? 'Обновляю…' : 'Обновить'}</button></header>
        {isPending && <p role="status">Получаю показатели сервера…</p>}
        {error && <p className="monitoring-error" role="alert">{error.message}{data && ' Показан последний успешный замер — данные устарели.'}</p>}
        {data?.volumes.map((volume) => <section key={volume.name} className={`monitoring-volume ${error ? 'stale' : volume.status}`}>
            <header><h2>{volume.name}</h2><span>{error ? 'Нет актуальных данных' : labels[volume.status]}</span></header>
            <div className="monitoring-values"><div><small>Занято</small><strong>{sizes(volume.used_bytes)}</strong></div><div><small>Доступно приложениям</small><strong>{sizes(volume.available_bytes)}</strong></div><div><small>Общий объём</small><strong>{sizes(volume.total_bytes)}</strong></div></div>
            <div className="monitoring-meter" role="meter" aria-label="Занято на диске" aria-valuemin={0} aria-valuemax={100} aria-valuenow={volume.used_percent}><i style={{ width: `${volume.used_percent}%` }}/></div>
            <footer><span>Занято {volume.used_percent}%</span><span>Резерв системы: {sizes(volume.reserved_bytes)}</span><span>Свободно inode: {volume.inodes_available_percent === null ? 'нет данных' : `${volume.inodes_available_percent}%`}</span></footer>
        </section>)}
        {data && <p className="monitoring-updated">Замер: {new Date(data.checked_at).toLocaleString()} · Обновление каждые 30 секунд</p>}
        <p className="monitoring-note">Предупреждение от 75% заполнения с учётом резерва. Критично: от 90%, свободно меньше 5 ГиБ или меньше 5% inode. Inode — запас файловых записей. Разбивка по приложениям появится отдельно.</p>
    </main>;
}
