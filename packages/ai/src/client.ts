/**
 * LLM Client — NVIDIA NIM (DeepSeek V4 Pro via OpenAI-compatible API).
 *
 * Returns an object with `.messages.create()` so all call sites work uniformly.
 * Under the hood, calls NIM's OpenAI-compatible API via native fetch.
 * Zero external dependencies.
 *
 * Requires: NVIDIA_NIM_API_KEY in environment.
 * Rate limit: 40 RPM (free tier).
 */

/** Rate limiter: 40 RPM max on NIM free tier */
let lastCallMs = 0;
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const gap = now - lastCallMs;
  if (gap < 1500) {
    await new Promise(r => setTimeout(r, 1500 - gap));
  }
  lastCallMs = Date.now();
}

// ============================================================
// Response type (used by all call sites)
// ============================================================

interface LLMMessage {
  content: Array<{ type: "text"; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

interface CreateParams {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: string; content: string }>;
}

interface LLMClient {
  messages: {
    create(params: CreateParams): Promise<LLMMessage>;
  };
}

// ============================================================
// NIM Client (OpenAI-compatible, native fetch)
// ============================================================

function createNIMClient(apiKey: string): LLMClient {
  const baseURL = process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";

  return {
    messages: {
      async create(params: CreateParams): Promise<LLMMessage> {
        await rateLimit();

        const model = resolveModel(params.model);

        const res = await fetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: params.system },
              ...params.messages,
            ],
            max_tokens: params.max_tokens,
            temperature: 0.7,
            stream: false,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`NIM API ${res.status}: ${errText.slice(0, 300)}`);
        }

        const data = await res.json() as {
          choices: Array<{ message: { content: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };

        const text = data.choices?.[0]?.message?.content ?? "";

        return {
          content: [{ type: "text" as const, text }],
          usage: {
            input_tokens: data.usage?.prompt_tokens ?? 0,
            output_tokens: data.usage?.completion_tokens ?? 0,
          },
        };
      },
    },
  };
}

/**
 * Resolve model ID. If already a NIM model (contains "/"), pass through.
 * Otherwise map tier aliases to NIM model IDs.
 */
function resolveModel(model: string): string {
  if (model.includes("/")) return model; // Already a NIM model ID

  const nimModel = process.env.NVIDIA_NIM_MODEL || "meta/llama-3.3-70b-instruct";

  // Quality tier: larger model for CV gen, cover letters, insights.
  // Falls back to fast tier if not set or unavailable.
  const qualityModel = process.env.NVIDIA_NIM_MODEL_QUALITY || "nvidia/nemotron-3-super-120b-a12b";

  if (model === MODELS.quality) return qualityModel;
  return nimModel;
}

// ============================================================
// Singleton + Export
// ============================================================

let clientInstance: LLMClient | null = null;

export function getClient(): LLMClient {
  if (clientInstance) return clientInstance;

  const nimKey = process.env.NVIDIA_NIM_API_KEY;
  if (!nimKey) {
    throw new Error(
      "No LLM provider configured. Set NVIDIA_NIM_API_KEY in .env.local (free tier: https://build.nvidia.com)"
    );
  }

  clientInstance = createNIMClient(nimKey);
  return clientInstance;
}

/**
 * Model tiers — used by call sites to indicate intent (fast vs quality).
 * Both resolve to DeepSeek V4 Pro on NIM free tier unless overridden.
 */
export const MODELS = {
  fast: "nim-fast" as const,
  quality: "nim-quality" as const,
} as const;
