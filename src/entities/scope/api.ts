import { apiRequest, type ResourceCollection } from '../../api'
import type { Scope } from './model'
export const scopeApi = { async list(): Promise<Scope[]> { return (await apiRequest<ResourceCollection<Scope>>('/scopes')).data } }
