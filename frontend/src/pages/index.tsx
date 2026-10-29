import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  FileText,
  FolderKanban,
  KeyRound,
  Link2,
  Lock,
  Scale,
  Search,
  ServerCog,
  ShieldCheck,
  Target,
  UserCheck,
} from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";

import { PublicFooter, PublicNav } from "@/components/layout/PublicLayout";
import { HeroGraph } from "@/components/landing/HeroGraph";
import { ConnectionMap } from "@/components/ui/ConnectionMap";
import { Reveal } from "@/components/ui/Reveal";
import { useAuth } from "@/hooks/useAuth";

const HEADLINE = "Your knowledge, connected to every decision.";
const SUPPORT =
  "Capture what you learn, organise your projects, and preserve the reasoning behind your decisions. Find the right information when you need it, with an AI assistant that answers from your own knowledge and shows its sources.";

function SampleLabel({ children = "Illustration with sample data" }: { children?: ReactNode }) {
  return <p className="text-meta mt-3 text-center">{children}</p>;
}

/** A static picture of the workspace built from the app's own styles. */
function ProductPreview() {
  return (
    <figure aria-label="Illustration of the EchoVault workspace with sample data">
      <div className="surface overflow-hidden shadow-2xl shadow-black/30" aria-hidden>
        <div className="border-base-300 bg-sidebar flex items-center gap-1.5 border-b px-4 py-2.5">
          <span className="bg-base-300 size-2.5 rounded-full" />
          <span className="bg-base-300 size-2.5 rounded-full" />
          <span className="bg-base-300 size-2.5 rounded-full" />
          <span className="bg-base-200 text-meta ml-3 truncate rounded px-3 py-0.5">workspace / search</span>
        </div>
        <div className="grid sm:grid-cols-[9.5rem_1fr]">
          <div className="border-base-300 bg-sidebar hidden space-y-1 border-r p-3 text-xs sm:block">
            {[
              [BookOpen, "Vault", false],
              [FolderKanban, "Projects", false],
              [Scale, "Decisions", false],
              [Search, "Search", true],
              [Bot, "Assistant", false],
            ].map(([Icon, label, active]) => {
              const I = Icon as typeof BookOpen;
              return (
                <div key={label as string} className={`flex items-center gap-2 rounded px-2 py-1.5 ${active ? "bg-primary/10 text-primary" : "text-muted"}`}>
                  <I className="size-3.5" /> {label as string}
                </div>
              );
            })}
          </div>
          <div className="min-w-0 space-y-2.5 p-4">
            <div className="input input-sm pointer-events-none w-full">
              <Search className="text-muted size-3.5" /> <span className="text-xs">rate limit</span>
            </div>
            <div className="flex gap-1.5 text-[0.6875rem]">
              <span className="bg-primary text-primary-content rounded px-2 py-0.5">All 3</span>
              <span className="text-muted border-base-300 rounded border px-2 py-0.5">Notes 2</span>
              <span className="text-muted border-base-300 rounded border px-2 py-0.5">Decisions 1</span>
            </div>
            <div className="border-base-300 rounded-field border p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <BookOpen className="text-primary size-3.5" /> Token bucket <mark className="bg-primary/20 text-base-content rounded-sm">rate limit</mark>ing
              </p>
              <p className="text-muted mt-0.5 truncate text-xs">Refill rate vs burst size, with Redis-free in-process option…</p>
              <p className="text-meta mt-1.5 flex items-center gap-1">
                <FolderKanban className="size-3" /> Public API launch
              </p>
            </div>
            <div className="border-base-300 rounded-field border p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Scale className="text-primary size-3.5" /> Limit sign-in attempts per email
                <span className="badge badge-primary badge-soft badge-xs ml-auto shrink-0">Accepted</span>
              </p>
              <p className="text-muted mt-0.5 truncate text-xs">Selected: 8 attempts per 15 minutes, per email and per IP…</p>
            </div>
            <div className="border-base-300 rounded-field border p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <BookOpen className="text-primary size-3.5" /> Nginx <mark className="bg-primary/20 text-base-content rounded-sm">rate limit</mark> config
              </p>
              <p className="text-meta mt-1.5 flex items-center gap-1">
                <Link2 className="size-3" /> Related: Token bucket rate limiting
              </p>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-meta mt-3 text-center">Illustration with sample data</figcaption>
    </figure>
  );
}

function FeatureRow({ icon: Icon, eyebrow, title, children, points }: { icon: typeof BookOpen; eyebrow: string; title: string; children: ReactNode; points: string[] }) {
  return (
    <Reveal className="surface grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
      <div>
        <span className="bg-primary/10 text-primary mb-4 grid size-10 place-items-center rounded-field">
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h3>
        <p className="text-muted mt-2 max-w-prose">{children}</p>
      </div>
      <ul className="space-y-2.5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[0.9375rem]">
            <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

function SampleDecision() {
  const rows: [string, string][] = [
    ["Context", "Our public API launches next month; a single client can currently exhaust the database connection pool."],
    ["Problem", "How do we stop abusive bursts without blocking legitimate integrations?"],
    ["Alternatives", "Per-IP limits at the proxy · per-API-key token bucket in the app · no limits, scale the database instead"],
  ];
  return (
    <figure aria-label="Sample decision record">
      <div className="surface overflow-hidden">
        <div className="border-base-300 flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
          <p className="font-semibold">Rate-limit the public API per key</p>
          <span className="badge badge-success badge-soft badge-sm gap-1">
            <CheckCircle2 className="size-3" aria-hidden /> Reviewed
          </span>
        </div>
        <dl className="divide-base-300 divide-y">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[8rem_1fr]">
              <dt className="text-meta font-medium uppercase">{k}</dt>
              <dd className="text-muted text-sm">{v}</dd>
            </div>
          ))}
          <div className="bg-primary/5 grid gap-1 px-5 py-4 sm:grid-cols-[8rem_1fr]">
            <dt className="eyebrow flex items-center gap-1">
              <Target className="size-3.5" aria-hidden /> Selected
            </dt>
            <dd className="text-sm font-medium">Token bucket per API key, 100 requests/minute with bursts of 20.</dd>
          </div>
          <div className="grid gap-1 px-5 py-3 sm:grid-cols-[8rem_1fr]">
            <dt className="text-meta font-medium uppercase">Reasoning</dt>
            <dd className="text-muted text-sm">Fair per customer, no extra infrastructure, and limits can differ by plan later.</dd>
          </div>
          <div className="grid sm:grid-cols-2">
            <div className="border-base-300 px-5 py-3 sm:border-r">
              <dt className="text-meta font-medium uppercase">Expected</dt>
              <dd className="text-muted mt-1 text-sm">No pool exhaustion; fewer than 1% of requests limited.</dd>
            </div>
            <div className="border-base-300 border-t px-5 py-3 sm:border-t-0">
              <dt className="text-meta font-medium uppercase">Actual (review)</dt>
              <dd className="text-muted mt-1 text-sm">Zero pool incidents in 6 weeks; 0.3% limited, mostly one buggy client.</dd>
            </div>
          </div>
        </dl>
      </div>
      <SampleLabel />
    </figure>
  );
}

export default function Home() {
  const { status } = useAuth();
  const router = useRouter();
  const signedIn = status === "authenticated";
  const primaryCta = signedIn ? { href: "/dashboard", label: "Open your workspace" } : { href: "/register", label: "Create your vault" };

  return (
    <>
      <Head>
        <title>EchoVault Nexus · Your knowledge, connected to every decision</title>
      </Head>
      <PublicNav />
      <main>
        {router.query.account === "deleted" && (
          <div role="status" className="alert alert-soft alert-success mx-auto mt-6 max-w-6xl rounded-box text-sm sm:mx-6 lg:mx-auto">
            <CheckCircle2 className="size-4" aria-hidden /> Your account and all its data have been deleted.
          </div>
        )}

        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:pt-24 lg:pb-28">
          <div className="stagger">
            <p className="eyebrow">Personal knowledge &amp; project intelligence</p>
            <h1 className="text-display mt-4">{HEADLINE}</h1>
            <p className="text-muted mt-6 max-w-xl text-[1.0625rem] leading-relaxed">{SUPPORT}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={primaryCta.href} className="btn btn-primary btn-lg nudge-icon grow font-semibold sm:grow-0">
                {primaryCta.label} <ArrowRight className="size-5" aria-hidden />
              </Link>
              <Link href="#workspace" className="btn btn-outline btn-lg border-base-300 grow font-semibold sm:grow-0">
                Explore the workspace
              </Link>
            </div>
          </div>
          <div className="min-w-0">
            <HeroGraph />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-base-300 bg-sidebar scroll-mt-16 border-y py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="eyebrow">Features</p>
            <h2 className="text-headline mt-2 max-w-2xl">Five tools. One connected workspace.</h2>
            <p className="text-muted mt-3 max-w-2xl">Everything lives in one place and links together, so what you learn stays findable long after you save it.</p>
            <Reveal className="mx-auto mt-12 max-w-3xl">
              <div id="workspace" className="scroll-mt-24">
                <ProductPreview />
              </div>
            </Reveal>
            <div className="mt-12 grid gap-5">
              <FeatureRow
                icon={BookOpen}
                eyebrow="Knowledge Vault"
                title="Capture notes the way you think"
                points={["Markdown with live preview", "Tags, project links and related-note links", "Archive old notes without losing them"]}
              >
                Save lessons, snippets, references and ideas. Every note can point to the project it belongs to and the other notes it
                relates to.
              </FeatureRow>
              <FeatureRow
                icon={FolderKanban}
                eyebrow="Projects"
                title="Keep work and its context together"
                points={["Status: active, on hold, completed, archived", "See every linked note and decision", "Deleting a project keeps its notes"]}
              >
                Group the knowledge and decisions behind each piece of work, so you can pick it up again months later.
              </FeatureRow>
              <FeatureRow
                icon={Scale}
                eyebrow="Decision Journal"
                title="Remember why, not just what"
                points={["Context, problem, alternatives and the selected option", "Expected vs actual outcome reviews", "Proposed, accepted, superseded or reviewed"]}
              >
                Record the reasoning behind technical and business choices, then come back to compare what you expected with what happened.
              </FeatureRow>
              <FeatureRow
                icon={Search}
                eyebrow="Global search"
                title="Find it in seconds"
                points={["Full-text search with partial-word matching", "Filter by notes, projects or decisions", "Highlighted matches with previews"]}
              >
                Search the words in everything you&apos;ve written. Press <kbd className="kbd kbd-sm">/</kbd> anywhere in the workspace to start.
              </FeatureRow>
              <FeatureRow
                icon={Bot}
                eyebrow="AI assistant"
                title="Ask your own knowledge, check the sources"
                points={["Answers only from your notes and decisions", "Every answer links to the records it used", "Says so plainly when your notes don't cover it"]}
              >
                Optional and source-grounded. Your records are only sent to an AI provider when the service has one configured and you ask a
                question.
              </FeatureRow>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6 sm:py-24">
          <p className="eyebrow">How it works</p>
          <h2 className="text-headline mt-2 max-w-2xl">Knowledge that stays connected</h2>
          <Reveal className="mt-10">
            <ol className="grid gap-4 md:grid-cols-3">
              {[
                { icon: FileText, title: "Capture", text: "Write a note when you learn something, or record a decision as you make it." },
                { icon: Link2, title: "Connect", text: "Link notes to projects and to each other; decisions sit alongside the work they shaped." },
                { icon: Search, title: "Return", text: "Search, browse a project's connections, or ask the assistant, with sources to verify." },
              ].map((step, i) => (
                <li key={step.title} className="surface h-full p-6">
                  <span className="text-meta font-medium">Step {i + 1}</span>
                  <step.icon className="text-primary mt-3 size-5" aria-hidden />
                  <h3 className="text-section mt-3">{step.title}</h3>
                  <p className="text-muted mt-1 text-sm">{step.text}</p>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal className="mt-8">
            <ConnectionMap
              center={{ kind: "Note", title: "Token bucket rate limiting", icon: BookOpen }}
              groups={[
                { label: "Project", icon: FolderKanban, items: [{ id: "p", title: "Public API launch", meta: "Active" }] },
                { label: "Decision", icon: Scale, items: [{ id: "d", title: "Rate-limit the public API per key", meta: "Reviewed" }] },
                { label: "Related reference", icon: Link2, items: [{ id: "r", title: "Nginx rate limit config" }, { id: "r2", title: "RFC 6585: 429 Too Many Requests" }] },
              ]}
              caption="Illustration with sample data. In your workspace, each note shows its real connections."
            />
          </Reveal>
        </section>

        {/* Decision demonstration */}
        <section className="border-base-300 bg-sidebar border-y py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <p className="eyebrow">Decision Journal</p>
              <h2 className="text-headline mt-2">Decisions that keep their reasons</h2>
              <p className="text-muted mt-4 max-w-md">
                Months later, &quot;why did we do it this way?&quot; is the hardest question to answer. A decision record keeps the context,
                the options you weighed, what you chose and why, and how it actually turned out.
              </p>
            </Reveal>
            <Reveal>
              <SampleDecision />
            </Reveal>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6 sm:py-24">
          <p className="eyebrow">Privacy &amp; security</p>
          <h2 className="text-headline mt-2 max-w-2xl">Private by design</h2>
          <p className="text-muted mt-3 max-w-2xl">What the application actually does to protect your account and your notes:</p>
          <Reveal className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: KeyRound, title: "Hashed passwords", text: "Passwords are hashed with Argon2 and never stored or logged in plain text." },
              { icon: Lock, title: "Secure sessions", text: "HttpOnly session cookies with CSRF protection. Signing out revokes the session on the server." },
              { icon: UserCheck, title: "Your data only", text: "Every request is checked against your account; other users can't read, search or guess their way to your records." },
              { icon: ServerCog, title: "AI is opt-in", text: "Notes reach an AI provider only if one is configured, only when you ask, and only your most relevant matches." },
              { icon: ShieldCheck, title: "Abuse protection", text: "Sign-in and other sensitive actions are rate-limited to slow down password guessing." },
              { icon: BookOpen, title: "You stay in control", text: "Edit or delete anything, or delete your whole account and all its data yourself." },
            ].map((item) => (
              <div key={item.title} className="surface p-6">
                <item.icon className="text-primary size-5" aria-hidden />
                <h3 className="text-section mt-3">{item.title}</h3>
                <p className="text-muted mt-1 text-sm">{item.text}</p>
              </div>
            ))}
          </Reveal>
          <p className="text-meta mt-6">
            Read the <Link href="/privacy" className="link">Privacy Policy</Link> for the details.
          </p>
        </section>

        {/* Final CTA */}
        <section className="border-base-300 bg-sidebar border-t">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-24">
            <h2 className="text-headline mx-auto max-w-2xl">Build a knowledge base you can return to.</h2>
            <p className="text-muted mx-auto mt-3 max-w-xl">Free to start. Create an account and save your first note in under a minute.</p>
            <Link href={primaryCta.href} className="btn btn-primary nudge-icon mt-8">
              {primaryCta.label} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
