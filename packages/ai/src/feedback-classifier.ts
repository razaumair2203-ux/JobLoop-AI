/**
 * Natural Language Feedback Classifier
 *
 * Users can communicate dissatisfaction, requests, or praise in natural language
 * at any step. This classifier interprets their message into actionable signals
 * that the system uses to adjust model selection, trigger Socratic questions,
 * or flag issues.
 *
 * In dev mode: rule-based classification (no API call).
 * In API mode: fast tier classifies ambiguous messages, rules handle clear ones.
 */

import { getClient, MODELS } from "./client";
import { getProviderMode, getDevResponse } from "./provider";
import { safeParseJSON } from "./utils";
import type { FeedbackSignal, UserFeedback, TaskType } from "./cloud-maturity";

// ============================================================
// INTENT CLASSIFICATION
// ============================================================

export type FeedbackIntent =
  | "dissatisfied_quality"   // "this CV is bad", "not accurate", "wrong"
  | "dissatisfied_relevance" // "this doesn't match", "missing my experience in X"
  | "request_change"         // "make it more formal", "add my project X"
  | "request_regenerate"     // "try again", "redo this", "generate another version"
  | "provide_info"           // "I also worked at X", "I have a cert in Y"
  | "positive"               // "looks good", "perfect", "thanks"
  | "question"               // "why did you include X?", "what does this mean?"
  | "unclear";               // can't determine intent

export interface ClassifiedFeedback {
  intent: FeedbackIntent;
  /** The feedback signal to route into the maturity system */
  signal: FeedbackSignal;
  /** Extracted specifics (skill names, company names, etc.) */
  specifics: string[];
  /** Confidence: "high" if rule-matched, "medium" if AI-classified */
  confidence: "high" | "medium";
  /** If the user is providing new info, this is the raw content */
  new_information: string | null;
}

// ============================================================
// RULE-BASED CLASSIFICATION (fast, no API)
// ============================================================

interface PatternRule {
  patterns: RegExp[];
  intent: FeedbackIntent;
  signal: FeedbackSignal;
}

const RULES: PatternRule[] = [
  // Regeneration requests
  {
    patterns: [
      /\b(?:try again|redo|regenerate|another version|start over|do it again)\b/i,
      /\b(?:re-?generate|re-?do|re-?write|re-?create)\b/i,
    ],
    intent: "request_regenerate",
    signal: "regenerate",
  },
  // Quality dissatisfaction
  {
    patterns: [
      /\b(?:terrible|awful|horrible|useless|garbage|wrong|inaccurate|bad|poor quality)\b/i,
      /\b(?:doesn't? make sense|not accurate|full of errors?|completely wrong)\b/i,
      /\b(?:not good|not great|disappointed|frustrat)/i,
    ],
    intent: "dissatisfied_quality",
    signal: "thumbs_down",
  },
  // Relevance dissatisfaction
  {
    patterns: [
      /\b(?:missing|left out|didn't include|forgot|where is|doesn't? mention)\b/i,
      /\b(?:not relevant|doesn't? match|wrong (?:skills?|experience)|irrelevant)\b/i,
      /\b(?:I (?:also|actually) (?:have|did|worked|know))\b/i,
    ],
    intent: "dissatisfied_relevance",
    signal: "natural_language",
  },
  // Change requests
  {
    patterns: [
      /\b(?:make it|change|adjust|modify|update|can you|please (?:add|remove|change))\b/i,
      /\b(?:more formal|less formal|shorter|longer|more technical|simpler)\b/i,
      /\b(?:add|include|remove|drop|emphasize|de-?emphasize)\b/i,
    ],
    intent: "request_change",
    signal: "natural_language",
  },
  // User providing new information
  {
    patterns: [
      /\b(?:I (?:also|actually|previously|used to|have a|got|earned|completed))\b/i,
      /\b(?:forgot to mention|should also know|by the way|additionally)\b/i,
      /\b(?:my (?:experience|cert|project|role|work) (?:in|at|with|on))\b/i,
    ],
    intent: "provide_info",
    signal: "natural_language",
  },
  // Positive feedback
  {
    patterns: [
      /\b(?:looks? good|perfect|great|excellent|nice|awesome|love it|well done)\b/i,
      /\b(?:thank|thanks|exactly what|nailed it|spot on|impressed)\b/i,
    ],
    intent: "positive",
    signal: "thumbs_up",
  },
  // Questions
  {
    patterns: [
      /\b(?:why did you|what does|how come|can you explain|what is)\b/i,
      /\?$/,
    ],
    intent: "question",
    signal: "natural_language",
  },
];

function classifyWithRules(message: string): ClassifiedFeedback | null {
  const trimmed = message.trim();
  if (!trimmed) return null;

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(trimmed)) {
        return {
          intent: rule.intent,
          signal: rule.signal,
          specifics: extractSpecifics(trimmed),
          confidence: "high",
          new_information: rule.intent === "provide_info" ? trimmed : null,
        };
      }
    }
  }

  return null; // No rule matched — needs AI classification
}

/** Extract skill/company/cert names from the message */
function extractSpecifics(message: string): string[] {
  const specifics: string[] = [];

  // Quoted terms: "React", "Project Management"
  const quoted = message.match(/["']([^"']+)["']/g);
  if (quoted) {
    for (const q of quoted) specifics.push(q.replace(/["']/g, ""));
  }

  // "in/at/with [Capitalized Name]"
  const namedEntities = message.match(/(?:in|at|with|for)\s+([A-Z][a-zA-Z\s&]+?)(?:\s*[,.]|\s+(?:and|but|where|from|during))/g);
  if (namedEntities) {
    for (const ne of namedEntities) {
      const name = ne.replace(/^(?:in|at|with|for)\s+/i, "").replace(/\s*[,.]$/, "").replace(/\s+(?:and|but|where|from|during)$/, "").trim();
      if (name.length > 2) specifics.push(name);
    }
  }

  return specifics;
}

// ============================================================
// AI-ASSISTED CLASSIFICATION (for ambiguous messages)
// ============================================================

const CLASSIFIER_PROMPT = `You classify user feedback about a generated CV, analysis, or cover letter.

Return JSON:
{
  "intent": "dissatisfied_quality" | "dissatisfied_relevance" | "request_change" | "request_regenerate" | "provide_info" | "positive" | "question" | "unclear",
  "specifics": ["skill names", "company names", "cert names mentioned"],
  "new_information": "if the user is providing new info about their experience, extract it here, otherwise null"
}

Intent guide:
- dissatisfied_quality: output is wrong, bad, inaccurate
- dissatisfied_relevance: output is missing their real experience or skills
- request_change: they want specific modifications (tone, length, emphasis)
- request_regenerate: they want a completely new version
- provide_info: they're telling you something new about their background
- positive: they like it
- question: they're asking why/how something was done
- unclear: can't determine

Return ONLY JSON.`;

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Classify a natural language feedback message.
 * Rules first (fast, free). AI fallback for ambiguous messages.
 */
export async function classifyFeedback(
  message: string,
  taskType: TaskType,
  applicationId?: string,
): Promise<ClassifiedFeedback> {
  // Try rules first
  const ruleResult = classifyWithRules(message);
  if (ruleResult) return ruleResult;

  // Short messages that didn't match rules → unclear
  if (message.trim().length < 10) {
    return {
      intent: "unclear",
      signal: "natural_language",
      specifics: [],
      confidence: "medium",
      new_information: null,
    };
  }

  // DEV MODE — return unclear (no API)
  if (getProviderMode() === "dev") {
    const cached = getDevResponse<{ intent: FeedbackIntent; specifics: string[]; new_information: string | null }>(
      "feedback-classify", message
    );
    if (cached) {
      return {
        intent: cached.intent,
        signal: intentToSignal(cached.intent),
        specifics: cached.specifics,
        confidence: "medium",
        new_information: cached.new_information,
      };
    }
    return {
      intent: "unclear",
      signal: "natural_language",
      specifics: extractSpecifics(message),
      confidence: "medium",
      new_information: null,
    };
  }

  // API MODE — fast tier classifies (cheap, fast)
  const client = getClient();
  const response = await client.messages.create({
    model: MODELS.fast,
    max_tokens: 256,
    system: CLASSIFIER_PROMPT,
    messages: [{ role: "user", content: `User message: "${message}"\n\nTask type: ${taskType}\nApplication ID: ${applicationId ?? "none"}\n\nClassify this feedback. Return ONLY JSON.` }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = safeParseJSON<{
    intent: FeedbackIntent;
    specifics: string[];
    new_information: string | null;
  }>(text, "feedback classification");

  return {
    intent: parsed.intent,
    signal: intentToSignal(parsed.intent),
    specifics: parsed.specifics,
    confidence: "medium",
    new_information: parsed.new_information,
  };
}

/**
 * Convert a classified feedback into a UserFeedback object
 * ready for interpretFeedback() in cloud-maturity.ts.
 */
export function toUserFeedback(
  classified: ClassifiedFeedback,
  taskType: TaskType,
  options?: { domain?: string; applicationId?: string; message?: string },
): UserFeedback {
  return {
    signal: classified.signal,
    context: {
      task_type: taskType,
      domain: options?.domain,
      application_id: options?.applicationId,
      message: options?.message,
    },
    timestamp: new Date().toISOString(),
  };
}

function intentToSignal(intent: FeedbackIntent): FeedbackSignal {
  switch (intent) {
    case "dissatisfied_quality": return "thumbs_down";
    case "dissatisfied_relevance": return "natural_language";
    case "request_change": return "natural_language";
    case "request_regenerate": return "regenerate";
    case "provide_info": return "natural_language";
    case "positive": return "thumbs_up";
    case "question": return "natural_language";
    case "unclear": return "natural_language";
  }
}
