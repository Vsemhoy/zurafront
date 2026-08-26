import { apiRequest, type Resource, type ResourceCollection } from '../../api'
import type { Task } from './model'
export const taskApi = {
  async list(scopeId: string): Promise<Task[]> { return (await apiRequest<ResourceCollection<Task>>(`/scopes/${scopeId}/tasks`)).data },
  async get(scopeId: string, taskId: string): Promise<Task> { return (await apiRequest<Resource<Task>>(`/scopes/${scopeId}/tasks/${taskId}`)).data },
}
