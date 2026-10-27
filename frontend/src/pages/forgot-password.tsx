import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck, MailX } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthLayout } from "@/components/layout/PublicLayout";
import { Field } from "@/components/ui/Field";
import { FullPageSpinner, InlineError } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/api/client";
import { authApi } from "@/lib/api/services";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/schemas";

export default function ForgotPasswordPage() {
  const config = useAsync(() => authApi.config(), []);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      const result = await authApi.requestPasswordReset(email);
      setSentMessage(result.detail);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  const backToSignIn = (
    <Link href="/login" className="link link-primary">
      Back to sign in
    </Link>
  );

  let body;
  if (config.loading) {
    body = <FullPageSpinner />;
  } else if (config.error) {
    body = <InlineError message={config.error.message} />;
  } else if (!config.data?.password_reset_available) {
    body = (
      <div className="flex flex-col items-center gap-3 text-center">
        <MailX className="text-muted size-8" aria-hidden />
        <p className="text-sm">
          Password reset by email isn&apos;t available on this server yet: no email service has been configured.
        </p>
        <p className="text-meta">
          Administrators: set the <code>SMTP_*</code> settings in <code>backend/.env</code> to enable it.
        </p>
      </div>
    );
  } else if (sentMessage) {
    body = (
      <div className="flex flex-col items-center gap-3 text-center" role="status">
        <MailCheck className="text-success size-8" aria-hidden />
        <p className="text-sm">{sentMessage}</p>
        <p className="text-meta">The link expires after a short time and works once.</p>
      </div>
    );
  } else {
    body = (
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <InlineError message={formError} />
        <Field label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="email" className="input w-full" {...register("email")} />
        </Field>
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <span className="loading loading-spinner loading-xs" aria-hidden />}
          Send reset link
        </button>
      </form>
    );
  }

  return (
    <>
      <Head>
        <title>Reset password · EchoVault Nexus</title>
      </Head>
      <AuthLayout title="Reset your password" subtitle="We'll email you a link to choose a new password." footer={backToSignIn}>
        {body}
      </AuthLayout>
    </>
  );
}
