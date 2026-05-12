import type { SupabaseClient, User } from "@supabase/supabase-js";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

const DEV_USER: User = {
  id: DEV_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "dev@jobloop.local",
  email_confirmed_at: new Date().toISOString(),
  phone: "",
  confirmed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "Dev User" },
  identities: [],
  factors: [],
};

/**
 * Get the authenticated user from Supabase.
 * In dev bypass mode (DEV_AUTH_BYPASS=true + no API key), returns a mock user.
 */
export async function getAuthUser(
  supabase: SupabaseClient,
): Promise<{ user: User | null; isDevBypass: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return { user, isDevBypass: false };
  }

  // Dev bypass: only when explicitly enabled AND no API key (pure dev mode)
  if (
    process.env.DEV_AUTH_BYPASS === "true" &&
    !process.env.DEEPSEEK_API_KEY
  ) {
    return { user: DEV_USER, isDevBypass: true };
  }

  return { user: null, isDevBypass: false };
}
