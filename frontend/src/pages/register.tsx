import { zodResolver } from "@hookform/resolvers/zod";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthLayout } from "@/components/layout/PublicLayout";
import { Field } from "@/components/ui/Field";
import { InlineError } from "@/components/ui/States";
import { useAuth } from "@/hooks/useAuth";
import { applyServerErrors } from "@/lib/forms";
import { TERMS_VERSION } from "@/lib/legal";
import { PASSWORD_MIN, registerSchema, type RegisterValues } from "@/lib/schemas";

export default function RegisterPage() {
  const { register: createAccount, status } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const termsId = useId();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    // The Terms box must start unticked: acceptance has to be an active choice.
    defaultValues: { accept_terms: false },
  });

  useEffect(() => {
    if (status === "authenticated") void router.replace("/dashboard");
  }, [status, router]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createAccount(values.full_name, values.email, values.password, TERMS_VERSION);
      await router.replace("/dashboard");
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["full_name", "email", "password", "accept_terms"]));
    }
  });

  return (
    <>
      <Head>
        <title>Create your vault · EchoVault Nexus</title>
      </Head>
      <AuthLayout
        title="Create your vault"
        subtitle="Free to use. Your notes are private to your account."
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

          <div className="flex flex-col gap-1.5">
            <div className="flex items-start gap-3">
              <input
                id={termsId}
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary mt-0.5"
                aria-invalid={errors.accept_terms ? true : undefined}
                aria-describedby={errors.accept_terms ? `${termsId}-error` : undefined}
                {...register("accept_terms")}
              />
              <label htmlFor={termsId} className="text-sm leading-snug">
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="link link-primary">
                  Terms and Conditions
                </Link>{" "}
                and the{" "}
                <Link href="/acceptable-use" target="_blank" className="link link-primary">
                  Acceptable Use Policy
                </Link>
                .
              </label>
            </div>
            {errors.accept_terms && (
              <p id={`${termsId}-error`} className="text-error text-xs">
                {errors.accept_terms.message}
              </p>
            )}
          </div>
          <p className="text-meta">
            We process your account details and the content you save as described in our{" "}
            <Link href="/privacy" target="_blank" className="link link-primary">
              Privacy Policy
            </Link>
            . We don&apos;t send marketing email.
          </p>

          <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting && <span className="loading loading-spinner loading-xs" aria-hidden />}
            Create your vault
          </button>
        </form>
      </AuthLayout>
    </>
  );
}
