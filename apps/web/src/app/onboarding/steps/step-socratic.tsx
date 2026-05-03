"use client";

import { useState } from "react";
import { MessageCircle, ChevronRight } from "lucide-react";

const questions = [
  {
    id: 1,
    question:
      "Your CV mentions 'project management'. Can you describe the largest team or budget you managed?",
    placeholder: "e.g., Led a team of 12 engineers with a $500K budget...",
  },
  {
    id: 2,
    question:
      "You listed 'React' as a skill. What's the most complex React application you've built or contributed to?",
    placeholder: "e.g., Built a real-time dashboard handling 10K concurrent users...",
  },
  {
    id: 3,
    question:
      "What achievement from the past 2 years are you most proud of, and what was your specific role?",
    placeholder: "e.g., Reduced deployment time by 80% by implementing CI/CD...",
  },
];

interface StepSocraticProps {
  onNext: () => void;
  onSkip: () => void;
}

export function StepSocratic({ onNext, onSkip }: StepSocraticProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [current, setCurrent] = useState(0);

  const q = questions[current];
  const isLast = current === questions.length - 1;
  const hasAnswer = (answers[q.id] ?? "").trim().length > 0;

  function handleNext() {
    if (isLast) {
      onNext();
    } else {
      setCurrent(current + 1);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">
        A few quick questions
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        These help us understand the depth behind your skills. Answer what you
        can — skip any that don't apply.
      </p>

      <div className="mt-2 text-xs text-zinc-400">
        Question {current + 1} of {questions.length}
      </div>

      <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50 p-5">
        <div className="flex gap-3">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
          <p className="text-sm font-medium text-zinc-800">{q.question}</p>
        </div>
        <textarea
          value={answers[q.id] ?? ""}
          onChange={(e) =>
            setAnswers({ ...answers, [q.id]: e.target.value })
          }
          placeholder={q.placeholder}
          rows={3}
          className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onSkip}
          className="h-10 flex-1 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
        >
          Skip all
        </button>
        <button
          onClick={handleNext}
          className="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {isLast ? "Finish" : "Next"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
