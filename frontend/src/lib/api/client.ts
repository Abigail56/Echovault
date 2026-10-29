/**
 * The single place the frontend talks to the backend.
 *
 * - Requests go to NEXT_PUBLIC_API_URL (default "/api/v1", proxied to FastAPI
 *   by next.config.ts), with cookies included.
 * - State-changing requests copy the ev_csrf cookie into an X-CSRF-Token header.
 * - On 401, it tries ONE token refresh and then repeats the request once. This
 *   is safe even for POST: a 401 means the server rejected the request before
 *   doing anything, so the retry cannot create a duplicate.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  /** Field-level messages from 422 validation responses, keyed by field name. */
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";
type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  /** Skip the automatic refresh-and-retry (used by the auth endpoints themselves). */
  noRefresh?: boolean;
}

/** Called when the session can't be refreshed (the user must sign in again). */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_URL}${path}${qs ? `?${qs}` : ""}`;
}

interface ValidationIssue {
  loc?: (string | number)[];
  msg?: string;
}

async function toApiError(response: Response): Promise<ApiError> {
  let detail: unknown = null;
  try {
    detail = (await response.json())?.detail;
  } catch {
    // Non-JSON error body (e.g. proxy error page).
  }
  if (Array.isArray(detail)) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of detail as ValidationIssue[]) {
      const field = issue.loc?.[issue.loc.length - 1];
      if (typeof field === "string" && issue.msg) fieldErrors[field] = issue.msg.replace(/^Value error, /, "");
    }
    return new ApiError(response.status, "Please check the highlighted fields.", fieldErrors);
  }
  if (typeof detail === "string") return new ApiError(response.status, detail);
  if (response.status >= 500) {
    return new ApiError(response.status, "The server is having trouble. Please try again in a moment.");
  }
  return new ApiError(response.status, `Request failed (${response.status}).`);
}

let refreshInFlight: Promise<boolean> | null = null;

/** Refresh the session once, even if many requests fail at the same moment. */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= send("POST", "/auth/refresh")
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function send(method: Method, path: string, options: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  // FormData (file uploads) sets its own multipart Content-Type with a boundary.
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const csrf = readCookie("ev_csrf");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }
  return fetch(buildUrl(path, options.query), {
    method,
    headers,
    credentials: "include",
    body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    signal: options.signal,
  });
}

export async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await send(method, path, options);
    if (response.status === 401 && !options.noRefresh) {
      // Only attempt a refresh if there is a session to refresh (the CSRF
      // cookie is set at sign-in); otherwise skip straight to "signed out".
      if (readCookie("ev_csrf") && (await refreshSession())) {
        response = await send(method, path, options);
      } else {
        onSessionExpired?.();
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Can't reach the server. Check your connection and that the backend is running.");
  }
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body }),
  patch: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>("PATCH", path, { ...options, body }),
  delete: (path: string, options?: RequestOptions) => request<void>("DELETE", path, options),
  /** Upload one file as multipart/form-data under the field name "file". */
  upload: <T>(path: string, file: Blob, filename: string, options?: RequestOptions) => {
    const form = new FormData();
    form.append("file", file, filename);
    return request<T>("POST", path, { ...options, body: form });
  },
};

/**
 * Upload one file and report progress (0 to 1). Uses XMLHttpRequest because
 * fetch() can't report upload progress. Same rules as request(): cookies,
 * CSRF header, and one refresh-and-retry on 401.
 */
export function uploadWithProgress<T>(
  path: string,
  file: Blob,
  filename: string,
  onProgress?: (fraction: number) => void,
  retried = false,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file, filename);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", buildUrl(path));
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    const csrf = readCookie("ev_csrf");
    if (csrf) xhr.setRequestHeader("X-CSRF-Token", csrf);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onerror = () => reject(new ApiError(0, "Can't reach the server. Check your connection and that the backend is running."));
    xhr.onload = async () => {
      if (xhr.status === 401 && !retried) {
        if (readCookie("ev_csrf") && (await refreshSession())) {
          uploadWithProgress<T>(path, file, filename, onProgress, true).then(resolve, reject);
        } else {
          onSessionExpired?.();
          reject(new ApiError(401, "Your session has expired. Please sign in again."));
        }
        return;
      }
      const response = new Response(xhr.responseText || null, { status: xhr.status });
      if (xhr.status < 200 || xhr.status >= 300) return reject(await toApiError(response));
      resolve(JSON.parse(xhr.responseText) as T);
    };
    xhr.send(form);
  });
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something unexpected happened. Please try again.";
}
