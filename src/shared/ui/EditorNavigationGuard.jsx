import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import './EditorSaveBar.css';
import { EditorGuardContext } from './editorGuard';

export function EditorNavigationGuard({ children }) {
  const guards = useRef(new Set());
  const [pending, setPending] = useState(null);
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState('');
  const [tick, refresh] = useState(0);
  const dialog = useRef(null);
  const handledNavigation = useRef(null);
  const blocker = useBlocker(() => [...guards.current].some((guard) => guard.isDirty() || guard.isBusy()));
  useBeforeUnload(useCallback((event) => {
    if ([...guards.current].some((guard) => guard.isDirty() || guard.isBusy())) { event.preventDefault(); event.returnValue = ''; }
  }, []));
  const register = useCallback((guard) => { guards.current.add(guard); return () => guards.current.delete(guard); }, []);
  const changed = useCallback(() => refresh((value) => value + 1), []);
  const requestLeave = useCallback((guard, proceed, cancel = () => {}) => {
    if (!guard.isDirty() && !guard.isBusy()) { proceed(); return; }
    setFailure(''); setPending({ guard, proceed, cancel });
  }, []);
  const requestAction = useCallback((proceed) => {
    const guard = [...guards.current].reverse().find((entry) => entry.isDirty() || entry.isBusy());
    if (guard) requestLeave(guard, proceed);
    else proceed();
  }, [requestLeave]);
  useEffect(() => {
    if (blocker.state !== 'blocked') { handledNavigation.current = null; return; }
    if (pending || handledNavigation.current === blocker.location.key) return;
    handledNavigation.current = blocker.location.key;
    const guard = [...guards.current].reverse().find((entry) => entry.isDirty() || entry.isBusy());
    if (guard) requestLeave(guard, () => blocker.proceed(), () => blocker.reset());
    else blocker.proceed();
  }, [blocker, pending, requestLeave, tick]);
  useEffect(() => {
    if (!pending) return;
    const focus = document.activeElement;
    const element = dialog.current;
    element.showModal();
    return () => { element.close(); if (focus?.isConnected) focus.focus(); };
  }, [pending]);
  const stay = () => { if (!working) { pending.cancel(); setPending(null); } };
  const accept = async (save) => {
    if (working || pending.guard.isBusy()) return;
    setWorking(true); setFailure('');
    try {
      if (save && !(await pending.guard.save())) { setFailure('Не удалось завершить сохранение. Изменения остаются в редакторе.'); return; }
      if (!save) pending.guard.discard();
      if (pending.guard.isBusy() || (save && pending.guard.isDirty())) return;
      pending.proceed(); setPending(null);
    } catch (error) { setFailure(error.message); }
    finally { setWorking(false); }
  };
  return <EditorGuardContext.Provider value={{ register, changed, requestLeave, requestAction }}>{children}{pending && createPortal(<dialog ref={dialog} className="editor-leave-dialog" aria-labelledby="editor-leave-title" onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void accept(true); } }} onCancel={(event) => { event.preventDefault(); stay(); }}><h2 id="editor-leave-title">Есть несохранённые изменения</h2><p>{pending.guard.label}. Сохранить изменения перед выходом?</p>{failure && <p role="alert">{failure}</p>}<footer><button type="button" autoFocus disabled={working} onClick={stay}>Остаться</button><button type="button" disabled={working || pending.guard.isBusy()} onClick={() => void accept(false)}>Не сохранять</button><button type="button" className="primary" disabled={working || pending.guard.isBusy()} onClick={() => void accept(true)}>{working || pending.guard.isBusy() ? 'Сохраняю…' : 'Сохранить'}</button></footer></dialog>, document.body)}</EditorGuardContext.Provider>;
}
