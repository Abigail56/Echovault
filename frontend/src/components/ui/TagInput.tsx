import { X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";

interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export function normaliseTag(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 50);
}

/** Type a tag and press Enter or comma. Backspace on empty input removes the last tag. */
export function TagInput({ id, value, onChange, max = 20, ...aria }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const tag = normaliseTag(raw);
    if (tag && !value.includes(tag) && value.length < max) onChange([...value, tag]);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="input flex h-auto min-h-10 w-full flex-wrap items-center gap-1.5 py-1.5">
      {value.map((tag) => (
        <span key={tag} className="badge badge-soft badge-primary gap-1">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="hover:text-error rounded"
            aria-label={`Remove tag ${tag}`}
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        {...aria}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft && add(draft)}
        placeholder={value.length >= max ? `Maximum ${max} tags` : "Add a tag and press Enter"}
        disabled={value.length >= max}
        className="min-w-[8rem] flex-1 bg-transparent outline-none"
        maxLength={50}
      />
    </div>
  );
}
