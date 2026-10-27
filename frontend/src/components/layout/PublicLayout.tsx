import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/hooks/useAuth";

export function PublicNav() {
  const { status } = useAuth();
  return (
    <header className="border-base-300/70 bg-base-100/80 sticky top-0 z-20 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          <a href="#features" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            Features
          </a>
          <a href="#privacy" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            Privacy
          </a>
          {status === "authenticated" ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              Open workspace
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-base-300 bg-base-100 border-t">
      <div className="text-meta mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} EchoVault Nexus. A personal knowledge workspace.</p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/login" className="hover:text-base-content">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-base-content">
            Create account
          </Link>
          <a href="#privacy" className="hover:text-base-content">
            Privacy
          </a>
        </nav>
      </div>
    </footer>
  );
}

/** Centred card used by sign-in, registration and password pages. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-6xl px-4 py-5 sm:px-6">
        <Logo />
      </div>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">
          <div className="surface p-6 sm:p-8">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted mt-1 mb-6 text-sm">{subtitle}</p>
            {children}
          </div>
          {footer && <div className="text-muted mt-5 text-center text-sm">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
