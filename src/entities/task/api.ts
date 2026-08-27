import { apiRequest, type Resource, type ResourceCollection } from '../../api'
import type { Task, TaskChecklistItem } from './model'
export const taskApi = {
  async list(scopeId: string): Promise<Task[]> { return (await apiRequest<ResourceCollection<Task>>(`/scopes/${scopeId}/tasks`)).data },
  async get(scopeId: string, taskId: string): Promise<Task> { return (await apiRequest<Resource<Task>>(`/scopes/${scopeId}/tasks/${taskId}`)).data },
  async checklist(scopeId: string, taskId: string): Promise<TaskChecklistItem[]> { return (await apiRequest<ResourceCollection<TaskChecklistItem>>(`/scopes/${scopeId}/tasks/${taskId}/checklist`)).data },
  async createChecklistItem(scopeId: string, taskId: string, title: string): Promise<TaskChecklistItem> { return (await apiRequest<Resource<TaskChecklistItem>>(`/scopes/${scopeId}/tasks/${taskId}/checklist`, { method: 'POST', body: JSON.stringify({ title }) })).data },
  async setChecklistItemCompleted(scopeId: string, taskId: string, itemId: string, isCompleted: boolean): Promise<TaskChecklistItem> { return (await apiRequest<Resource<TaskChecklistItem>>(`/scopes/${scopeId}/tasks/${taskId}/checklist/${itemId}`, { method: 'PATCH', body: JSON.stringify({ is_completed: isCompleted }) })).data },
}
