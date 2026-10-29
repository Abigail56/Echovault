import { LifeBuoy, Mail, ShieldCheck, UserX } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import type { ReactNode } from "react";

import { PublicFooter, PublicNav } from "@/components/layout/PublicLayout";
import { EmailLink } from "@/components/ui/EmailLink";
import { isPlaceholder, OPERATOR } from "@/lib/legal";

interface Option {
  icon: typeof Mail;
  title: string;
  body: ReactNode;
  /** When set (and configured), the card shows an email button. */
  email?: { address: string; subject: string; label: string };
}

const OPTIONS: Option[] = [
  {
    icon: Mail,
    title: "General questions",
    body: (
      <>
        Email <EmailLink address={OPERATOR.contactEmail} subject="Question about EchoVault Nexus" />.
      </>
    ),
    email: { address: OPERATOR.contactEmail, subject: "Question about EchoVault Nexus", label: "Email us" },
  },
  {
    icon: ShieldCheck,
    title: "Privacy requests",
    body: (
      <>
        Email <EmailLink address={OPERATOR.privacyEmail} subject="Privacy request" /> for access or data-protection requests.
      </>
    ),
    email: { address: OPERATOR.privacyEmail, subject: "Privacy request", label: "Send a privacy request" },
  },
  {
    icon: UserX,
    title: "Your data",
    body: (
      <>
        Download or delete everything yourself in{" "}
        <Link className="link link-primary" href="/settings">
          Settings
        </Link>
        .
      </>
    ),
  },
  {
    icon: LifeBuoy,
    title: "Security issues",
    body: (
      <>
        Report vulnerabilities to <EmailLink address={OPERATOR.contactEmail} subject="Security report" />. See{" "}
        <Link className="link link-primary" href="/acceptable-use#disclosure">
          responsible disclosure
        </Link>
        .
      </>
    ),
    email: { address: OPERATOR.contactEmail, subject: "Security report", label: "Report an issue" },
  },
];

export default function ContactPage() {
  const anyPlaceholder = [OPERATOR.name, OPERATOR.contactEmail, OPERATOR.privacyEmail].some(isPlaceholder);
  return (
    <>
      <Head>
        <title>Contact · EchoVault Nexus</title>
      </Head>
      <PublicNav />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="eyebrow mb-2">Contact</p>
        <h1 className="text-headline">Get in touch</h1>
        <p className="text-muted mt-3 max-w-2xl">
          EchoVault Nexus is operated by {OPERATOR.name}, {OPERATOR.address}.
        </p>
        {anyPlaceholder && <p className="text-meta mt-2">Details in [square brackets] are placeholders the operator still needs to set.</p>}
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {OPTIONS.map((o) => (
            <li key={o.title} className="surface flex flex-col p-5">
              <o.icon className="text-primary mb-3 size-5" aria-hidden />
              <h2 className="text-section">{o.title}</h2>
              <p className="text-muted mt-1 flex-1 text-sm">{o.body}</p>
              {o.email && !isPlaceholder(o.email.address) && (
                <a
                  href={`mailto:${o.email.address}?subject=${encodeURIComponent(o.email.subject)}`}
                  className="btn btn-sm btn-outline border-base-300 mt-4 w-full"
                >
                  <Mail className="size-4" aria-hidden /> {o.email.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </main>
      <PublicFooter />
    </>
  );
}
