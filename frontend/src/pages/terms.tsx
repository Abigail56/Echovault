import Head from "next/head";
import Link from "next/link";

import { LegalLayout } from "@/components/layout/PublicLayout";
import { EmailLink } from "@/components/ui/EmailLink";
import { OPERATOR, TERMS_VERSION } from "@/lib/legal";

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms and Conditions · EchoVault Nexus</title>
      </Head>
      <LegalLayout
        title="Terms and Conditions"
        summary={
          <p>
            Version {TERMS_VERSION}. These terms govern your use of EchoVault Nexus. By creating an account you agree to them and to the{" "}
            <Link href="/acceptable-use" className="link link-primary">
              Acceptable Use Policy
            </Link>
            . How we handle personal data is explained in the{" "}
            <Link href="/privacy" className="link link-primary">
              Privacy Policy
            </Link>
            .
          </p>
        }
      >
        <h2 id="service">1. The service</h2>
        <p>
          EchoVault Nexus (&quot;the service&quot;) is a personal knowledge workspace operated by {OPERATOR.name} (&quot;we&quot;). It lets
          you store notes, projects and decisions, search them, and optionally ask an AI assistant questions about them.
        </p>

        <h2 id="accounts">2. Your account</h2>
        <ul>
          <li>You must provide accurate information and be at least [minimum age] years old.</li>
          <li>Keep your password secret. You are responsible for activity under your account.</li>
          <li>Tell us promptly at <EmailLink address={OPERATOR.contactEmail} subject="Account security" /> if you believe your account has been compromised.</li>
          <li>One account is for one person.</li>
        </ul>

        <h2 id="use">3. Acceptable use</h2>
        <p>
          You must follow the <Link href="/acceptable-use">Acceptable Use Policy</Link>. In particular, you must not try to access other
          users&apos; data, interfere with the service, or store unlawful content.
        </p>

        <h2 id="content">4. Your content</h2>
        <p>
          You keep ownership of everything you save. You grant us a limited licence to store, process and display your content only as
          needed to provide the service to you, including sending it to the AI provider when you use the assistant (see section 6). You
          are responsible for having the rights to the content you save.
        </p>

        <h2 id="third-party">5. Third-party services</h2>
        <p>
          The service may rely on third parties such as an AI provider, an email provider and hosting providers, as listed in the Privacy
          Policy. Their availability is outside our control, and features that depend on them (such as the assistant or password-reset
          email) may be unavailable.
        </p>

        <h2 id="ai">6. AI processing</h2>
        <ul>
          <li>The assistant is optional and available only when an AI provider is configured.</li>
          <li>When you ask a question, your question and your most relevant notes and decisions are sent to that provider.</li>
          <li>
            AI-generated answers can be incomplete or wrong. Answers link to the records they used; check them before relying on an
            answer. The assistant is not professional (legal, medical, financial or similar) advice.
          </li>
        </ul>

        <h2 id="availability">7. Availability and changes</h2>
        <p>
          We aim to keep the service available but don&apos;t guarantee uninterrupted access. We may change or discontinue features. We
          recommend keeping your own copies of important information.
        </p>

        <h2 id="termination">8. Ending your account</h2>
        <p>
          You can delete your account at any time from <Link href="/settings">Settings</Link>; this permanently deletes your content. We
          may suspend or close accounts that seriously or repeatedly breach these terms or the Acceptable Use Policy, or where required by
          law. Where reasonable, we will give notice first.
        </p>

        <h2 id="liability">9. Liability</h2>
        <p>
          To the extent permitted by applicable law, the service is provided &quot;as is&quot;, and we are not liable for indirect or
          consequential losses, or for loss of data you have not kept elsewhere. Our total liability is limited to [liability cap]. Nothing
          in these terms limits liability that cannot be limited by law, or your statutory rights as a consumer.
        </p>

        <h2 id="changes">10. Changes to these terms</h2>
        <p>
          We may update these terms. Each version has a version number; the version you accepted is recorded with your account. For
          material changes we will notify you and, where required, ask you to accept the new version.
        </p>

        <h2 id="law">11. Governing law and disputes</h2>
        <p>
          These terms are governed by the laws of {OPERATOR.jurisdiction}. Before starting formal proceedings, please contact us at{" "}
          <EmailLink address={OPERATOR.contactEmail} /> so we can try to resolve the issue. Disputes will be handled by the courts of [court jurisdiction],
          without affecting any mandatory consumer rights to bring claims where you live.
        </p>

        <h2 id="contact">12. Contact</h2>
        <p>
          See the <Link href="/contact">Contact page</Link>.
        </p>
      </LegalLayout>
    </>
  );
}
