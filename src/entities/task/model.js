export function taskReference(task) { return task.task_key ?? `TSK-${task.id.slice(-6).toUpperCase()}`; }
export function priorityLabel(priority) { return { 1: 'Низкий', 2: 'Обычный', 3: 'Средний', 4: 'Высокий', 5: 'Критичный' }[priority]; }
