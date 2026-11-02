"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { safeNextPath } from "@/lib/utils";
import type { FormState } from "@/lib/types";
import {
  emailSchema,
  firstError,
  loginSchema,
  passwordSchema,
  profileSchema,
  registerSchema,
} from "@/lib/validators";

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  return origin && /^https?:\/\//.test(origin) ? origin : SITE_URL;
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: text(formData, "email"),
    password: text(formData, "password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // one generic message so attackers cannot discover which emails exist
    return {
      error:
        error.message.toLowerCase().includes("confirm")
          ? "Please confirm your email first. Check your inbox for the link."
          : "Incorrect email or password.",
    };
  }

  redirect(safeNextPath(text(formData, "next"), "/account"));
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    fullName: text(formData, "fullName"),
    email: text(formData, "email"),
    password: text(formData, "password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const next = safeNextPath(text(formData, "next"), "/account");
  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    if (/already|registered/i.test(error.message)) {
      return { error: "An account with this email already exists. Try signing in." };
    }
    console.error("Sign-up failed:", error.message);
    return { error: "We could not create your account. Please try again." };
  }

  // Email confirmation is on: no session yet, the user must click the email link.
  if (!data.session) {
    return { message: "Almost done! We sent a confirmation link to your email. Open it to activate your account." };
  }
  redirect(next);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(text(formData, "email"));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const origin = await siteOrigin();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  // Same answer whether or not the email exists.
  return { message: "If an account exists for that email, we sent a link to reset the password." };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "This reset link has expired. Request a new one." };

  const parsed = passwordSchema.safeParse(text(formData, "password"));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (text(formData, "confirm") !== parsed.data) return { error: "The two passwords do not match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    console.error("Password update failed:", error.message);
    return { error: "We could not update your password. Request a new link and try again." };
  }
  redirect("/account");
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Please sign in again." };

  const parsed = profileSchema.safeParse({
    fullName: text(formData, "fullName"),
    phone: text(formData, "phone"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null })
    .eq("id", user.id);
  if (error) {
    console.error("Profile update failed:", error.message);
    return { error: "We could not save your details. Please try again." };
  }
  revalidatePath("/account");
  return { message: "Saved." };
}
