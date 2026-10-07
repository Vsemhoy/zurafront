const localDay = (now) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export function isPlanOverdue(plan, now = new Date()) {
  return !plan.completed_at && /^\d{4}-\d{2}$/.test(plan.month ?? '') && plan.month < localDay(now).slice(0, 7);
}

export function isPlanTaskOverdue(task, now = new Date()) {
  const date = task.due_at?.slice(0, 10);
  return !['done', 'cancelled'].includes(task.status) && /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') && date < localDay(now);
}
