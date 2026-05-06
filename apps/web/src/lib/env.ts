/**
 * Environment validation.
 * Call validateEnv() at app startup to catch misconfig early.
 */

export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  hasApiKey: boolean;
  isDevBypass: boolean;
  appUrl: string;
}

export function validateEnv(): EnvConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const devBypass = process.env.DEV_AUTH_BYPASS === "true";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const isProduction = process.env.NODE_ENV === "production";

  // Always required
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  // Production-only checks
  if (isProduction) {
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is required in production. AI features will not work without it.",
      );
    }
    if (devBypass) {
      throw new Error(
        "DEV_AUTH_BYPASS must not be 'true' in production. Remove it or set to 'false'.",
      );
    }
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    hasApiKey: !!apiKey,
    isDevBypass: devBypass,
    appUrl,
  };
}
