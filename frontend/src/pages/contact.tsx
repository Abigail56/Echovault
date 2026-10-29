import { LifeBuoy, Mail, ShieldCheck, UserX } from "lucide-react";
import Head from "next/head";
import Link from "next/link";

import { PublicFooter, PublicNav } from "@/components/layout/PublicLayout";
import { OPERATOR } from "@/lib/legal";

const OPTIONS = [
  { icon: Mail, title: "General questions", body: <>Email {OPERATOR.contactEmail}.</> },
  { icon: ShieldCheck, title: "Privacy requests", body: <>Email {OPERATOR.privacyEmail} for access or data-protection requests.</> },
  {
    icon: UserX,
    title: "Delete your data",
    body: (
      <>
        You can do this yourself: <Link className="link link-primary" href="/settings">Settings → Delete account</Link>.
      </>
    ),
  },
  {
    icon: LifeBuoy,
    title: "Security issues",
    body: (
      <>
        Report vulnerabilities to {OPERATOR.contactEmail}. See <Link className="link link-primary" href="/acceptable-use#disclosure">responsible disclosure</Link>.
      </>
    ),
  },
];

export default function ContactPage() {
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
        <p className="text-meta mt-2">Details in [square brackets] are placeholders to be completed by the operator before launch.</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {OPTIONS.map((o) => (
            <li key={o.title} className="surface p-5">
              <o.icon className="text-primary mb-3 size-5" aria-hidden />
              <h2 className="text-section">{o.title}</h2>
              <p className="text-muted mt-1 text-sm">{o.body}</p>
            </li>
          ))}
        </ul>
      </main>
      <PublicFooter />
    </>
  );
}
