import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth';
import { ContentPage, LegacyFilesRedirect } from '../pages/ContentPage';
import { MonitoringPage } from '../pages/MonitoringPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { ChangelogPage } from '../pages/ChangelogPage';
import { TaskerPage } from '../pages/TaskerPage';
import { TaskEditorPage } from '../pages/TaskEditorPage';
import { FactorPage } from '../pages/FactorPage';
import { EventorPage } from '../pages/EventorPage';
import { BookerPage } from '../pages/BookerPage';
import { ContractorPage } from '../pages/ContractorPage';
import { PlannerPage } from '../pages/PlannerPage';
import { ProjectorPage } from '../pages/ProjectorPage';
import { DepartmentsPage } from '../pages/DepartmentsPage';
import { EquipPage } from '../pages/EquipPage';
import { ExploiterPage } from '../pages/ExploiterPage';
import { LedgerPage } from '../pages/LedgerPage';
import { KpiPage } from '../pages/KpiPage';
import { PlansPage } from '../pages/PlansPage';
import { DarklogPage } from '../pages/DarklogPage';
import { ReportsPage } from '../pages/ReportsPage';
import { SearchPage } from '../pages/SearchPage';
import { LorePage, LoreReaderPage } from '../pages/LorePage';
import { Brand } from '../shared/ui/Brand';
import { AppShell } from '../widgets/app-shell/AppShell';

function AuthenticatedApp() { const { user } = useAuth(); return user ? <AppShell /> : <Navigate to="/login" replace/>; }

function SessionGate() {
  const { status, check } = useAuth();
  useEffect(() => { void check(); }, [check]);
  if (status === 'checking') return <main className="auth-loading"><Brand/><span>Loading workspace…</span></main>;
  return <Outlet/>;
}

export function AppRouter() {
  return <Routes><Route path="/changelog" element={<ChangelogPage/>}/><Route element={<SessionGate/>}><Route path="/login" element={<LoginPage/>}/><Route element={<AuthenticatedApp/>}><Route index element={<DashboardPage/>}/><Route path="files" element={<LegacyFilesRedirect/>}/><Route path="content" element={<Navigate to="/content/diagrams" replace/>}/><Route path="content/files" element={<ContentPage section="files"/>}/><Route path="content/diagrams" element={<ContentPage/>}/><Route path="content/diagrams/:scopeId/:diagramId" element={<ContentPage/>}/><Route path="content/lightbooks" element={<ContentPage section="lightbooks"/>}/><Route path="content/lightbooks/:lightbookId" element={<ContentPage section="lightbooks"/>}/><Route path="content/lightbooks/:lightbookId/versions/:pageVersionId" element={<ContentPage section="lightbooks"/>}/><Route path="content/lightbooks/:lightbookId/blocks/:blockId" element={<ContentPage section="lightbooks"/>}/><Route path="monitoring" element={<MonitoringPage/>}/><Route path="search" element={<SearchPage/>}/><Route path="tasks" element={<TaskerPage/>}/><Route path="tasks/:taskId" element={<TaskerPage/>}/><Route path="tasks/:taskId/edit" element={<TaskEditorPage/>}/><Route path="planner" element={<PlannerPage/>}/><Route path="projects" element={<ProjectorPage/>}/><Route path="equip" element={<EquipPage/>}/><Route path="exploiter" element={<ExploiterPage/>}/><Route path="exploiter/:scopeId/:entryId" element={<ExploiterPage/>}/><Route path="ledger" element={<LedgerPage/>}/><Route path="ledger/:scopeId/:transactionId" element={<LedgerPage/>}/><Route path="departments" element={<DepartmentsPage/>}/><Route path="contractors" element={<ContractorPage/>}/><Route path="kpi" element={<KpiPage/>}/><Route path="reports" element={<ReportsPage/>}/><Route path="darklog" element={<DarklogPage/>}/><Route path="darklog/:scopeId/:darklogId" element={<DarklogPage/>}/><Route path="plans" element={<PlansPage/>}/><Route path="factor" element={<FactorPage/>}/><Route path="lore" element={<LorePage/>}/><Route path="lore/:scopeId/:loreId" element={<LoreReaderPage/>}/><Route path="events" element={<EventorPage/>}/><Route path="books" element={<BookerPage/>}/><Route path="books/:bookId" element={<BookerPage/>}/><Route path="books/:bookId/pages/:pageId" element={<BookerPage/>}/><Route path="books/:bookId/pages/:pageId/versions/:pageVersionId" element={<BookerPage/>}/><Route path="books/:bookId/pages/:pageId/blocks/:blockId" element={<BookerPage/>}/><Route path="books/:bookId/pages/:pageId/blocks/:blockId/versions/:versionId" element={<BookerPage/>}/></Route></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
