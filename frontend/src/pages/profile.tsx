import { zodResolver } from "@hookform/resolvers/zod";
import Head from "next/head";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { appLayout } from "@/components/layout/AppShell";
import { Field } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { InlineError } from "@/components/ui/States";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { authApi } from "@/lib/api/services";
import { formatDate } from "@/lib/format";
import { applyServerErrors } from "@/lib/forms";
import type { PageWithLayout } from "@/lib/layout";
import { changePasswordSchema, type ChangePasswordValues, PASSWORD_MIN, profileSchema, type ProfileValues } from "@/lib/schemas";

function ProfileForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { full_name: user?.full_name ?? "" } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await authApi.updateProfile(values);
      setUser(updated);
      reset({ full_name: updated.full_name });
      toast.success("Profile updated");
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["full_name"]));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="surface flex flex-col gap-4 p-5 sm:p-6">
      <h2 className="text-section">Personal details</h2>
      <InlineError message={formError} />
      <Field label="Full name" error={errors.full_name?.message}>
        <input className="input w-full" autoComplete="name" {...register("full_name")} />
      </Field>
      <Field label="Email" hint="Email changes aren't supported yet.">
        <input className="input w-full" value={user?.email ?? ""} readOnly disabled />
      </Field>
      {user && <p className="text-meta">Member since {formatDate(user.created_at)}</p>}
      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <span className="loading loading-spinner loading-xs" aria-hidden />} Save
        </button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async ({ current_password, new_password }) => {
    setFormError(null);
    try {
      await authApi.changePassword({ current_password, new_password });
      reset({ current_password: "", new_password: "", confirm: "" });
      toast.success("Password changed. Other devices were signed out.");
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["current_password", "new_password"]));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="surface flex flex-col gap-4 p-5 sm:p-6">
      <div>
        <h2 className="text-section">Change password</h2>
        <p className="text-meta">Changing your password signs you out on every other device.</p>
      </div>
      <InlineError message={formError} />
      <Field label="Current password" error={errors.current_password?.message}>
        <input type="password" className="input w-full" autoComplete="current-password" {...register("current_password")} />
      </Field>
      <Field label="New password" error={errors.new_password?.message} hint={`At least ${PASSWORD_MIN} characters.`}>
        <input type="password" className="input w-full" autoComplete="new-password" {...register("new_password")} />
      </Field>
      <Field label="Confirm new password" error={errors.confirm?.message}>
        <input type="password" className="input w-full" autoComplete="new-password" {...register("confirm")} />
      </Field>
      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
          {isSubmitting && <span className="loading loading-spinner loading-xs" aria-hidden />} Change password
        </button>
      </div>
    </form>
  );
}

const ProfilePage: PageWithLayout = () => (
  <>
    <Head>
      <title>Profile · EchoVault Nexus</title>
    </Head>
    <PageHeader title="Profile" description="Your account details and password." />
    <div className="grid max-w-2xl gap-6">
      <ProfileForm />
      <PasswordForm />
    </div>
  </>
);

ProfilePage.getLayout = appLayout;
export default ProfilePage;
