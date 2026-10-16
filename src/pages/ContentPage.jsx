import { NavLink, Navigate, useLocation } from 'react-router-dom';
import { IconFiles, IconSchema } from '@tabler/icons-react';
import { FilerPage } from './FilerPage';
import { DiagramsPage } from './DiagramsPage';
import './ContentPage.css';

export function LegacyFilesRedirect() {
  const location = useLocation();
  return <Navigate to={`/content/files${location.search}${location.hash}`} replace/>;
}

export function ContentPage({ section = 'diagrams' }) {
  return <div className="content-page"><nav className="content-tabs" aria-label="Библиотека контента"><strong>Контент</strong>
    <NavLink to="/content/files"><IconFiles size={17}/>Файлы</NavLink>
    <NavLink to="/content/diagrams"><IconSchema size={17}/>Схемы</NavLink>
  </nav>{section === 'files' ? <FilerPage/> : <DiagramsPage/>}</div>;
}
