import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Ensures a row exists in public.users for the authenticated user.
 * Supabase Auth creates auth.users automatically, but public.users
 * (which all other tables reference) needs an explicit insert.
 *
 * Safe to call multiple times — uses upsert with onConflict.
 */
export async function ensureUserExists(
  supabase: SupabaseClient,
  user: User
): Promise<void> {
  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      full_name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        "User",
      avatar_url: user.user_metadata?.avatar_url ?? null,
      auth_provider: user.app_metadata?.provider ?? "email",
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Failed to ensure user exists:", error);
  }
}
