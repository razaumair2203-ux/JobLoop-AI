import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not set — cannot create Anthropic client");
    }
    client = new Anthropic();
  }
  return client;
}

// Model tiers per spec §17.3
export const MODELS = {
  fast: "claude-haiku-4-5-20251001" as const,
  quality: "claude-sonnet-4-6-20250514" as const,
} as const;
