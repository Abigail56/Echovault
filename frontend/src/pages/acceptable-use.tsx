import Head from "next/head";

import { LegalLayout } from "@/components/layout/PublicLayout";
import { OPERATOR } from "@/lib/legal";

export default function AcceptableUsePage() {
  return (
    <>
      <Head>
        <title>Acceptable Use Policy · EchoVault Nexus</title>
      </Head>
      <LegalLayout
        title="Acceptable Use Policy"
        summary={<p>EchoVault Nexus is for organising your own knowledge. Use it lawfully and don&apos;t harm the service or other people.</p>}
      >
        <h2 id="dont">You must not</h2>
        <ul>
          <li>Store or share content that is unlawful, infringes others&apos; intellectual property, or that you have no right to keep.</li>
          <li>Try to access, read, change or delete another user&apos;s account or data, including by guessing IDs or tampering with requests.</li>
          <li>Try to make the AI assistant reveal other users&apos; data, credentials, system instructions or internal information.</li>
          <li>Probe, scan or test the security of the service without written permission (see responsible disclosure below).</li>
          <li>Overload the service, get around rate limits, or use automated means to create accounts or scrape data.</li>
          <li>Upload or link malware, or use the service to send spam or phishing.</li>
          <li>Use the service to harass, threaten or harm others.</li>
          <li>Share your account with others or sell access to it.</li>
        </ul>

        <h2 id="enforcement">Enforcement</h2>
        <p>
          If we reasonably believe this policy has been breached, we may remove content, limit features, or suspend or close the account,
          as described in the Terms and Conditions.
        </p>

        <h2 id="disclosure">Responsible disclosure</h2>
        <p>
          If you find a security vulnerability, please report it to {OPERATOR.contactEmail} with enough detail to reproduce it, and give us
          reasonable time to fix it before disclosing it publicly. Do not access or modify other users&apos; data while investigating.
        </p>
      </LegalLayout>
    </>
  );
}
