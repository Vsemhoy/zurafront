import { useState } from 'react';
import { useWorkspace } from '../../app/workspace';
import { moduleEnabled } from '../../entities/scope/modules';
import { createPortal } from 'react-dom';
import { IconPaperclip, IconX } from '@tabler/icons-react';
import { PhotoPanel } from './PhotoPanel';
import { FilePanel } from '../../pages/FilerPage';
import { DiagramAttachmentsPanel } from './DiagramAttachmentsPanel';
import { diagramTargetTypes } from '../../entities/diagram/model';

export function AttachmentsButton({ scopeId, type, id, readOnly = false }) {
    const { activeScope } = useWorkspace();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('files');
    if (!scopeId || !id) return null;
    return <><button type="button" title="Вложения" onClick={() => setOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconPaperclip size={16}/>Вложения</button>{open && createPortal(<div className="filer-backdrop" onClick={(event) => event.stopPropagation()}><section className="filer-preview" role="dialog" aria-modal="true" aria-label="Вложения"><header><strong>Вложения</strong><button type="button" aria-label="Закрыть" onClick={() => setOpen(false)}><IconX size={20}/></button></header><div style={{ overflow: 'auto', minHeight: 0 }}><nav><button onClick={() => setTab('files')}>Файлы</button><button onClick={() => setTab('photos')}>Фотографии</button>{moduleEnabled(activeScope, 'content') && diagramTargetTypes[type] && <button onClick={() => setTab('diagrams')}>Схемы</button>}</nav>{tab === 'diagrams' ? <DiagramAttachmentsPanel scopeId={scopeId} type={type} id={id} readOnly={readOnly}/> : tab === 'photos' ? <PhotoPanel scopeId={scopeId} type={type} id={id} readOnly={readOnly}/> : <FilePanel key={`${scopeId}:${type}:${id}`} scopeId={scopeId} subjectType={type} subjectId={id} readOnly={readOnly}/>}</div></section></div>, document.body)}</>;
}
