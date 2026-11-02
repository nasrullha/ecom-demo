import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/auth-forms";
import { getUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const target = safeNextPath(next, "/account");
  if (await getUser()) redirect(target);

  return (
    <AuthCard
      title="Sign in"
      subtitle="Sign in to check out and follow your orders."
      footer={
        <>
          New here?{" "}
          <Link href={`/register?next=${encodeURIComponent(target)}`} className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm
        next={target}
        notice={error === "link" ? "That link has expired or was already used. Please sign in or request a new one." : undefined}
      />
    </AuthCard>
  );
}
