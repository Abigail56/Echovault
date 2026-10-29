import { useRouter } from "next/router";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { InlineError } from "@/components/ui/States";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/api/client";
import { authApi } from "@/lib/api/services";

/** Asks for the password before permanently deleting the account. */
export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { forgetSession } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const passwordId = useId();
  const confirmId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    if (busy) return;
    setPassword("");
    setConfirmText("");
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.deleteAccount(password);
      // Leave the protected area first; otherwise the sign-in guard would
      // redirect to /login before the confirmation page is shown.
      await router.replace("/?account=deleted");
      forgetSession();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={ref}
      className="modal modal-bottom sm:modal-middle"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <form className="modal-box space-y-4" onSubmit={submit}>
        <h2 id={titleId} className="text-section">
          Delete your account permanently?
        </h2>
        <p className="text-muted text-sm">
          All your notes, projects, decisions and tags will be deleted immediately and can&apos;t be recovered.
        </p>
        <InlineError message={error} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={passwordId} className="text-sm font-medium">
            Your password
          </label>
          <input id={passwordId} type="password" className="input w-full" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={confirmId} className="text-sm font-medium">
            Type <span className="font-mono">DELETE</span> to confirm
          </label>
          <input id={confirmId} className="input w-full" autoComplete="off" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </div>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-error" disabled={busy || !password || confirmText !== "DELETE"}>
            {busy && <span className="loading loading-spinner loading-xs" aria-hidden />}
            Delete account
          </button>
        </div>
      </form>
      <button type="button" className="modal-backdrop" onClick={close} aria-label="Close dialog" tabIndex={-1}>
        close
      </button>
    </dialog>
  );
}
