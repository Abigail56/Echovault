import { useCallback, useEffect, useEffectEvent, useState } from "react";

import { ApiError } from "@/lib/api/client";

interface AsyncState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  /** Re-run the loader (e.g. after a mutation or from a "Try again" button). */
  reload: () => void;
  setData: (data: T) => void;
}

interface Settled<T> {
  key: string | null;
  data: T | null;
  error: ApiError | null;
}

/**
 * Loads data when `deps` change and tracks loading/error state.
 * Pass `enabled: false` to wait (e.g. until router.query is ready).
 * While reloading, the previous data stays available so lists don't flash.
 */
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  enabled = true,
): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>({ key: null, data: null, error: null });
  // Identifies the current request; a response for an older key is ignored.
  const key = `${nonce}:${JSON.stringify(deps)}`;

  const load = useEffectEvent((signal: AbortSignal) => loader(signal));

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ key, data, error: null });
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        const error = err instanceof ApiError ? err : new ApiError(0, "Something unexpected happened.");
        setSettled((prev) => ({ key, data: prev.data, error }));
      },
    );
    return () => controller.abort();
  }, [enabled, key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((data: T) => setSettled((prev) => ({ ...prev, data })), []);

  const current = settled.key === key;
  return {
    data: settled.data,
    error: current ? settled.error : null,
    loading: enabled && !current,
    reload,
    setData,
  };
}
