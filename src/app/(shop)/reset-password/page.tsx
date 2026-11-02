import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { Alert } from "@/components/ui";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage() {
  // The reset email link signs the visitor in first (see /auth/callback).
  const user = await getUser();

  return (
    <AuthCard title="Choose a new password">
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="space-y-4">
          <Alert>This reset link has expired or was already used.</Alert>
          <Link href="/forgot-password" className="text-sm font-medium text-brand hover:underline">
            Request a new link
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
