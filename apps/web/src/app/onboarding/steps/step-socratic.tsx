"use client";

import { useState } from "react";
import {
  MessageCircle,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import type { SocraticQuestion } from "./step-upload";

interface AnswerResult {
  node_updated: string;
  is_new_skill: boolean;
  evidence_count: number;
  summary?: string;
}

interface StepSocraticProps {
  questions: SocraticQuestion[];
  onNext: () => void;
  onSkip: () => void;
}

export function StepSocratic({ questions, onNext, onSkip }: StepSocraticProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Record<string, AnswerResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // No questions available — skip gracefully
  if (questions.length === 0) {
    return (
      <div className="text-center">
        <MessageCircle className="mx-auto h-12 w-12 text-zinc-300" />
        <h2 className="mt-4 text-xl font-semibold text-zinc-900">
          No questions right now
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Your Profile Cloud is already well-evidenced. We&apos;ll ask follow-up
          questions when you analyze a job description.
        </p>
        <button
          onClick={onNext}
          className="mt-6 h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700"
        >
          Continue
        </button>
      </div>
    );
  }

  const q = questions[current];
  const isLast = current === questions.length - 1;
  const hasAnswer = (answers[q.id] ?? "").trim().length >= 5;
  const wasSubmitted = !!results[q.id];
  const hasError = !!errors[q.id];

  async function submitAnswer() {
    const answer = (answers[q.id] ?? "").trim();
    if (answer.length < 5) return;

    setSubmitting(true);
    setErrors((prev) => ({ ...prev, [q.id]: "" }));

    try {
      const res = await fetch("/api/socratic/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: q.id,
          skill_name: q.skill_name,
          answer,
          question_text: q.question,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit answer");
      }

      const data = await res.json();
      setResults((prev) => ({
        ...prev,
        [q.id]: {
          node_updated: data.node_updated,
          is_new_skill: data.is_new_skill,
          evidence_count: data.evidence_count,
          summary: data.summary,
        },
      }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [q.id]: err instanceof Error ? err.message : "Submission failed",
      }));
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (isLast) {
      onNext();
    } else {
      setCurrent(current + 1);
    }
  }

  function handleSkipQuestion() {
    if (isLast) {
      onNext();
    } else {
      setCurrent(current + 1);
    }
  }

  const answeredCount = Object.keys(results).length;

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">
        Deepen your Profile Cloud
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        These questions target gaps in your evidence. Each answer strengthens
        your Cloud — skip any that don&apos;t apply.
      </p>

      {/* Progress */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-zinc-100">
          <div
            className="h-1.5 rounded-full bg-brand-500 transition-all duration-300"
            style={{
              width: `${((current + (wasSubmitted ? 1 : 0)) / questions.length) * 100}%`,
            }}
          />
        </div>
        <span className="text-xs text-zinc-400 shrink-0">
          {current + 1} / {questions.length}
        </span>
      </div>

      {/* Question card */}
      <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50 p-5">
        <div className="flex gap-3">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-800">{q.question}</p>
            {q.why_asking && (
              <div className="mt-2 flex items-start gap-1.5">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-xs text-zinc-500 italic">{q.why_asking}</p>
              </div>
            )}
          </div>
        </div>

        {/* Skill badge */}
        <div className="mt-3">
          <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-semibold text-brand-700">
            {q.skill_name}
          </span>
        </div>

        <textarea
          value={answers[q.id] ?? ""}
          onChange={(e) =>
            setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
          }
          placeholder="Share specific examples — team sizes, budgets, tools, outcomes..."
          rows={3}
          disabled={wasSubmitted || submitting}
          className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-zinc-50 disabled:text-zinc-500"
        />
      </div>

      {/* Success feedback */}
      {wasSubmitted && results[q.id] && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                {results[q.id].is_new_skill
                  ? `Added "${results[q.id].node_updated}" to your Cloud`
                  : `Strengthened "${results[q.id].node_updated}"`}
              </p>
              <p className="mt-0.5 text-xs text-green-600">
                {results[q.id].evidence_count} evidence point
                {results[q.id].evidence_count !== 1 ? "s" : ""} now on record
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error feedback */}
      {hasError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{errors[q.id]}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        {!wasSubmitted ? (
          <>
            <button
              onClick={handleSkipQuestion}
              disabled={submitting}
              className="h-10 flex-1 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
            >
              {isLast && answeredCount === 0 ? "Skip all" : "Skip"}
            </button>
            <button
              onClick={submitAnswer}
              disabled={!hasAnswer || submitting}
              className="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating Cloud...
                </>
              ) : (
                <>
                  Submit
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </>
        ) : (
          <button
            onClick={handleNext}
            className="flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            {isLast ? "Finish" : "Next question"}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Answered summary */}
      {answeredCount > 0 && (
        <p className="mt-3 text-center text-xs text-zinc-400">
          {answeredCount} answer{answeredCount !== 1 ? "s" : ""} submitted
          {answeredCount < questions.length && ` of ${questions.length}`}
        </p>
      )}
    </div>
  );
}
