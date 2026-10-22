import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef } from 'react';

export const EditorGuardContext = createContext(null);
export function useGuardedEditorAction() { return useContext(EditorGuardContext).requestAction; }

export function useEditorLeaveGuard(options, active = true) {
  const { register, changed, requestLeave } = useContext(EditorGuardContext);
  const latest = useRef(options);
  useLayoutEffect(() => { latest.current = options; }, [options]);
  useEffect(() => {
    if (!active) return;
    return register({ label: latest.current.label, isDirty: () => latest.current.isDirty(), isBusy: () => latest.current.isBusy(), save: () => latest.current.save(), discard: () => latest.current.discard() });
  }, [active, register]);
  useEffect(() => { changed(); }, [options.dirty, options.busy, changed]);
  return useCallback((proceed) => requestLeave(latest.current, proceed), [requestLeave]);
}
