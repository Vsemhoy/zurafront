import { useEffect, useRef, useState } from "react";

export function TaskTitleInput({ value, onSave, className, readOnly = false }) {
  const [draft, setDraft] = useState(value);
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setDraft(value);
  }, [value]);

  return (
    <input
      aria-label="Название задачи"
      className={className}
      value={readOnly ? value : draft}
      readOnly={readOnly}
      onFocus={() => { editing.current = true; }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        editing.current = false;
        if (!readOnly && draft !== value) onSave(draft);
      }}
    />
  );
}
