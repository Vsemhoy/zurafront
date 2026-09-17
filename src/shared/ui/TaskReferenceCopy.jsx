import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { taskReference } from "../../entities/task/model";
import "./TaskReferenceCopy.css";

export function TaskReferenceCopy({ task, className = "" }) {
  const [copied, setCopied] = useState(false);
  const reference = taskReference(task);

  const copy = async () => {
    await navigator.clipboard.writeText(reference);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      type="button"
      className={`task-reference-inline ${copied ? "is-copied" : ""} ${className}`.trim()}
      title={copied ? "Код скопирован" : `Скопировать ${reference}`}
      aria-label={`Скопировать код задачи ${reference}`}
      onClick={copy}
    >
      <code>{reference}</code>
      {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
    </button>
  );
}
