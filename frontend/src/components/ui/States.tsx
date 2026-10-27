import type { LucideIcon } from "lucide-react";
import { CircleAlert, RefreshCw, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { ApiError } from "@/lib/api/client";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center px-6 py-12 text-center">
      <div className="bg-base-200 mb-4 grid size-12 place-items-center rounded-full">
        <Icon className="text-primary size-6" aria-hidden />
      </div>
      <h2 className="text-section">{title}</h2>
      <p className="text-muted mt-1 max-w-md text-sm">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError | Error; onRetry?: () => void }) {
  const offline = error instanceof ApiError && error.isNetworkError;
  const notFound = error instanceof ApiError && error.status === 404;
  const Icon = offline ? WifiOff : CircleAlert;
  return (
    <div role="alert" className="surface flex flex-col items-center px-6 py-10 text-center">
      <Icon className="text-error mb-3 size-8" aria-hidden />
      <h2 className="text-section">{notFound ? "Not found" : offline ? "You're offline" : "Couldn't load this"}</h2>
      <p className="text-muted mt-1 max-w-md text-sm">
        {notFound ? "It may have been deleted, or it never existed." : error.message}
      </p>
      {onRetry && !notFound && (
        <button type="button" className="btn btn-sm mt-4" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden /> Try again
        </button>
      )}
    </div>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="alert alert-error alert-soft text-sm">
      <CircleAlert className="size-4" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="surface space-y-3 p-5">
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton h-8 w-2/3" />
      <div className="surface space-y-3 p-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-3" style={{ width: `${90 - i * 8}%` }} />
        ))}
      </div>
    </div>
  );
}

export function FullPageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status">
      <span className="loading loading-spinner loading-md text-primary" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
