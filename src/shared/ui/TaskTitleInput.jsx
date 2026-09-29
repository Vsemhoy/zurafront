import { useEffect, useRef, useState } from "react";

export function TaskTitleInput({ value, onSave, className }) {
  const [draft, setDraft] = useState(value);
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setDraft(value);
  }, [value]);

  return (
    <input
      aria-label="Название задачи"
      className={className}
      value={draft}
      onFocus={() => { editing.current = true; }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        editing.current = false;
        if (draft !== value) onSave(draft);
      }}
    />
  );
}
