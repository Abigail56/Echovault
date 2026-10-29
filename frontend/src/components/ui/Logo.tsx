import Link from "next/link";

/**
 * The EchoVault mark: three linked nodes (a note, a project and a decision)
 * inside a rounded vault. Kept deliberately simple so it reads at 16px.
 */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <g className="stroke-primary-content" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M10 21.5 16 10.5 22 21.5Z" strokeLinejoin="round" opacity="0.55" />
      </g>
      <circle cx="16" cy="10.5" r="3" className="fill-primary-content" />
      <circle cx="10" cy="21.5" r="3" className="fill-primary-content" />
      <circle cx="22" cy="21.5" r="3" className="fill-secondary" />
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
