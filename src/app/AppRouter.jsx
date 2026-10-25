import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth';
import { Brand } from '../shared/ui/Brand';
import { AppShell } from '../widgets/app-shell/AppShell';

function lazyPage(load, name) {
  const Component = lazy(() => load().then((module) => ({ default: module[name] })));
  return function DeferredPage() {
    return <Suspense fallback={<main className="auth-loading" role="status"><Brand/><span>Загружаем раздел…</span></main>}><Component/></Suspense>;
  };
}

const ContentPage = lazyPage(() => import('../pages/ContentPage'), 'ContentPage');
const LegacyFilesRedirect = lazyPage(() => import('../pages/ContentPage'), 'LegacyFilesRedirect');
const MonitoringPage = lazyPage(() => import('../pages/MonitoringPage'), 'MonitoringPage');
const DashboardPage = lazyPage(() => import('../pages/DashboardPage'), 'DashboardPage');
const LoginPage = lazyPage(() => import('../pages/LoginPage'), 'LoginPage');
const ChangelogPage = lazyPage(() => import('../pages/ChangelogPage'), 'ChangelogPage');
const TaskerPage = lazyPage(() => import('../pages/TaskerPage'), 'TaskerPage');
const TaskEditorPage = lazyPage(() => import('../pages/TaskEditorPage'), 'TaskEditorPage');
const ContactPage = lazyPage(() => import('../pages/ContactPage'), 'ContactPage');
const FactorPage = lazyPage(() => import('../pages/FactorPage'), 'FactorPage');
const EventorPage = lazyPage(() => import('../pages/EventorPage'), 'EventorPage');
const BookerPage = lazyPage(() => import('../pages/BookerPage'), 'BookerPage');
const ContractorPage = lazyPage(() => import('../pages/ContractorPage'), 'ContractorPage');
const PlannerPage = lazyPage(() => import('../pages/PlannerPage'), 'PlannerPage');
const ProjectorPage = lazyPage(() => import('../pages/ProjectorPage'), 'ProjectorPage');
const DepartmentsPage = lazyPage(() => import('../pages/DepartmentsPage'), 'DepartmentsPage');
const EquipPage = lazyPage(() => import('../pages/EquipPage'), 'EquipPage');
const ExploiterPage = lazyPage(() => import('../pages/ExploiterPage'), 'ExploiterPage');
const LedgerPage = lazyPage(() => import('../pages/LedgerPage'), 'LedgerPage');
const KpiPage = lazyPage(() => import('../pages/KpiPage'), 'KpiPage');
const PlansPage = lazyPage(() => import('../pages/PlansPage'), 'PlansPage');
const DarklogPage = lazyPage(() => import('../pages/DarklogPage'), 'DarklogPage');
const ReportsPage = lazyPage(() => import('../pages/ReportsPage'), 'ReportsPage');
const SearchPage = lazyPage(() => import('../pages/SearchPage'), 'SearchPage');
const LorePage = lazyPage(() => import('../pages/LorePage'), 'LorePage');
const LoreReaderPage = lazyPage(() => import('../pages/LorePage'), 'LoreReaderPage');

function AuthenticatedApp() { const { user } = useAuth(); return user ? <AppShell /> : <Navigate to="/login" replace/>; }

function SessionGate() {
  const { status, check } = useAuth();
  useEffect(() => { void check(); }, [check]);
  if (status === 'checking') return <main className="auth-loading"><Brand/><span>Loading workspace…</span></main>;
  return <Outlet/>;
}

export function AppRouter() {
  return <Routes><Route path="/changelog" element={<ChangelogPage/>}/><Route element={<SessionGate/>}><Route path="/login" element={<LoginPage/>}/><Route element={<AuthenticatedApp/>}><Route index element={<DashboardPage/>}/><Route path="files" element={<LegacyFilesRedirect/>}/><Route path="content" element={<Navigate to="/content/diagrams" replace/>}/><Route path="content/files" element={<ContentPage section="files"/>}/><Route path="content/diagrams" element={<ContentPage/>}/><Route path="content/diagrams/:scopeId/:diagramId" element={<ContentPage/>}/><Route path="content/lightbooks" element={<ContentPage section="lightbooks"/>}/><Route path="content/lightbooks/:lightbookId" element={<ContentPage section="lightbooks"/>}/><Route path="content/lightbooks/:lightbookId/versions/:pageVersionId" element={<ContentPage section="lightbooks"/>}/><Route path="content/lightbooks/:lightbookId/blocks/:blockId" element={<ContentPage section="lightbooks"/>}/><Route path="monitoring" element={<MonitoringPage/>}/><Route path="search" element={<SearchPage/>}/><Route path="tasks" element={<TaskerPage/>}/><Route path="tasks/:taskId" element={<TaskerPage/>}/><Route path="tasks/:taskId/edit" element={<TaskEditorPage/>}/><Route path="planner" element={<PlannerPage/>}/><Route path="projects" element={<ProjectorPage/>}/><Route path="equip" element={<EquipPage/>}/><Route path="exploiter" element={<ExploiterPage/>}/><Route path="exploiter/:scopeId/:entryId" element={<ExploiterPage/>}/><Route path="ledger" element={<LedgerPage/>}/><Route path="ledger/:scopeId/:transactionId" element={<LedgerPage/>}/><Route path="departments" element={<DepartmentsPage/>}/><Route path="contractors" element={<ContractorPage/>}/><Route path="kpi" element={<KpiPage/>}/><Route path="reports" element={<ReportsPage/>}/><Route path="darklog" element={<DarklogPage/>}/><Route path="darklog/:scopeId/:darklogId" element={<DarklogPage/>}/><Route path="plans" element={<PlansPage/>}/><Route path="contacts" element={<ContactPage/>}/><Route path="contacts/:scopeId/:contactId" element={<ContactPage/>}/><Route path="factor" element={<FactorPage/>}/><Route path="factor/:scopeId/:factId" element={<FactorPage/>}/><Route path="lore" element={<LorePage/>}/><Route path="lore/:scopeId/:loreId" element={<LoreReaderPage/>}/><Route path="events" element={<EventorPage/>}/><Route path="books" element={<BookerPage/>}/><Route path="books/:bookId" element={<BookerPage/>}/><Route path="books/:bookId/pages/:pageId" element={<BookerPage/>}/><Route path="books/:bookId/pages/:pageId/versions/:pageVersionId" element={<BookerPage/>}/><Route path="books/:bookId/pages/:pageId/blocks/:blockId" element={<BookerPage/>}/><Route path="books/:bookId/pages/:pageId/blocks/:blockId/versions/:versionId" element={<BookerPage/>}/></Route></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
