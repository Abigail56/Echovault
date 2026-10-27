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
import { applyServerErrors } from "@/lib/forms";
import { PASSWORD_MIN, registerSchema, type RegisterValues } from "@/lib/schemas";

export default function RegisterPage() {
  const { register: createAccount, status } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  useEffect(() => {
    if (status === "authenticated") void router.replace("/dashboard");
  }, [status, router]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createAccount(values.full_name, values.email, values.password);
      await router.replace("/dashboard");
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["full_name", "email", "password"]));
    }
  });

  return (
    <>
      <Head>
        <title>Create account · EchoVault Nexus</title>
      </Head>
      <AuthLayout
        title="Create your workspace"
        subtitle="Free to use. Your notes stay private to your account."
        footer={
          <>
            Already have an account?{" "}
            <Link href="/login" className="link link-primary">
              Sign in
            </Link>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <InlineError message={formError} />
          <Field label="Full name" error={errors.full_name?.message}>
            <input autoComplete="name" className="input w-full" {...register("full_name")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input type="email" autoComplete="email" className="input w-full" {...register("email")} />
          </Field>
          <Field label="Password" error={errors.password?.message} hint={`At least ${PASSWORD_MIN} characters. A short phrase works well.`}>
            <input type="password" autoComplete="new-password" className="input w-full" {...register("password")} />
          </Field>
          <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting && <span className="loading loading-spinner loading-xs" aria-hidden />}
            Create account
          </button>
        </form>
      </AuthLayout>
    </>
  );
}
