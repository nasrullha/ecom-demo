"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
  updateProfileAction,
} from "@/actions/auth";
import type { FormState } from "@/lib/types";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const initial: FormState = {};

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <Alert>{state.error}</Alert>;
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4">
      {notice ? <Alert tone="info">{notice}</Alert> : null}
      <Feedback state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" maxLength={254} />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" required autoComplete="current-password" maxLength={72} />
      </Field>
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="text-brand hover:underline">
          Forgot your password?
        </Link>
      </div>
      <SubmitButton size="lg" className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(registerAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="Full name" htmlFor="fullName">
        <Input id="fullName" name="fullName" required autoComplete="name" maxLength={100} />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" maxLength={254} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" maxLength={254} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
      </Field>
      <Field label="Repeat new password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [state, action] = useActionState(updateProfileAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <Field label="Email" htmlFor="profile-email">
        <Input id="profile-email" value={email} readOnly disabled />
      </Field>
      <Field label="Full name" htmlFor="profile-name">
        <Input id="profile-name" name="fullName" defaultValue={fullName} required maxLength={100} autoComplete="name" />
      </Field>
      <Field label="Phone" htmlFor="profile-phone">
        <Input id="profile-phone" name="phone" type="tel" defaultValue={phone} maxLength={30} autoComplete="tel" />
      </Field>
      <SubmitButton pendingText="Saving…">Save details</SubmitButton>
    </form>
  );
}
