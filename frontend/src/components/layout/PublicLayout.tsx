import { Menu } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo, LogoMark } from "@/components/ui/Logo";
import { useAuth } from "@/hooks/useAuth";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

// Absolute ("/#…") so they also work from the legal pages.
const SECTIONS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#privacy", label: "Privacy" },
];

export function PublicNav() {
  const { status } = useAuth();
  const signedIn = status === "authenticated";
  return (
    <header className="border-base-300/70 bg-base-200/85 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ul className="hidden items-center gap-1 md:flex">
            {SECTIONS.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="btn btn-ghost btn-sm font-normal">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              Open workspace
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm hidden min-[380px]:inline-flex">
                Create account
              </Link>
            </>
          )}
          {/* Section links on small screens. */}
          <div className="dropdown dropdown-end md:hidden">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-square" aria-label="Open site menu">
              <Menu className="size-5" aria-hidden />
            </div>
            <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box border-base-300 z-40 mt-2 w-52 border p-2 shadow-lg">
              {SECTIONS.map((s) => (
                <li key={s.href}>
                  <Link href={s.href}>{s.label}</Link>
                </li>
              ))}
              {!signedIn && (
                <li>
                  <Link href="/register">Create account</Link>
                </li>
              )}
            </ul>
          </div>
        </nav>
      </div>
    </header>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#privacy", label: "Privacy & security" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/register", label: "Create account" },
      { href: "/forgot-password", label: "Reset password" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms and Conditions" },
      { href: "/acceptable-use", label: "Acceptable Use Policy" },
      { href: "/cookies", label: "Cookie Policy" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-base-300 bg-sidebar border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5 font-semibold">
            <LogoMark className="size-6" /> EchoVault Nexus
          </div>
          <p className="text-muted mt-3 text-sm">
            Personal knowledge &amp; project intelligence. Capture what you learn, organise your projects and keep the reasoning behind
            your decisions.
          </p>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-sm font-semibold">{col.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted hover:text-base-content">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-base-300 border-t">
        <p className="text-meta mx-auto max-w-6xl px-4 py-5 sm:px-6">
          © {new Date().getFullYear()} EchoVault Nexus. Legal documents last updated {LEGAL_LAST_UPDATED}.
        </p>
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
          <div className="surface animate-page-in p-6 sm:p-8">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted mt-1 mb-6 text-sm">{subtitle}</p>
            {children}
          </div>
          {footer && <div className="text-muted mt-5 text-center text-sm">{footer}</div>}
        </div>
      </main>
      <nav aria-label="Legal" className="text-meta flex flex-wrap justify-center gap-x-4 gap-y-1 px-4 pb-6">
        <Link href="/terms" className="hover:text-base-content">Terms</Link>
        <Link href="/privacy" className="hover:text-base-content">Privacy</Link>
        <Link href="/acceptable-use" className="hover:text-base-content">Acceptable use</Link>
        <Link href="/contact" className="hover:text-base-content">Contact</Link>
      </nav>
    </div>
  );
}

/** Layout for legal and contact pages: readable line length, table of contents. */
export function LegalLayout({ title, summary, children }: { title: string; summary: ReactNode; children: ReactNode }) {
  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="eyebrow mb-2">Legal</p>
        <h1 className="text-headline">{title}</h1>
        <p className="text-meta mt-3">Last updated {LEGAL_LAST_UPDATED}</p>
        <div className="border-warning/40 bg-warning/5 mt-6 rounded-box border p-4 text-sm">
          <strong className="font-semibold">Draft for review.</strong> This document describes how the software currently works. Items in
          [square brackets] are placeholders the operator must complete, and the text should be reviewed by a qualified lawyer for each
          jurisdiction before a commercial launch.
        </div>
        <div className="text-muted mt-6 text-[0.9375rem]">{summary}</div>
        <div className="legal-prose mt-10">{children}</div>
      </main>
      <PublicFooter />
    </>
  );
}
