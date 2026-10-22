import { IconAlertCircle, IconCheck, IconDeviceFloppy, IconLoader2 } from '@tabler/icons-react';
import './EditorSaveBar.css';

export function EditorSaveBar({ dirty, busy, phase, savedCount = 0, onSave, disabled = false, label = 'Сохранить', children }) {
  const status = phase === 'loading' ? 'Подготавливаю…' : phase === 'checking' ? 'Проверяю изменения…' : busy ? 'Сохраняю…' : phase === 'error' ? 'Не сохранено' : dirty ? 'Есть несохранённые изменения' : phase === 'saved' ? 'Сохранено' : 'Изменений нет';
  const kind = busy ? 'saving' : phase === 'error' ? 'error' : dirty ? 'dirty' : phase === 'saved' ? 'saved' : 'idle';
  const busyLabel = phase === 'checking' ? 'Проверяю…' : phase === 'loading' ? 'Подготавливаю…' : 'Сохраняю…';
  return <div className="editor-save-bar">
    <span className={`editor-save-state editor-save-state--${kind}`} role="status" aria-live="polite">
      {busy ? <IconLoader2 size={15} className="editor-save-spin"/> : phase === 'error' ? <IconAlertCircle size={15}/> : kind === 'saved' ? <IconCheck key={savedCount} size={16} className="editor-save-check"/> : dirty ? <i aria-hidden="true"/> : null}{status}
    </span>
    <div className="editor-save-actions">{children}<button type="button" className="editor-save-button" disabled={disabled || busy || !dirty} onClick={() => void onSave()} title="Сохранить · Ctrl+S / ⌘S">{busy ? <IconLoader2 size={16} className="editor-save-spin"/> : <IconDeviceFloppy size={16}/>}<span>{busy ? busyLabel : label}</span></button></div>
  </div>;
}
