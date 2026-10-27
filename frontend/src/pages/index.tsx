import {
  ArrowRight,
  BookOpen,
  Bot,
  FileText,
  FolderKanban,
  KeyRound,
  Lock,
  Scale,
  Search,
  ServerCog,
  Tags,
  UserCheck,
} from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import type { ReactNode } from "react";

import { PublicFooter, PublicNav } from "@/components/layout/PublicLayout";

/** A static illustration of the workspace, built from the app's own styles. */
function ProductPreview() {
  return (
    <figure className="surface overflow-hidden shadow-xl shadow-black/5" aria-label="Illustration of the EchoVault workspace">
      <div className="border-base-300 bg-base-200 flex items-center gap-1.5 border-b px-4 py-2.5" aria-hidden>
        <span className="bg-base-300 size-2.5 rounded-full" />
        <span className="bg-base-300 size-2.5 rounded-full" />
        <span className="bg-base-300 size-2.5 rounded-full" />
        <span className="bg-base-100 text-meta ml-3 rounded px-3 py-0.5">echovault / vault</span>
      </div>
      <div className="grid sm:grid-cols-[10rem_1fr]" aria-hidden>
        <div className="border-base-300 hidden space-y-1 border-r p-3 text-xs sm:block">
          {[
            [BookOpen, "Vault", true],
            [FolderKanban, "Projects", false],
            [Scale, "Decisions", false],
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
        <div className="space-y-2.5 p-4">
          <div className="input input-sm pointer-events-none w-full">
            <Search className="text-muted size-3.5" /> <span className="text-muted text-xs">postgres index</span>
          </div>
          {[
            { t: "PostgreSQL full-text search", e: "GIN indexes make to_tsvector queries fast…", tags: ["postgres", "search"] },
            { t: "Why we chose FastAPI", e: "Typed request validation and automatic docs…", tags: ["backend"] },
            { t: "Index maintenance checklist", e: "Run REINDEX after bulk imports…", tags: ["postgres"] },
          ].map((row) => (
            <div key={row.t} className="border-base-300 rounded-field border p-3">
              <p className="text-sm font-medium">{row.t}</p>
              <p className="text-muted text-xs">{row.e}</p>
              <div className="mt-1.5 flex gap-1">
                {row.tags.map((tag) => (
                  <span key={tag} className="badge badge-ghost badge-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="sr-only">Example notes in the Knowledge Vault, filtered by a search.</figcaption>
    </figure>
  );
}

function Feature({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: ReactNode }) {
  return (
    <div className="surface p-6">
      <span className="bg-primary/10 text-primary mb-4 grid size-10 place-items-center rounded-field">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="text-section">{title}</h3>
      <p className="text-muted mt-1.5 text-sm">{children}</p>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Head>
        <title>EchoVault Nexus · Your knowledge, connected</title>
      </Head>
      <PublicNav />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div>
            <p className="text-primary mb-4 text-sm font-medium">Personal knowledge &amp; project intelligence</p>
            <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
              Your knowledge. Connected. Searchable. Ready to use.
            </h1>
            <p className="text-muted mt-5 max-w-xl text-lg">
              Capture your ideas, organise your projects, preserve important decisions, and rediscover what you know with a personal
              knowledge workspace built for clarity.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary">
                Create your free workspace <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/login" className="btn btn-ghost">
                Sign in
              </Link>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section id="features" className="bg-base-100 border-base-300 border-y py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Everything you know, in one place</h2>
            <p className="text-muted mt-2 max-w-2xl">Four tools that work together, so information stays findable long after you save it.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Feature icon={BookOpen} title="Knowledge Vault">
                Save notes, lessons and references in Markdown. Tag them and link them to projects.
              </Feature>
              <Feature icon={FolderKanban} title="Projects">
                Group related knowledge and decisions, and track each project&apos;s status.
              </Feature>
              <Feature icon={Scale} title="Decision Journal">
                Record the context, reasoning and alternatives behind a choice, then review the outcome later.
              </Feature>
              <Feature icon={Search} title="Global search">
                Full-text keyword search across everything you&apos;ve written, with partial-word matching.
              </Feature>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Decisions that keep their reasons</h2>
            <p className="text-muted mt-3">
              Months later, &quot;why did we do it this way?&quot; is the hardest question to answer. The Decision Journal keeps the
              problem, the options you weighed and the outcome you expected, linked to the project it belongs to.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Context, decision, reasoning and alternatives", "Expected vs actual outcome reviews", "Linked to projects and searchable"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Tags className="text-primary size-4" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">An assistant that shows its sources</h2>
            <p className="text-muted mt-3">
              Ask a question in plain language. The optional AI assistant answers only from notes in your own vault and links every
              source it used, so you can check the answer yourself. If your notes don&apos;t cover the question, it tells you.
            </p>
            <div className="surface mt-6 p-4 text-sm">
              <p className="font-medium">Which index type should I use for full-text search?</p>
              <p className="text-muted mt-2">Your notes recommend a GIN index on the tsvector expression [1].</p>
              <p className="text-meta mt-3 flex items-center gap-1.5">
                <FileText className="size-3.5" aria-hidden /> [1] PostgreSQL full-text search
              </p>
            </div>
            <p className="text-meta mt-2">Illustrative example. The assistant needs an AI provider to be configured.</p>
          </div>
        </section>

        <section id="privacy" className="bg-base-100 border-base-300 border-y py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Private by design</h2>
            <p className="text-muted mt-2 max-w-2xl">What the application actually does to protect your account and notes:</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Feature icon={KeyRound} title="Hashed passwords">
                Passwords are hashed with Argon2 and are never stored or logged in plain text.
              </Feature>
              <Feature icon={Lock} title="Secure sessions">
                Sessions live in HttpOnly cookies with CSRF protection, and signing out revokes them on the server.
              </Feature>
              <Feature icon={UserCheck} title="Your data only">
                Every request is checked against your account. Other users can&apos;t read, search or guess their way to your records.
              </Feature>
              <Feature icon={ServerCog} title="AI is opt-in">
                Notes are only sent to an AI provider if the server has one configured, and only when you ask a question.
              </Feature>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Start building your knowledge base</h2>
          <p className="text-muted mx-auto mt-3 max-w-xl">It takes less than a minute to create an account and save your first note.</p>
          <Link href="/register" className="btn btn-primary mt-8">
            Get started <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
