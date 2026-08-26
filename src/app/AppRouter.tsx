import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth'
import { DashboardPage } from '../pages/DashboardPage'
import { LoginPage } from '../pages/LoginPage'
import { TaskerPage } from '../pages/TaskerPage'
import { Brand } from '../shared/ui/Brand'
import { AppShell } from '../widgets/app-shell/AppShell'

function AuthenticatedApp() { const { user } = useAuth(); return user ? <AppShell/> : <Navigate to="/login" replace/> }
export function AppRouter() {
  const { status, check } = useAuth(); useEffect(() => { void check() }, [check])
  if (status === 'checking') return <main className="auth-loading"><Brand/><span>Loading workspace…</span></main>
  return <Routes><Route path="/login" element={<LoginPage/>}/><Route element={<AuthenticatedApp/>}><Route index element={<DashboardPage/>}/><Route path="tasks" element={<TaskerPage/>}/><Route path="tasks/:taskId" element={<TaskerPage/>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes>
}
