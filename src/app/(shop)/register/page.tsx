import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/auth-forms";
import { getUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const target = safeNextPath(next, "/account");
  if (await getUser()) redirect(target);

  return (
    <AuthCard
      title="Create your account"
      subtitle="You need an account to place orders and upload payment slips."
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(target)}`} className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm next={target} />
    </AuthCard>
  );
}
