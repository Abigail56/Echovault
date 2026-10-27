import {
  BookOpen,
  Bot,
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Scale,
  Search,
  Settings,
  User as UserIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";

import { Logo, LogoMark } from "@/components/ui/Logo";
import { FullPageSpinner } from "@/components/ui/States";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vault", label: "Knowledge Vault", icon: BookOpen },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/decisions", label: "Decisions", icon: Scale },
  { href: "/search", label: "Search", icon: Search },
  { href: "/assistant", label: "Assistant", icon: Bot },
];

const COLLAPSE_KEY = "ev-sidebar-collapsed";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { pathname } = useRouter();
  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-field px-3 py-2 text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-primary/10 text-primary shadow-[inset_3px_0_0_var(--color-primary)]"
        : "text-muted hover:bg-base-200 hover:text-base-content hover:translate-x-0.5"
    } ${collapsed ? "justify-center px-0" : ""}`;

  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={linkClass(active)}
            aria-current={active ? "page" : undefined}
            title={collapsed ? label : undefined}
            onClick={onNavigate}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            <span className={collapsed ? "sr-only" : ""}>{label}</span>
          </Link>
        );
      })}
      <div className="mt-auto pt-4">
        <Link
          href="/settings"
          className={linkClass(isActive(pathname, "/settings"))}
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
          title={collapsed ? "Settings" : undefined}
          onClick={onNavigate}
        >
          <Settings className="size-[18px] shrink-0" aria-hidden />
          <span className={collapsed ? "sr-only" : ""}>Settings</span>
        </Link>
      </div>
    </nav>
  );
}

function MobileNav() {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const close = () => ref.current?.close();
    router.events.on("routeChangeStart", close);
    return () => router.events.off("routeChangeStart", close);
  }, [router.events]);

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-square btn-sm lg:hidden"
        onClick={() => ref.current?.showModal()}
        aria-label="Open navigation"
      >
        <Menu className="size-5" aria-hidden />
      </button>
      <dialog ref={ref} className="modal justify-start lg:hidden" aria-label="Navigation">
        <div className="bg-base-100 slide-in-left flex h-full w-72 max-w-[85vw] flex-col p-4 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <Logo href="/dashboard" />
            <button type="button" className="btn btn-ghost btn-square btn-sm" onClick={() => ref.current?.close()} aria-label="Close navigation">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <NavLinks onNavigate={() => ref.current?.close()} />
        </div>
        <button type="button" className="modal-backdrop" onClick={() => ref.current?.close()} tabIndex={-1} aria-label="Close navigation">
          close
        </button>
      </dialog>
    </>
  );
}

function HeaderSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    // Press "/" anywhere (outside a text field) to jump to search.
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && !target.isContentEditable) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = value.trim();
    if (q) void router.push({ pathname: "/search", query: { q } });
  };

  return (
    <form role="search" onSubmit={submit} className="min-w-0 flex-1 sm:max-w-md">
      <label className="input input-sm w-full">
        <Search className="text-muted size-4" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search everything"
          aria-label="Search your workspace"
          maxLength={200}
        />
        <kbd className="kbd kbd-xs hidden sm:inline-flex">/</kbd>
      </label>
    </form>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const initials = user.full_name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle" aria-label="Account menu">
        <span className="bg-primary text-primary-content grid size-8 place-items-center rounded-full text-xs font-semibold">
          {initials || <UserIcon className="size-4" aria-hidden />}
        </span>
      </div>
      <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box border-base-300 z-30 mt-2 w-60 border p-2 shadow-lg">
        <li className="menu-title px-3 py-2">
          <span className="text-base-content block truncate text-sm font-medium">{user.full_name}</span>
          <span className="text-meta block truncate font-normal">{user.email}</span>
        </li>
        <li>
          <Link href="/profile">
            <UserIcon className="size-4" aria-hidden /> Profile
          </Link>
        </li>
        <li>
          <Link href="/settings">
            <Settings className="size-4" aria-hidden /> Settings
          </Link>
        </li>
        <li>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await logout();
            }}
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </li>
      </ul>
    </div>
  );
}

function QuickCreate() {
  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-primary btn-sm" aria-label="Create new">
        <Plus className="size-4" aria-hidden />
        <span className="hidden sm:inline">New</span>
      </div>
      <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box border-base-300 z-30 mt-2 w-52 border p-2 shadow-lg">
        <li>
          <Link href="/vault/new">
            <BookOpen className="size-4" aria-hidden /> Knowledge item
          </Link>
        </li>
        <li>
          <Link href="/projects/new">
            <FolderKanban className="size-4" aria-hidden /> Project
          </Link>
        </li>
        <li>
          <Link href="/decisions/new">
            <Scale className="size-4" aria-hidden /> Decision
          </Link>
        </li>
      </ul>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  // The sidebar only renders after the client-side auth check, so storage is available here.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (status === "anonymous") {
      void router.replace({ pathname: "/login", query: { next: router.asPath } });
    }
  }, [status, router]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, current ? "0" : "1");
      } catch {
        // ignore unavailable storage
      }
      return !current;
    });
  };

  if (status !== "authenticated") return <FullPageSpinner label="Checking your session" />;

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="btn btn-sm btn-primary sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50">
        Skip to content
      </a>
      <aside
        className={`border-base-300 bg-base-100 sticky top-0 hidden h-dvh shrink-0 flex-col border-r p-3 transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[4.25rem]" : "w-64"
        }`}
      >
        <div className={`mb-6 flex h-10 items-center ${collapsed ? "justify-center" : "px-2"}`}>
          {collapsed ? (
            <Link href="/dashboard" aria-label="EchoVault Nexus dashboard">
              <LogoMark />
            </Link>
          ) : (
            <Logo href="/dashboard" />
          )}
        </div>
        <NavLinks collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleCollapsed}
          className={`btn btn-ghost btn-sm text-muted mt-2 ${collapsed ? "btn-square self-center" : "justify-start"}`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronsRight className="size-4" aria-hidden /> : <ChevronsLeft className="size-4" aria-hidden />}
          {!collapsed && <span className="font-normal">Collapse</span>}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-base-300 bg-base-100/90 sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-4 backdrop-blur sm:gap-3 sm:px-6">
          <MobileNav />
          <HeaderSearch />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <QuickCreate />
            <UserMenu />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none sm:px-6 lg:py-8">
          {/* Keyed by route so each page fades in on navigation (not on filter changes). */}
          <div key={router.pathname} className="animate-page-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/** Use as `Page.getLayout = appLayout` so the shell persists between pages. */
export const appLayout = (page: ReactNode) => <AppShell>{page}</AppShell>;
