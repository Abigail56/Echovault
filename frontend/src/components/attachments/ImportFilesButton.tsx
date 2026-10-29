import { FileUp } from "lucide-react";
import { useRouter } from "next/router";
import { useRef, useState } from "react";

import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/lib/api/client";
import { attachmentsApi, knowledgeApi } from "@/lib/api/services";

import { ACCEPT } from "@/lib/attachments";

/** "Q3-budget_final.pdf" -> "Q3 budget final" */
export function titleFromFilename(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return (stem || "Imported file").slice(0, 200);
}

/** Turns each chosen file into its own note, with the file attached and its text extracted. */
export function ImportFilesButton({ onImported }: { onImported: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const importFiles = async (files: File[]) => {
    const created: string[] = [];
    for (const [index, file] of files.entries()) {
      setProgress(`${index + 1}/${files.length}`);
      let noteId: string | null = null;
      try {
        const note = await knowledgeApi.create({
          title: titleFromFilename(file.name),
          content: "",
          tags: ["imported"],
          project_id: null,
          related_ids: [],
        });
        noteId = note.id;
        await attachmentsApi.upload(note.id, file, file.name);
        created.push(note.id);
      } catch (error) {
        // Don't leave an empty note behind if the file was refused.
        if (noteId) await knowledgeApi.remove(noteId).catch(() => undefined);
        toast.error(`${file.name}: ${errorMessage(error)}`);
      }
    }
    setProgress(null);
    if (created.length === 1) {
      await router.push(`/vault/${created[0]}`);
    } else if (created.length > 1) {
      toast.success(`Imported ${created.length} files. Their text is being read and will be searchable shortly.`);
      onImported();
    }
  };

  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => inputRef.current?.click()} disabled={progress !== null}>
        {progress ? <span className="loading loading-spinner loading-xs" aria-hidden /> : <FileUp className="size-4" aria-hidden />}
        {progress ? `Importing ${progress}` : "Import files"}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose files to import as notes"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void importFiles(files);
        }}
      />
    </>
  );
}
