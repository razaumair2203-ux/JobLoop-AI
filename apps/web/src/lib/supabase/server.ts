import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cookie-based auth client — used ONLY for getAuthUser() to read the session cookie.
 * Do NOT use for data queries if RLS is enabled — use createDataClient() instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    },
  );
}

/**
 * Server-side data client using the service role key.
 * Bypasses RLS — use only in API routes AFTER verifying auth via getAuthUser().
 * All DB reads/writes/deletes should use this client.
 */
export { createAdminClient as createDataClient } from "./admin";
