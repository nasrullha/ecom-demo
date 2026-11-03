// Central place for settings that come from ".env.local" (or Vercel's
// Environment Variables). NEXT_PUBLIC_* values are visible in the browser, which
// is fine for these: they contain no secrets.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

// This store sells in Maldivian Rufiyaa. (Set NEXT_PUBLIC_STORE_CURRENCY only to override.)
export const CURRENCY = process.env.NEXT_PUBLIC_STORE_CURRENCY || "MVR";

// Used when showing dates, e.g. "Indian/Maldives", "Europe/London"
export const TIMEZONE = process.env.NEXT_PUBLIC_STORE_TIMEZONE || "Indian/Maldives";

export function assertSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase is not configured yet. Copy .env.example to .env.local, fill in " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart the dev server."
    );
  }
}
