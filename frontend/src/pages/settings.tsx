import { Bot, CheckCircle2, LogOut, Monitor, Moon, Palette, ShieldCheck, Sun, XCircle } from "lucide-react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";

import { appLayout } from "@/components/layout/AppShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { type ThemePreference, useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/lib/api/client";
import { assistantApi, authApi } from "@/lib/api/services";
import type { PageWithLayout } from "@/lib/layout";

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
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
  const { forgetSession } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const assistant = useAsync(() => assistantApi.status(), []);
  const authConfig = useAsync(() => authApi.config(), []);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

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
      </div>
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
