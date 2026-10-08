// A focus change or MDX's initial normalization is not an edit.
export function createMarkdownDraft(initialValue) {
  let markdown = initialValue ?? '';
  let saved = markdown;
  let edited = false;
  let pending = null;
  return {
    get markdown() { return markdown; },
    change(next, initialNormalization = false) {
      if (initialNormalization) {
        if (!edited) { markdown = next; saved = next; }
        return false;
      }
      markdown = next;
      edited = true;
      return true;
    },
    async save(onSave) {
      if (!onSave || !edited || markdown === saved || markdown === pending) return;
      const submitted = markdown;
      pending = submitted;
      try {
        await onSave(submitted || null);
        saved = submitted;
      } finally {
        if (pending === submitted) pending = null;
      }
    },
  };
}
