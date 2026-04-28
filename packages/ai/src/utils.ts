/**
 * Shared utilities for the AI package.
 */

/**
 * Safely parse JSON from AI responses.
 * Handles common issues: markdown fences, trailing commas, truncated output.
 * Throws a descriptive error instead of a cryptic JSON.parse failure.
 */
export function safeParseJSON<T>(raw: string, context: string): T {
  // Strip markdown code fences
  let cleaned = raw.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch (_firstError) {
    // Attempt fixes for common AI JSON issues
  }

  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  // Try again after cleanup
  try {
    return JSON.parse(cleaned) as T;
  } catch (_secondError) {
    // Try to extract JSON from surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        // Fall through to error
      }
    }
  }

  throw new Error(
    `Failed to parse AI response as JSON during ${context}. ` +
    `Raw output (first 500 chars): ${raw.slice(0, 500)}`
  );
}

/**
 * Generate a unique ID safe for serverless environments.
 */
export function generateId(prefix: string = "node"): string {
  // crypto.randomUUID is available in Node.js 19+ and all modern runtimes
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  // Fallback for older environments
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
