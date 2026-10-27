import { zodResolver } from "@hookform/resolvers/zod";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthLayout } from "@/components/layout/PublicLayout";
import { Field } from "@/components/ui/Field";
import { InlineError } from "@/components/ui/States";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/api/client";
import { safeNextPath } from "@/lib/forms";
import { loginSchema, type LoginValues } from "@/lib/schemas";

export default function LoginPage() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const next = safeNextPath(router.query.next);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (status === "authenticated") void router.replace(next);
  }, [status, next, router]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      await router.replace(next);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <>
      <Head>
        <title>Sign in · EchoVault Nexus</title>
      </Head>
      <AuthLayout
        title="Welcome back"
        subtitle="Sign in to your knowledge workspace."
        footer={
          <>
            New to EchoVault?{" "}
            <Link href="/register" className="link link-primary">
              Create an account
            </Link>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <InlineError message={formError} />
          <Field label="Email" error={errors.email?.message}>
            <input type="email" autoComplete="email" className="input w-full" {...register("email")} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <input type="password" autoComplete="current-password" className="input w-full" {...register("password")} />
          </Field>
          <div className="-mt-1 text-right">
            <Link href="/forgot-password" className="link link-hover text-muted text-xs">
              Forgot your password?
            </Link>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting && <span className="loading loading-spinner loading-xs" aria-hidden />}
            Sign in
          </button>
        </form>
      </AuthLayout>
    </>
  );
}
