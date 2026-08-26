export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'
export type TaskPerson = { id: string; name: string }
export type TaskProject = { id: string; title: string; key?: string }
export type Task = { id: string; scope_id: string; project_id: string | null; parent_id: string | null; title: string; description: string | null; result: string | null; status: TaskStatus; priority: TaskPriority; due_at: string | null; completed_at: string | null; counts_for_compensation: boolean; sort_order: number; meta: Record<string, unknown> | null; project?: TaskProject | null; assignee?: TaskPerson | null }
export function taskReference(task: Task): string { const explicit = task.meta?.task_key; return typeof explicit === 'string' ? explicit : `TSK-${task.id.slice(-6).toUpperCase()}` }
