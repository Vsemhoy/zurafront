import { useState } from 'react';
import { IconCode, IconEye, IconTools } from '@tabler/icons-react';
import {
    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    CodeToggle,
    CreateLink,
    codeBlockPlugin,
    codeMirrorPlugin,
    headingsPlugin,
    InsertCodeBlock,
    InsertTable,
    InsertThematicBreak,
    linkPlugin,
    listsPlugin,
    ListsToggle,
    markdownShortcutPlugin,
    MDXEditor,
    quotePlugin,
    Separator,
    tablePlugin,
    thematicBreakPlugin,
    toolbarPlugin,
    UndoRedo,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import '../../pages/MarkdownEditor.css';
import { createMarkdownDraft } from './markdownDraft';
import MarkdownRenderer from './MarkdownRenderer';

export default function CompactMarkdownEditor({ value, placeholder, onChange, onSave, readOnly = false, hideToolbarTrigger = false, toolbarInitiallyOpen = false, toolbarOpen: controlledToolbarOpen, onToolbarOpenChange, variant = 'compact' }) {
    const [internalToolbarOpen, setInternalToolbarOpen] = useState(toolbarInitiallyOpen);
    const toolbarOpen = controlledToolbarOpen ?? internalToolbarOpen;
    const [sourceOpen, setSourceOpen] = useState(false);
    const [source, setSource] = useState(value ?? '');
    const [visualMarkdown, setVisualMarkdown] = useState(value ?? '');
    const [editorRevision, setEditorRevision] = useState(0);
    const [draft] = useState(() => createMarkdownDraft(value));
    const save = () => { if (!readOnly) void draft.save(onSave).catch(() => {}); };
    const toggleSource = () => {
        if (sourceOpen) {
            setVisualMarkdown(draft.markdown);
            setEditorRevision((revision) => revision + 1);
        }
        else setSource(draft.markdown);
        setSourceOpen((open) => !open);
    };
    const toggleToolbar = () => {
        const next = !toolbarOpen;
        setInternalToolbarOpen(next);
        onToolbarOpenChange?.(next);
    };
    if (readOnly) return <section className={`compact-md compact-md--${variant} compact-md--readonly`}><MarkdownRenderer>{value || 'Контент пока не добавлен.'}</MarkdownRenderer></section>;
    return <section className={`compact-md compact-md--${variant} ${toolbarOpen && !sourceOpen ? 'compact-md--toolbar' : ''} ${sourceOpen ? 'compact-md--source' : ''}`}>
        <div className="md-editor-controls">
            {!hideToolbarTrigger && !sourceOpen && <button type="button" className="md-toolbar-trigger" onClick={toggleToolbar} title={toolbarOpen ? 'Скрыть инструменты Markdown' : 'Показать инструменты Markdown'} aria-pressed={toolbarOpen}><IconTools size={16}/><span>{toolbarOpen ? 'Скрыть панель' : 'Форматирование'}</span></button>}
            <button type="button" className="md-source-trigger" onClick={toggleSource} title={sourceOpen ? 'Вернуться к визуальному редактору' : 'Редактировать исходный Markdown'} aria-pressed={sourceOpen}>{sourceOpen ? <IconEye size={16}/> : <IconCode size={16}/>}<span>{sourceOpen ? 'Визуально' : 'Исходник'}</span></button>
        </div>
        {sourceOpen ? <textarea className="md-source-input" value={source} placeholder={placeholder} spellCheck="false" onChange={(event) => {
            setSource(event.target.value);
            draft.change(event.target.value);
            onChange?.(event.target.value);
        }} onBlur={save}/> : <MDXEditor key={editorRevision} markdown={visualMarkdown} placeholder={placeholder} onChange={(nextMarkdown, initialNormalization) => {
            if (draft.change(nextMarkdown, initialNormalization)) onChange?.(nextMarkdown);
        }} onBlur={save} plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), linkPlugin(), tablePlugin(), thematicBreakPlugin(), codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }), codeMirrorPlugin({ codeBlockLanguages: { text: 'Текст', sql: 'SQL', javascript: 'JavaScript', typescript: 'TypeScript', php: 'PHP', html: 'HTML', css: 'CSS', json: 'JSON', bash: 'Bash', shell: 'Shell', markdown: 'Markdown', yaml: 'YAML', python: 'Python' } }), markdownShortcutPlugin(), toolbarPlugin({ toolbarContents: () => <><UndoRedo/><Separator/><BlockTypeSelect/><BoldItalicUnderlineToggles/><CodeToggle/><InsertCodeBlock/><Separator/><ListsToggle/><CreateLink/><Separator/><InsertThematicBreak/><InsertTable/></> })]}/>}
    </section>;
}
