import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useDebounce } from "@/hooks/useDebounce";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "sm" | "md" | "lg";
}

/** A search box that reports changes after the user pauses typing. */
export function SearchInput({ value, onChange, label, placeholder, autoFocus, size = "md" }: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const debounced = useDebounce(draft, 300);

  // Follow outside changes (e.g. the back button), but not the echo of what
  // the user just typed, which could otherwise wipe newer keystrokes.
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== debounced) setDraft(value);
  }

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const sizeClass = size === "lg" ? "input-lg" : size === "sm" ? "input-sm" : "";
  return (
    <label className={`input w-full ${sizeClass}`}>
      <Search className="text-muted size-4 shrink-0" aria-hidden />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoFocus={autoFocus}
        maxLength={200}
      />
      {draft && (
        <button type="button" className="btn btn-ghost btn-xs btn-circle" onClick={() => setDraft("")} aria-label="Clear search">
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </label>
  );
}
