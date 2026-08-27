export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'review' | 'done' | 'cancelled'
export type TaskPriority = 1 | 2 | 3 | 4 | 5
export type TaskPerson = { id: string; name: string }
export type TaskProject = { id: string; title: string; key?: string }
export type Task = { id: string; scope_id: string; project_id: string | null; parent_id: string | null; number: number | null; task_key: string | null; title: string; description: string | null; result: string | null; status: TaskStatus; priority: TaskPriority; due_at: string | null; completed_at: string | null; counts_for_compensation: boolean; sort_order: number; meta: Record<string, unknown> | null; project?: TaskProject | null; assignee?: TaskPerson | null }
export type TaskChecklistItem = { id: string; task_id: string; title: string; assignee_id: string | null; assignee: TaskPerson | null; due_at: string | null; completed_at: string | null; completed_by_id: string | null; completed_by: TaskPerson | null; sort_order: number }
export function taskReference(task: Task): string { return task.task_key ?? `TSK-${task.id.slice(-6).toUpperCase()}` }
export function priorityLabel(priority: TaskPriority): string { return ({ 1: 'Низкий', 2: 'Обычный', 3: 'Средний', 4: 'Высокий', 5: 'Критичный' } as const)[priority] }
