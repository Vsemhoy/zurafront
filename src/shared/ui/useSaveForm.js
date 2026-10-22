import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createSaveFormState } from './saveFormState';
import { useEditorLeaveGuard } from './editorGuard';

export function useSaveForm({ initial, persist, onSaved, onSubmitted, key, label, active = true, validate }) {
  const [session] = useState(() => createSaveFormState({ initial, key, persist, onSaved }));
  useLayoutEffect(() => { session.configure({ persist, onSaved }); }, [session, persist, onSaved]);
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useEffect(() => { session.receive(initial); }, [session, initial]);
  const save = useCallback(async ({ leaving = false } = {}) => {
    if (!active || (validate && !validate())) return false;
    const success = await session.save();
    if (success && !leaving) onSubmitted?.(session.getSnapshot().draft);
    return success;
  }, [active, session, validate, onSubmitted]);
  useEffect(() => {
    if (!active) return;
    const keyboard = (event) => {
      if (!event.defaultPrevented && !document.querySelector('.editor-leave-dialog[open]') && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save(); }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [active, save]);
  const leave = useEditorLeaveGuard({ label, dirty: view.dirty, busy: view.busy, isDirty: () => session.getSnapshot().dirty, isBusy: () => session.getSnapshot().busy, save: () => save({ leaving: true }), discard: () => { session.discard(); session.receive(initial); } }, active);
  return { ...view, save, change: session.change, leave };
}
