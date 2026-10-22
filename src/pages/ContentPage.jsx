import { NavLink, Navigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '../app/workspace';
import { moduleEnabled } from '../entities/scope/modules';
import { IconFileDescription, IconFiles, IconSchema } from '@tabler/icons-react';
import { FilerPage } from './FilerPage';
import { DiagramsPage } from './DiagramsPage';
import { LightbookPage } from './LightbookPage';
import './ContentPage.css';

export function LegacyFilesRedirect() {
  const location = useLocation();
  return <Navigate to={`/content/files${location.search}${location.hash}`} replace/>;
}

export function ContentPage({ section = 'diagrams' }) {
  const { activeScope } = useWorkspace();
  const contentEnabled = moduleEnabled(activeScope, 'content');
  return <div className="content-page"><nav className="content-tabs" aria-label="Библиотека контента"><strong>Контент</strong>
    <NavLink to="/content/files"><IconFiles size={17}/>Файлы</NavLink>
    {contentEnabled && <NavLink to="/content/diagrams"><IconSchema size={17}/>Схемы</NavLink>}
    {contentEnabled && <NavLink to="/content/lightbooks"><IconFileDescription size={17}/>Lightbook</NavLink>}
  </nav>{section === 'files' ? <FilerPage/> : section === 'lightbooks' ? <LightbookPage/> : <DiagramsPage/>}</div>;
}
