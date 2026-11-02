import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * The signed-in user, verified with Supabase's auth server on every request
 * (never trust the cookie alone). Cached so it is only checked once per request.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,email,full_name,phone,role")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

/** For pages: send visitors who are not signed in to the login page. */
export async function requireUser(nextPath: string) {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** For admin pages: customers get a plain "not found" page. */
export async function requireAdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin");
  if (profile.role !== "admin") notFound();
  return profile;
}

export type AdminContext =
  | { ok: true; supabase: ServerSupabase; userId: string }
  | { ok: false; error: string };

/**
 * For admin Server Actions. Every admin action calls this first: hiding the
 * admin menu is not security, this check is. (The database repeats the check.)
 */
export async function requireAdminAction(): Promise<AdminContext> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return { ok: false, error: "You do not have permission to do that." };
  }
  const supabase = await createClient();
  return { ok: true, supabase, userId: profile.id };
}
