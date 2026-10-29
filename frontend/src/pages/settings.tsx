import { Bot, CheckCircle2, Download, FileText, LogOut, Monitor, Moon, Palette, ShieldCheck, Sun, TriangleAlert, XCircle } from "lucide-react";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";

import { appLayout } from "@/components/layout/AppShell";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { type ThemePreference, useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/lib/api/client";
import { assistantApi, authApi } from "@/lib/api/services";
import { downloadJson } from "@/lib/download";
import { formatDate } from "@/lib/format";
import type { PageWithLayout } from "@/lib/layout";

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

function Section({ icon: Icon, title, description, children }: { icon: typeof Sun; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <Icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <h2 className="text-section">{title}</h2>
          <p className="text-meta">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Configured({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1.5 text-sm ${ok ? "text-success" : "text-muted"}`}>
      {ok ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
      {label}
    </span>
  );
}

const SettingsPage: PageWithLayout = () => {
  const { preference, setPreference } = useTheme();
  const { forgetSession, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const assistant = useAsync(() => assistantApi.status(), []);
  const authConfig = useAsync(() => authApi.config(), []);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await authApi.exportData();
      downloadJson(data, `echovault-export-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success("Your data export has been downloaded");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const signOutEverywhere = async () => {
    setBusy(true);
    try {
      await authApi.logoutEverywhere();
      forgetSession();
      await router.push("/login");
    } catch (error) {
      toast.error(errorMessage(error));
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <Head>
        <title>Settings · EchoVault Nexus</title>
      </Head>
      <PageHeader title="Settings" description="Appearance, integrations and security." />
      <div className="grid max-w-2xl gap-6">
        <Section icon={Palette} title="Appearance" description="Saved in this browser.">
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={preference === value}
                onClick={() => setPreference(value)}
                className={`btn h-auto flex-col gap-1 py-3 font-normal ${preference === value ? "btn-primary btn-soft border-primary" : "btn-ghost border-base-300"}`}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section icon={Bot} title="Integrations" description="Configured by the server administrator in backend/.env.">
          <dl className="grid gap-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt>AI assistant</dt>
              <dd>
                {assistant.loading ? (
                  <span className="skeleton inline-block h-4 w-24" />
                ) : assistant.data?.configured ? (
                  <Configured ok label={`${assistant.data.provider} · ${assistant.data.model}`} />
                ) : (
                  <Configured ok={false} label="Not configured" />
                )}
              </dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt>Password reset email</dt>
              <dd>
                {authConfig.loading ? (
                  <span className="skeleton inline-block h-4 w-24" />
                ) : (
                  <Configured ok={Boolean(authConfig.data?.password_reset_available)} label={authConfig.data?.password_reset_available ? "Configured" : "Not configured"} />
                )}
              </dd>
            </div>
          </dl>
        </Section>

        <Section icon={ShieldCheck} title="Security" description="Sessions last up to 14 days of inactivity on each device.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">Lost a device or used a shared computer? Sign out everywhere, including here.</p>
            <button type="button" className="btn btn-sm btn-outline btn-error shrink-0" onClick={() => setConfirming(true)}>
              <LogOut className="size-4" aria-hidden /> Sign out everywhere
            </button>
          </div>
        </Section>
        <Section icon={Download} title="Your data" description="A copy of everything stored for your account.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              Download your account details, notes (including archived), tags, related-note links, projects and decisions as a JSON file.
            </p>
            <button type="button" className="btn btn-sm btn-outline border-base-300 shrink-0" onClick={exportData} disabled={exporting}>
              {exporting ? <span className="loading loading-spinner loading-xs" aria-hidden /> : <Download className="size-4" aria-hidden />}
              Download my data
            </button>
          </div>
        </Section>

        <Section icon={FileText} title="Legal" description="The documents that apply to your account.">
          <p className="text-sm">
            {user?.terms_accepted_at ? (
              <>
                You accepted the Terms and Conditions (version {user.terms_version}) on {formatDate(user.terms_accepted_at)}.
              </>
            ) : (
              <>This account was created before Terms acceptance was recorded.</>
            )}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <li><Link className="link link-primary" href="/terms">Terms and Conditions</Link></li>
            <li><Link className="link link-primary" href="/privacy">Privacy Policy</Link></li>
            <li><Link className="link link-primary" href="/acceptable-use">Acceptable Use</Link></li>
            <li><Link className="link link-primary" href="/cookies">Cookies</Link></li>
          </ul>
        </Section>

        <section className="border-error/40 rounded-box border p-5 sm:p-6" aria-labelledby="danger-zone">
          <div className="mb-4 flex items-start gap-3">
            <TriangleAlert className="text-error mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <h2 id="danger-zone" className="text-section">
                Delete account
              </h2>
              <p className="text-meta">
                Permanently deletes your account and everything in it: notes, projects, decisions, tags and sessions. This cannot be undone.
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-error btn-outline" onClick={() => setDeleteOpen(true)}>
            Delete my account
          </button>
        </section>
      </div>
      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      <ConfirmDialog
        open={confirming}
        title="Sign out of all devices?"
        description="Every active session, including this one, will end immediately. You'll need to sign in again."
        confirmLabel="Sign out everywhere"
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={signOutEverywhere}
      />
    </>
  );
};

SettingsPage.getLayout = appLayout;
export default SettingsPage;
