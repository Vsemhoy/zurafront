import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MarkdownRenderer.css';

export default function MarkdownRenderer({ children }) {
    const markdown = typeof children === 'string' ? children : String(children ?? '');
    if (!markdown) return <p className="markdown-renderer-empty">Пустой текстовый блок</p>;

    return <div className="markdown-renderer"><ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown></div>;
}
