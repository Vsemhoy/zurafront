import { useRef, useState } from 'react';
import { IconTools } from '@tabler/icons-react';
import { BlockTypeSelect, BoldItalicUnderlineToggles, CreateLink, headingsPlugin, linkPlugin, listsPlugin, ListsToggle, markdownShortcutPlugin, MDXEditor, quotePlugin, toolbarPlugin, UndoRedo } from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import '../../pages/MarkdownEditor.css';

export default function CompactMarkdownEditor({ value, placeholder, onSave, hideToolbarTrigger = false, variant = 'compact' }) {
    const [toolbarOpen, setToolbarOpen] = useState(false);
    const markdown = useRef(value ?? '');
    return <section className={`compact-md compact-md--${variant} ${toolbarOpen ? 'compact-md--toolbar' : ''}`}>{!hideToolbarTrigger && <button className="md-toolbar-trigger" onClick={() => setToolbarOpen((open) => !open)} title={toolbarOpen ? 'Скрыть инструменты Markdown' : 'Показать инструменты Markdown'} aria-pressed={toolbarOpen}><IconTools size={16}/><span>{toolbarOpen ? 'Скрыть панель' : 'Форматирование'}</span></button>}<MDXEditor markdown={value ?? ''} placeholder={placeholder} onChange={(nextMarkdown) => { markdown.current = nextMarkdown; }} onBlur={() => onSave(markdown.current || null)} plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), linkPlugin(), markdownShortcutPlugin(), toolbarPlugin({ toolbarContents: () => <><UndoRedo/><BlockTypeSelect/><BoldItalicUnderlineToggles/><ListsToggle/><CreateLink/></> })]}/></section>;
}
