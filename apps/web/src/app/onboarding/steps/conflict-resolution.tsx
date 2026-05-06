"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Clock,
  Building2,
  GitBranch,
  Calendar,
  Briefcase,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

export interface ConflictQuestion {
  id: string;
  type:
    | "collapsed_role"
    | "date_conflict"
    | "title_mismatch"
    | "employer_pattern"
    | "timeline_gap";
  priority: "critical" | "important" | "minor";
  question: string;
  context: string;
  options?: Array<{ label: string; value: string }>;
  allow_freetext: boolean;
}

export interface ConflictAnswer {
  question_id: string;
  selected_option: string | null;
  freetext: string | null;
}

interface ConflictResolutionProps {
  questions: ConflictQuestion[];
  onComplete: (answers: ConflictAnswer[]) => void;
  onSkip: () => void;
}

// ============================================================
// ICON MAPPING
// ============================================================

const typeIcons: Record<ConflictQuestion["type"], typeof AlertTriangle> = {
  employer_pattern: Building2,
  collapsed_role: GitBranch,
  date_conflict: Calendar,
  title_mismatch: Briefcase,
  timeline_gap: Clock,
};

const typeLabels: Record<ConflictQuestion["type"], string> = {
  employer_pattern: "Career Pattern",
  collapsed_role: "Role Details",
  date_conflict: "Date Confirmation",
  title_mismatch: "Title Confirmation",
  timeline_gap: "Timeline Gap",
};

// ============================================================
// COMPONENT
// ============================================================

export function ConflictResolution({
  questions,
  onComplete,
  onSkip,
}: ConflictResolutionProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ConflictAnswer>>({});

  if (questions.length === 0) {
    // No conflicts detected — auto-proceed
    onComplete([]);
    return null;
  }

  const q = questions[current];
  const isLast = current === questions.length - 1;
  const answer = answers[q.id];
  const hasAnswer =
    (answer?.selected_option ?? "").length > 0 ||
    (answer?.freetext ?? "").trim().length > 0;

  function selectOption(value: string) {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: {
        question_id: q.id,
        selected_option: value,
        freetext: prev[q.id]?.freetext ?? null,
      },
    }));
  }

  function setFreetext(text: string) {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: {
        question_id: q.id,
        selected_option: prev[q.id]?.selected_option ?? null,
        freetext: text,
      },
    }));
  }

  function handleNext() {
    if (isLast) {
      onComplete(Object.values(answers));
    } else {
      setCurrent(current + 1);
    }
  }

  const Icon = typeIcons[q.type];
  const answeredCount = Object.keys(answers).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">
            We noticed a few things
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Your CVs have some differences we'd like to clarify. This takes 30
            seconds and makes your profile much more accurate.
          </p>
        </div>
      </div>

      {/* Progress pills */}
      <div className="mt-5 flex items-center gap-1.5">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < current
                ? "bg-brand-500"
                : i === current
                  ? "bg-brand-300"
                  : "bg-zinc-100"
            }`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-400">
        <span>
          {current + 1} of {questions.length}
        </span>
        <span>{answeredCount} answered</span>
      </div>

      {/* Question card */}
      <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
        {/* Type badge */}
        <div className="mb-3 flex items-center gap-2">
          <Icon className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {typeLabels[q.type]}
          </span>
          {q.priority === "critical" && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Important
            </span>
          )}
        </div>

        {/* Question text */}
        <p className="text-sm font-medium leading-relaxed text-zinc-800">
          {q.question}
        </p>

        {/* Context */}
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          {q.context}
        </p>

        {/* Options */}
        {q.options && (
          <div className="mt-4 space-y-2">
            {q.options.map((opt) => {
              const isSelected = answer?.selected_option === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => selectOption(opt.value)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                    isSelected
                      ? "border-brand-500 bg-brand-50 text-brand-900"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isSelected
                        ? "border-brand-500 bg-brand-500"
                        : "border-zinc-300"
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Free text */}
        {q.allow_freetext && (
          <div className="mt-3">
            <textarea
              value={answer?.freetext ?? ""}
              onChange={(e) => setFreetext(e.target.value)}
              placeholder={
                q.options
                  ? "Want to add more detail? (optional)"
                  : "Type your answer..."
              }
              rows={2}
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={onSkip}
          className="text-sm text-zinc-400 transition-colors hover:text-zinc-600"
        >
          Skip all — build Cloud with what we have
        </button>
        <div className="flex items-center gap-3">
          {current > 0 && (
            <button
              onClick={() => setCurrent(current - 1)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!hasAnswer}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all ${
              hasAnswer
                ? "bg-brand-600 hover:bg-brand-700"
                : "cursor-not-allowed bg-zinc-300"
            }`}
          >
            {isLast ? "Build My Cloud" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
