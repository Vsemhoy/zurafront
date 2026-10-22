export function createSaveFormState({ initial, persist, key = JSON.stringify, onSaved = () => {} }) {
  let baseline = initial;
  let state = { draft: initial, dirty: false, busy: false, phase: 'idle', error: '', savedCount: 0 };
  const listeners = new Set();
  const emit = (next) => {
    state = { ...state, ...next };
    state.dirty = key(state.draft) !== key(baseline);
    listeners.forEach((listener) => listener());
  };
  return {
    configure(callbacks) { persist = callbacks.persist; onSaved = callbacks.onSaved ?? (() => {}); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => state,
    change(update) { emit({ draft: typeof update === 'function' ? update(state.draft) : update, phase: 'idle', error: '' }); },
    receive(value) {
      if (state.busy || state.dirty) return;
      if (JSON.stringify(value) === JSON.stringify(baseline)) return;
      baseline = value;
      emit({ draft: value });
    },
    discard() { if (!state.busy) emit({ draft: baseline, phase: 'idle', error: '' }); },
    async save() {
      if (state.busy) return false;
      if (!state.dirty) return true;
      const submitted = structuredClone(state.draft);
      const original = baseline;
      emit({ busy: true, phase: 'saving', error: '' });
      try {
        const result = await persist(submitted, original);
        const unchanged = key(state.draft) === key(submitted);
        baseline = result;
        emit({ busy: false, draft: unchanged ? result : state.draft, phase: unchanged ? 'saved' : 'idle', savedCount: state.savedCount + 1 });
        onSaved(result);
        return !state.dirty;
      } catch (error) {
        emit({ busy: false, phase: 'error', error: error.message || 'Не удалось сохранить изменения.' });
        return false;
      }
    },
  };
}
