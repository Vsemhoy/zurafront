import { useState } from 'react';
import { createPortal } from 'react-dom';
import { IconPaperclip, IconX } from '@tabler/icons-react';
import { FilePanel } from '../../pages/FilerPage';

export function AttachmentsButton({ scopeId, type, id }) {
    const [open, setOpen] = useState(false);
    if (!scopeId || !id) return null;
    return <><button type="button" title="Вложения" onClick={() => setOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconPaperclip size={16}/>Файлы</button>{open && createPortal(<div className="filer-backdrop" onClick={(event) => event.stopPropagation()}><section className="filer-preview" role="dialog" aria-modal="true" aria-label="Вложения"><header><strong>Вложения</strong><button type="button" aria-label="Закрыть" onClick={() => setOpen(false)}><IconX size={20}/></button></header><div style={{ overflow: 'auto', minHeight: 0 }}><FilePanel key={`${scopeId}:${type}:${id}`} scopeId={scopeId} subjectType={type} subjectId={id}/></div></section></div>, document.body)}</>;
}
