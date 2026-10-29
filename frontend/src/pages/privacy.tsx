import Head from "next/head";
import Link from "next/link";

import { LegalLayout } from "@/components/layout/PublicLayout";
import { OPERATOR } from "@/lib/legal";

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy · EchoVault Nexus</title>
      </Head>
      <LegalLayout
        title="Privacy Policy"
        summary={
          <p>
            In short: we collect what is needed to run your account and store the content you choose to save. We don&apos;t sell your
            data, show ads or use analytics trackers. Your notes are only sent to an AI provider if the service has one configured and you
            ask the assistant a question.
          </p>
        }
      >
        <h2 id="who">1. Who is responsible</h2>
        <p>
          EchoVault Nexus is operated by {OPERATOR.name}, {OPERATOR.address} (&quot;we&quot;, &quot;us&quot;). For privacy questions or
          requests, contact {OPERATOR.privacyEmail}.
        </p>

        <h2 id="collect">2. What we collect</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Details</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account details</td>
              <td>Your name, email address and a one-way Argon2 hash of your password (we never store the password itself).</td>
              <td>To create your account and sign you in.</td>
            </tr>
            <tr>
              <td>Your content</td>
              <td>Notes, tags, projects, decisions, related-note links and their timestamps.</td>
              <td>To provide the service you asked for.</td>
            </tr>
            <tr>
              <td>Session records</td>
              <td>Session identifiers, a hashed refresh token, your browser&apos;s user-agent string and session start/expiry times.</td>
              <td>To keep you signed in securely and let you sign out of every device.</td>
            </tr>
            <tr>
              <td>Legal acceptance</td>
              <td>The version of the Terms you accepted and when.</td>
              <td>To show which terms apply to your account.</td>
            </tr>
            <tr>
              <td>Password reset</td>
              <td>A hashed, single-use reset token with an expiry time (only if you request a reset).</td>
              <td>To let you regain access to your account.</td>
            </tr>
            <tr>
              <td>Technical logs</td>
              <td>Server logs may record IP addresses, request paths and errors. They don&apos;t contain passwords, tokens or note content.</td>
              <td>To keep the service secure and fix problems.</td>
            </tr>
          </tbody>
        </table>
        <p>
          We don&apos;t use advertising, analytics or tracking cookies. See the <Link href="/cookies">Cookie Policy</Link> for the small
          number of strictly necessary cookies and browser settings we use.
        </p>

        <h2 id="basis">3. Legal bases</h2>
        <p>
          Where data-protection law requires a legal basis, we process account details and content to perform our contract with you;
          session records, security logs and rate limiting for our legitimate interest in protecting the service; and legal-acceptance
          records to meet our legal obligations. [Confirm the applicable bases for each jurisdiction.]
        </p>

        <h2 id="ai">4. The AI assistant and your data</h2>
        <p>The assistant is optional and only works if the operator has configured an AI provider. When you ask it a question:</p>
        <ul>
          <li>We search <strong>only your own</strong> notes and decisions for matching records. Archived notes are excluded.</li>
          <li>
            Your question and the most relevant matches (by default up to 6, each trimmed to a few thousand characters) are sent to the
            configured provider to generate the answer. Nothing else from your account is sent.
          </li>
          <li>If nothing in your vault matches, no request is sent to the provider at all.</li>
          <li>
            The configured provider is [AI provider name, e.g. Anthropic or a self-hosted model]. Its handling of submitted data is governed by
            [link to provider&apos;s data terms]. If a self-hosted model is used, your data does not leave the operator&apos;s systems.
          </li>
          <li>Questions and answers are not stored by EchoVault after they are shown to you.</li>
        </ul>

        <h2 id="sharing">5. When data is shared</h2>
        <ul>
          <li>With the AI provider, only as described above.</li>
          <li>With an email provider, only to send password-reset emails you request: [email provider name].</li>
          <li>With our hosting and database providers, who store data on our behalf: [hosting providers and regions].</li>
          <li>If required by law or to protect the rights and safety of users.</li>
        </ul>
        <p>We don&apos;t sell personal data or share it for advertising.</p>

        <h2 id="storage">6. Storage, security and retention</h2>
        <p>
          Data is stored in a PostgreSQL database hosted in [hosting region]. Passwords are hashed with Argon2; sessions use HttpOnly
          cookies with CSRF protection and can be revoked; every request is checked so that one account can never read another
          account&apos;s records. In production the service must be served over HTTPS.
        </p>
        <p>
          We keep your data until you delete it or delete your account. Deleting your account removes your account and all its content
          from the live database immediately. Backups are kept for [backup retention period] and then deleted. Expired sessions and reset
          tokens are kept for [retention period] for security purposes.
        </p>

        <h2 id="rights">7. Your rights and choices</h2>
        <ul>
          <li>
            <strong>Access and correction:</strong> view and edit your content, name and email address at any time in the app.
          </li>
          <li>
            <strong>Deletion:</strong> delete individual records, or your whole account from <Link href="/settings">Settings</Link>.
          </li>
          <li>
            <strong>Export:</strong> download a copy of everything stored for your account as a JSON file from{" "}
            <Link href="/settings">Settings → Your data</Link>.
          </li>
          <li>
            Depending on where you live, you may also have rights to object, restrict processing, and complain to a data-protection
            authority: [relevant authority].
          </li>
        </ul>

        <h2 id="children">8. Children</h2>
        <p>The service is not intended for children under [minimum age].</p>

        <h2 id="changes">9. Changes</h2>
        <p>
          If we change this policy materially, we will update the date above and, where required, ask you to review it again. The version
          of the Terms you accepted is recorded with your account.
        </p>
      </LegalLayout>
    </>
  );
}
