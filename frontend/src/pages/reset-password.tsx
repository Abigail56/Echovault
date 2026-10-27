import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthLayout } from "@/components/layout/PublicLayout";
import { Field } from "@/components/ui/Field";
import { InlineError } from "@/components/ui/States";
import { applyServerErrors } from "@/lib/forms";
import { authApi } from "@/lib/api/services";
import { queryParam } from "@/lib/format";
import { newPasswordSchema, PASSWORD_MIN, type NewPasswordValues } from "@/lib/schemas";

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = queryParam(router.query.token);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await authApi.confirmPasswordReset(token, values.new_password);
      setDone(true);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["new_password"]));
    }
  });

  let body;
  if (!router.isReady) {
    body = null;
  } else if (!token) {
    body = <InlineError message="This reset link is incomplete. Request a new one from the sign-in page." />;
  } else if (done) {
    body = (
      <div className="flex flex-col items-center gap-3 text-center" role="status">
        <CheckCircle2 className="text-success size-8" aria-hidden />
        <p className="text-sm">Your password has been changed and all devices were signed out.</p>
        <Link href="/login" className="btn btn-primary w-full">
          Sign in
        </Link>
      </div>
    );
  } else {
    body = (
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <InlineError message={formError} />
        <Field label="New password" error={errors.new_password?.message} hint={`At least ${PASSWORD_MIN} characters.`}>
          <input type="password" autoComplete="new-password" className="input w-full" {...register("new_password")} />
        </Field>
        <Field label="Confirm new password" error={errors.confirm?.message}>
          <input type="password" autoComplete="new-password" className="input w-full" {...register("confirm")} />
        </Field>
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <span className="loading loading-spinner loading-xs" aria-hidden />}
          Set new password
        </button>
      </form>
    );
  }

  return (
    <>
      <Head>
        <title>Choose a new password · EchoVault Nexus</title>
      </Head>
      <AuthLayout title="Choose a new password" subtitle="Reset links work once and expire quickly.">
        {body}
      </AuthLayout>
    </>
  );
}
