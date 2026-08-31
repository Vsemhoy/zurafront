import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { TaskerPage } from '../pages/TaskerPage';
import { TaskEditorPage } from '../pages/TaskEditorPage';
import { FactorPage } from '../pages/FactorPage';
import { EventorPage } from '../pages/EventorPage';
import { BookerPage } from '../pages/BookerPage';
import { Brand } from '../shared/ui/Brand';
import { AppShell } from '../widgets/app-shell/AppShell';
function AuthenticatedApp() { const { user } = useAuth(); return user ? <AppShell /> : <Navigate to="/login" replace/>; }
export function AppRouter() {
    const { status, check } = useAuth();
    useEffect(() => { void check(); }, [check]);
    if (status === 'checking')
        return <main className="auth-loading"><Brand /><span>Loading workspace…</span></main>;
    return <Routes><Route path="/login" element={<LoginPage />}/><Route element={<AuthenticatedApp />}><Route index element={<DashboardPage />}/><Route path="tasks" element={<TaskerPage />}/><Route path="tasks/:taskId" element={<TaskerPage />}/><Route path="tasks/:taskId/edit" element={<TaskEditorPage />}/><Route path="factor" element={<FactorPage />}/><Route path="events" element={<EventorPage />}/><Route path="books" element={<BookerPage />}/><Route path="books/:bookId" element={<BookerPage />}/><Route path="books/:bookId/pages/:pageId" element={<BookerPage />}/><Route path="books/:bookId/pages/:pageId/versions/:pageVersionId" element={<BookerPage />}/><Route path="books/:bookId/pages/:pageId/blocks/:blockId" element={<BookerPage />}/><Route path="books/:bookId/pages/:pageId/blocks/:blockId/versions/:versionId" element={<BookerPage />}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
