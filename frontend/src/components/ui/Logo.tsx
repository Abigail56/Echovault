import Link from "next/link";
import { useId } from "react";

/**
 * The EchoVault mark: three linked nodes (a note, a project and a decision)
 * inside a rounded vault. Kept deliberately simple so it reads at 16px.
 */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  const gradient = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--color-primary)" }} />
          <stop offset="1" style={{ stopColor: "var(--color-accent)" }} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradient})`} />
      <g className="stroke-primary-content" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M10 21.5 16 10.5 22 21.5Z" strokeLinejoin="round" opacity="0.55" />
      </g>
      <circle cx="16" cy="10.5" r="3" className="fill-primary-content" />
      <circle cx="10" cy="21.5" r="3" className="fill-primary-content" />
      <circle cx="22" cy="21.5" r="3" fill="#ffffff" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight">
      <LogoMark />
      <span className="whitespace-nowrap">
        EchoVault <span className="text-muted hidden font-medium min-[400px]:inline">Nexus</span>
      </span>
    </Link>
  );
}
