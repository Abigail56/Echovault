import { Link2, Plus, Search, X } from "lucide-react";
import { useState } from "react";

import { useAsync } from "@/hooks/useAsync";
import { useDebounce } from "@/hooks/useDebounce";
import { knowledgeApi } from "@/lib/api/services";
import type { KnowledgeRef } from "@/lib/api/types";

interface RelatedNotesPickerProps {
  id?: string;
  /** The note being edited (excluded from suggestions). */
  currentId?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  /** Titles for ids that are already linked when the form opens. */
  initialRefs?: KnowledgeRef[];
  "aria-describedby"?: string;
}

/** Link this note to other notes. Suggestions come from the user's own vault. */
export function RelatedNotesPicker({ id, currentId, value, onChange, initialRefs = [], ...aria }: RelatedNotesPickerProps) {
  const [query, setQuery] = useState("");
  const [titles, setTitles] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialRefs.map((r) => [r.id, r.title])),
  );
  const debounced = useDebounce(query.trim(), 250);
  const suggestions = useAsync(
    (signal) => knowledgeApi.list({ q: debounced, limit: 6, sort: "updated_at" }, signal),
    [debounced],
    debounced.length > 0,
  );
  const options = (debounced ? (suggestions.data?.items ?? []) : []).filter(
    (n) => n.id !== currentId && !value.includes(n.id),
  );

  const add = (noteId: string, title: string) => {
    setTitles((t) => ({ ...t, [noteId]: title }));
    onChange([...value, noteId]);
    setQuery("");
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Linked notes">
          {value.map((noteId) => (
            <li key={noteId} className="badge badge-soft badge-secondary h-auto gap-1 py-1">
              <Link2 className="size-3" aria-hidden />
              <span className="max-w-[14rem] truncate">{titles[noteId] ?? "Linked note"}</span>
              <button
                type="button"
                className="hover:text-error rounded"
                onClick={() => onChange(value.filter((v) => v !== noteId))}
                aria-label={`Remove link to ${titles[noteId] ?? "note"}`}
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="input w-full">
        <Search className="text-muted size-4 shrink-0" aria-hidden />
        <input
          id={id}
          {...aria}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={value.length >= 20 ? "Maximum 20 linked notes" : "Search your notes to link"}
          disabled={value.length >= 20}
          maxLength={200}
          autoComplete="off"
        />
      </label>
      {debounced && (
        <div className="surface max-h-56 overflow-y-auto p-1" aria-live="polite">
          {suggestions.loading ? (
            <p className="text-meta p-2">Searching…</p>
          ) : options.length ? (
            <ul>
              {options.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className="hover:bg-base-200 flex w-full items-center gap-2 rounded-field px-2 py-2 text-left text-sm"
                    onClick={() => add(n.id, n.title)}
                  >
                    <Plus className="text-primary size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{n.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-meta p-2">No other notes match “{debounced}”.</p>
          )}
        </div>
      )}
    </div>
  );
}
