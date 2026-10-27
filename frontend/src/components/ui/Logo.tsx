import Link from "next/link";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M9 11.5h14M9 16h10M9 20.5h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="text-primary-content" />
      <circle cx="22.5" cy="16" r="2.2" className="fill-secondary" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight">
      <LogoMark />
      <span>
        EchoVault <span className="text-muted font-medium">Nexus</span>
      </span>
    </Link>
  );
}
