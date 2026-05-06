export async function register() {
  const { validateEnv } = await import("@/lib/env");
  const config = validateEnv();

  if (config.isDevBypass) {
    console.warn("[JobLoop] DEV_AUTH_BYPASS is enabled — auth checks bypassed");
  }
  if (!config.hasApiKey) {
    console.warn("[JobLoop] No ANTHROPIC_API_KEY — running in dev mode (file-based AI)");
  }
}
