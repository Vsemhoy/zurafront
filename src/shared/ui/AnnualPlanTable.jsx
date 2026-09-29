import { Fragment } from 'react';

export function AnnualPlanTable({ items = [] }) {
  if (!items.length) return <p className="reports-empty">В этом году плановых единиц нет.</p>;
  return <div className="reports-table-scroll"><table className="reports-table"><thead><tr><th>План</th><th>Проект</th><th>Исполнитель</th><th>Ожидаемый результат / эффект</th><th>Оценка</th><th>Задачи: готово / всего</th><th>Выполнение</th></tr></thead><tbody>{items.map((item, index) => <Fragment key={item.id}>
    {(index === 0 || items[index - 1].month !== item.month) && <tr><th colSpan={7} style={{ background: '#e7eff1' }}>{item.month}</th></tr>}
    <tr><td>{item.title}<details><summary>Описание и ресурсы</summary><p className="reports-result">{item.description || '—'}</p><p className="reports-result">{item.resources || '—'}</p></details></td><td>{item.project?.key || 'Без проекта'}</td><td>{item.assignee?.name || 'Не назначен'}</td><td className="reports-result">{item.expected_result || '—'}{item.impact && <p>Эффект: {item.impact}</p>}</td><td>{item.estimated_minutes == null ? '—' : `${Math.round(item.estimated_minutes / 60 * 100) / 100} ч`}<small className="reports-muted">{[item.starts_on, item.ends_on].filter(Boolean).join(' — ')}</small></td><td>{item.completed_tasks_count} / {item.tasks_count}</td><td>{item.completed_at ? 'Выполнено' : 'Не выполнено'}{item.completed_at && <small className="reports-muted">{new Date(item.completed_at).toLocaleDateString('ru-RU')}</small>}{item.actual_result && <p className="reports-result">{item.actual_result}</p>}</td></tr>
  </Fragment>)}</tbody></table></div>;
}
