"use client";

import {
  GraduationCap,
  TrendingUp,
  Award,
  Crown,
  Shuffle,
  PenTool,
  RotateCcw,
  Zap,
  Shield,
} from "lucide-react";

const personas = [
  {
    id: "early_career",
    label: "Early Career",
    description: "Recent graduate or just starting out",
    icon: GraduationCap,
  },
  {
    id: "mid_career",
    label: "Mid-Career Professional",
    description: "5-15 years, growing impact and scope",
    icon: TrendingUp,
  },
  {
    id: "senior",
    label: "Senior Professional",
    description: "15+ years, deep domain expertise",
    icon: Award,
  },
  {
    id: "executive",
    label: "Executive / Leader",
    description: "Leadership, C-level, or VP experience",
    icon: Crown,
  },
  {
    id: "career_changer",
    label: "Career Changer",
    description: "Switching industries or roles",
    icon: Shuffle,
  },
  {
    id: "freelancer",
    label: "Freelancer / Consultant",
    description: "Contract or consulting background",
    icon: PenTool,
  },
  {
    id: "returner",
    label: "Returning to Work",
    description: "Re-entering after a voluntary career gap",
    icon: RotateCcw,
  },
  {
    id: "laid_off",
    label: "Recently Laid Off",
    description: "Displaced and actively searching",
    icon: Zap,
  },
  {
    id: "military",
    label: "Military Transition",
    description: "Transitioning from military or government service",
    icon: Shield,
  },
];

interface StepPersonaProps {
  selected: string | null;
  onSelect: (persona: string) => void;
  onNext: () => void;
}

export function StepPersona({ selected, onSelect, onNext }: StepPersonaProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">
        Tell us about yourself
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        This helps us ask the right questions and tailor your experience.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {personas.map((p) => {
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                isSelected
                  ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                  : "border-zinc-200 hover:border-brand-300 hover:bg-zinc-50"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isSelected
                    ? "bg-brand-100 text-brand-600"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                <p.icon className="h-4 w-4" />
              </div>
              <div>
                <p
                  className={`text-sm font-medium ${
                    isSelected ? "text-brand-700" : "text-zinc-900"
                  }`}
                >
                  {p.label}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{p.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={!selected}
        className="mt-6 h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
