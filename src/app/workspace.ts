import { useOutletContext } from 'react-router-dom'
import type { Scope } from '../entities/scope/model'
export type WorkspaceContext = { activeScope: Scope | null }
export function useWorkspace(): WorkspaceContext { return useOutletContext<WorkspaceContext>() }
