/**
 * LLM Client — DeepSeek V4 Flash via OpenAI-compatible API.
 *
 * Returns an object with `.messages.create()` so all call sites work uniformly.
 * Under the hood, calls DeepSeek's OpenAI-compatible API via native fetch.
 * Zero external dependencies.
 *
 * Requires: DEEPSEEK_API_KEY in environment.
 */

/** Rate limiter: respect API rate limits */
let lastCallMs = 0;
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const gap = now - lastCallMs;
  if (gap < 200) {
    await new Promise(r => setTimeout(r, 200 - gap));
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
  json_mode?: boolean;
}

interface LLMClient {
  messages: {
    create(params: CreateParams): Promise<LLMMessage>;
  };
}

// ============================================================
// DeepSeek Client (OpenAI-compatible, native fetch)
// ============================================================

function createDeepSeekClient(apiKey: string): LLMClient {
  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";

  return {
    messages: {
      async create(params: CreateParams): Promise<LLMMessage> {
        await rateLimit();

        const model = resolveModel(params.model);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60_000); // 60s timeout

        let res: Response;
        try {
          res = await fetch(`${baseURL}/chat/completions`, {
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
              ...(params.json_mode ? { response_format: { type: "json_object" } } : {}),
            }),
            signal: controller.signal,
          });
        } catch (err: unknown) {
          clearTimeout(timeout);
          if (err instanceof Error && err.name === "AbortError") {
            throw new Error(`DeepSeek API timeout after 60s for model ${model}`);
          }
          throw err;
        }
        clearTimeout(timeout);

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`DeepSeek API ${res.status}: ${errText.slice(0, 300)}`);
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
 * Resolve model ID. Maps tier aliases to DeepSeek model IDs.
 * Fast tier: DeepSeek V4 Flash (cheap, fast parsing/classification).
 * Quality tier: DeepSeek V4 Flash (same model — single model strategy).
 * Override via DEEPSEEK_MODEL / DEEPSEEK_MODEL_QUALITY env vars.
 */
function resolveModel(model: string): string {
  if (model.includes("/")) return model; // Already a full model ID

  const fastModel = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const qualityModel = process.env.DEEPSEEK_MODEL_QUALITY || "deepseek-chat";

  if (model === MODELS.quality) return qualityModel;
  return fastModel;
}

// ============================================================
// Singleton + Export
// ============================================================

let clientInstance: LLMClient | null = null;

export function getClient(): LLMClient {
  if (clientInstance) return clientInstance;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No LLM provider configured. Set DEEPSEEK_API_KEY in .env.local"
    );
  }

  clientInstance = createDeepSeekClient(apiKey);
  return clientInstance;
}

/**
 * Model tiers — used by call sites to indicate intent (fast vs quality).
 * Both resolve to DeepSeek V4 Flash unless overridden via env vars.
 */
export const MODELS = {
  fast: "deepseek-fast" as const,
  quality: "deepseek-quality" as const,
} as const;
