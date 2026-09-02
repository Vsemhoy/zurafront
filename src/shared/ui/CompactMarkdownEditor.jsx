import { useRef, useState } from 'react';
import { IconCode, IconEye, IconTools } from '@tabler/icons-react';
import { BlockTypeSelect, BoldItalicUnderlineToggles, CreateLink, headingsPlugin, linkPlugin, listsPlugin, ListsToggle, markdownShortcutPlugin, MDXEditor, quotePlugin, toolbarPlugin, UndoRedo } from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import '../../pages/MarkdownEditor.css';

export default function CompactMarkdownEditor({ value, placeholder, onChange, onSave, hideToolbarTrigger = false, toolbarInitiallyOpen = false, toolbarOpen: controlledToolbarOpen, onToolbarOpenChange, variant = 'compact' }) {
    const [internalToolbarOpen, setInternalToolbarOpen] = useState(toolbarInitiallyOpen);
    const toolbarOpen = controlledToolbarOpen ?? internalToolbarOpen;
    const [sourceOpen, setSourceOpen] = useState(false);
    const [source, setSource] = useState(value ?? '');
    const [visualMarkdown, setVisualMarkdown] = useState(value ?? '');
    const [editorRevision, setEditorRevision] = useState(0);
    const markdown = useRef(value ?? '');
    const toggleSource = () => {
        if (sourceOpen) {
            setVisualMarkdown(markdown.current);
            setEditorRevision((revision) => revision + 1);
        }
        else setSource(markdown.current);
        setSourceOpen((open) => !open);
    };
    const toggleToolbar = () => {
        const next = !toolbarOpen;
        setInternalToolbarOpen(next);
        onToolbarOpenChange?.(next);
    };
    return <section className={`compact-md compact-md--${variant} ${toolbarOpen && !sourceOpen ? 'compact-md--toolbar' : ''} ${sourceOpen ? 'compact-md--source' : ''}`}><div className="md-editor-controls">{!hideToolbarTrigger && !sourceOpen && <button type="button" className="md-toolbar-trigger" onClick={toggleToolbar} title={toolbarOpen ? 'Скрыть инструменты Markdown' : 'Показать инструменты Markdown'} aria-pressed={toolbarOpen}><IconTools size={16}/><span>{toolbarOpen ? 'Скрыть панель' : 'Форматирование'}</span></button>}<button type="button" className="md-source-trigger" onClick={toggleSource} title={sourceOpen ? 'Вернуться к визуальному редактору' : 'Редактировать исходный Markdown'} aria-pressed={sourceOpen}>{sourceOpen ? <IconEye size={16}/> : <IconCode size={16}/>}<span>{sourceOpen ? 'Визуально' : 'Исходник'}</span></button></div>{sourceOpen ? <textarea className="md-source-input" value={source} placeholder={placeholder} spellCheck="false" onChange={(event) => { setSource(event.target.value); markdown.current = event.target.value; onChange?.(event.target.value); }} onBlur={() => onSave?.(markdown.current || null)}/> : <MDXEditor key={editorRevision} markdown={visualMarkdown} placeholder={placeholder} onChange={(nextMarkdown) => { markdown.current = nextMarkdown; onChange?.(nextMarkdown); }} onBlur={() => onSave?.(markdown.current || null)} plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), linkPlugin(), markdownShortcutPlugin(), toolbarPlugin({ toolbarContents: () => <><UndoRedo/><BlockTypeSelect/><BoldItalicUnderlineToggles/><ListsToggle/><CreateLink/></> })]}/>}</section>;
}
