import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import {
  classifyFeedback,
  toUserFeedback,
  interpretFeedback,
} from "@jobloop/ai";
import type { TaskType } from "@jobloop/ai";

/**
 * POST /api/feedback
 *
 * Accepts natural language feedback from the user at any step.
 * Classifies intent, determines system adjustment, and stores the signal.
 *
 * Body:
 *   message: string           — the user's natural language input
 *   task_type: TaskType        — what they're giving feedback on
 *   application_id?: string    — which application (if applicable)
 *   domain?: string            — domain context
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { message, task_type, application_id, domain } = body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (!task_type) {
    return NextResponse.json({ error: "task_type is required" }, { status: 400 });
  }

  // Classify the natural language message
  const classified = await classifyFeedback(
    message,
    task_type as TaskType,
    application_id,
  );

  // Convert to system feedback signal
  const feedback = toUserFeedback(classified, task_type as TaskType, {
    domain,
    applicationId: application_id,
    message,
  });

  // Determine system adjustment
  const adjustment = interpretFeedback(feedback);

  // Store feedback for learning (append to user's feedback history)
  await supabase.from("user_feedback").insert({
    user_id: user.id,
    application_id: application_id || null,
    task_type,
    message,
    classified_intent: classified.intent,
    classified_signal: classified.signal,
    specifics: classified.specifics,
    new_information: classified.new_information,
    system_adjustment: adjustment,
    confidence: classified.confidence,
  });

  // Build response based on adjustment
  const response: Record<string, unknown> = {
    intent: classified.intent,
    adjustment,
    confidence: classified.confidence,
  };

  // If user provided new info, include it so the UI can trigger Socratic flow
  if (classified.new_information) {
    response.new_information = classified.new_information;
    response.action = "trigger_socratic";
  }

  // If escalation needed, tell the UI to re-run with better model
  if (adjustment === "escalate") {
    response.action = "regenerate_with_quality";
  }

  // If cloud gap detected, suggest Socratic questions
  if (adjustment === "cloud_gap") {
    response.action = "trigger_socratic";
    response.gap_skills = classified.specifics;
  }

  return NextResponse.json(response);
}
