import Head from "next/head";

import { LegalLayout } from "@/components/layout/PublicLayout";

const COOKIES = [
  { name: "ev_access", purpose: "Proves you are signed in (short-lived). Not readable by page scripts (HttpOnly).", duration: "15 minutes" },
  { name: "ev_refresh", purpose: "Renews your session without signing in again; only sent to the sign-in service. HttpOnly.", duration: "14 days" },
  { name: "ev_csrf", purpose: "Protects your account from cross-site request forgery.", duration: "14 days" },
];

const STORAGE = [
  { name: "ev-theme", purpose: "Remembers your chosen theme (light, dark or system).", duration: "Until you clear it" },
  { name: "ev-sidebar-collapsed", purpose: "Remembers whether you collapsed the sidebar.", duration: "Until you clear it" },
];

function Table({ rows }: { rows: { name: string; purpose: string; duration: string }[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Purpose</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td>
              <code>{r.name}</code>
            </td>
            <td>{r.purpose}</td>
            <td>{r.duration}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CookiesPage() {
  return (
    <>
      <Head>
        <title>Cookie Policy · EchoVault Nexus</title>
      </Head>
      <LegalLayout
        title="Cookie Policy"
        summary={
          <p>
            EchoVault Nexus uses only strictly necessary cookies to keep you signed in securely, plus two preference settings stored in your
            browser. There are no advertising, analytics or third-party tracking cookies, so we don&apos;t show a cookie consent banner.
          </p>
        }
      >
        <h2 id="cookies">Strictly necessary cookies</h2>
        <p>These are set only when you sign in or create an account, and are removed when you sign out.</p>
        <Table rows={COOKIES} />

        <h2 id="storage">Preferences stored in your browser</h2>
        <p>These use your browser&apos;s local storage, never leave your device, and contain no personal data.</p>
        <Table rows={STORAGE} />

        <h2 id="control">Your choices</h2>
        <p>
          You can block or delete cookies in your browser settings, but the sign-in cookies are required to use your account. If we ever add
          non-essential cookies, we will ask for your consent first and update this page.
        </p>
      </LegalLayout>
    </>
  );
}
