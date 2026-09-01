export const taskStatuses = [
    { value: 'scheduled', label: 'Запланировано', color: '#e7e3f7' },
    { value: 'todo', label: 'К выполнению', color: '#dfe9f8' },
    { value: 'in_progress', label: 'В работе', color: '#d8edf5' },
    { value: 'blocked', label: 'Заблокировано', color: '#f4d9d5' },
    { value: 'review', label: 'На проверке', color: '#f8ebc8' },
    { value: 'done', label: 'Готово', color: '#d8ecd9' },
    { value: 'cancelled', label: 'Удалено', color: '#e6e7eb' },
];

export const taskStatusMap = Object.fromEntries(taskStatuses.map((status) => [status.value, status]));
