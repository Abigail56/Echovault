import { FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useId, useRef, useState } from "react";

import { InlineError } from "@/components/ui/States";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/api/client";
import { authApi } from "@/lib/api/services";
import { TERMS_VERSION } from "@/lib/legal";

// Pages that stay usable without accepting, so people who disagree can
// still download their data or delete their account.
const EXEMPT_PATHS = ["/settings"];

/**
 * Asks signed-in users to accept the Terms again after they change. The
 * checkbox starts unticked; declining is possible via Settings.
 */
export function TermsUpdateGate() {
  const { user, setUser, logout } = useAuth();
  const { pathname } = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const checkboxId = useId();

  const needed = Boolean(user) && user?.terms_version !== TERMS_VERSION && !EXEMPT_PATHS.includes(pathname);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (needed && !dialog.open) dialog.showModal();
    if (!needed && dialog.open) dialog.close();
  }, [needed]);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      setUser(await authApi.acceptTerms(TERMS_VERSION));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={ref}
      className="modal modal-bottom sm:modal-middle"
      aria-labelledby={titleId}
      // Escape must not dismiss it: a choice is required.
      onCancel={(event) => event.preventDefault()}
    >
      <div className="modal-box space-y-4">
        <FileText className="text-primary size-6" aria-hidden />
        <h2 id={titleId} className="text-section">
          We&apos;ve updated our Terms
        </h2>
        <p className="text-muted text-sm">
          Please review the updated{" "}
          <Link href="/terms" target="_blank" className="link link-primary">
            Terms and Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="link link-primary">
            Privacy Policy
          </Link>{" "}
          (version {TERMS_VERSION}). To keep using your workspace, accept them below.
        </p>
        <p className="text-meta">
          Don&apos;t agree? You can still{" "}
          <Link href="/settings" className="link">
            download your data or delete your account
          </Link>{" "}
          in Settings.
        </p>
        <InlineError message={error} />
        <div className="flex items-start gap-3">
          <input id={checkboxId} type="checkbox" className="checkbox checkbox-sm checkbox-primary mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <label htmlFor={checkboxId} className="text-sm">
            I agree to the updated Terms and Conditions
          </label>
        </div>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={() => void logout()} disabled={busy}>
            Sign out
          </button>
          <button type="button" className="btn btn-primary" onClick={accept} disabled={!agreed || busy}>
            {busy && <span className="loading loading-spinner loading-xs" aria-hidden />}
            Accept and continue
          </button>
        </div>
      </div>
    </dialog>
  );
}
