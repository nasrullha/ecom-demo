import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL, assertSupabaseEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/** Supabase client for the browser. Only ever uses the public (publishable) key. */
export function createClient() {
  if (browserClient) return browserClient;
  assertSupabaseEnv();
  browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return browserClient;
}
