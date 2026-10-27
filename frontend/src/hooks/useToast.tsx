import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-2), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({ success: (m: string) => push("success", m), error: (m: string) => push("error", m) }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast toast-end toast-bottom z-[60] max-w-[calc(100vw-2rem)]" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={`alert animate-toast-in ${toast.kind === "error" ? "alert-error" : "alert-success"} flex items-start gap-2 shadow-lg`}
          >
            {toast.kind === "error" ? <CircleAlert className="size-5 shrink-0" aria-hidden /> : <CheckCircle2 className="size-5 shrink-0" aria-hidden />}
            <span className="text-sm">{toast.message}</span>
            <button type="button" className="btn btn-ghost btn-xs btn-square ml-auto" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
