"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StepPersona } from "./steps/step-persona";
import { StepUpload, type SocraticQuestion } from "./steps/step-upload";
import { StepCloud } from "./steps/step-cloud";
import { StepSocratic } from "./steps/step-socratic";
import { StepReady } from "./steps/step-ready";

const TOTAL_STEPS = 5;

const stepLabels = ["You", "CV", "Cloud", "Questions", "Ready"];

export interface UploadResult {
  id?: string;
  filename: string;
  status?: string;
  skills_found?: number;
  experience_count?: number;
  error?: string;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [persona, setPersona] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [socraticQuestions, setSocraticQuestions] = useState<SocraticQuestion[]>([]);
  const supabase = createClient();

  async function updateStep(nextStep: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("users")
      .update({ onboarding_step: nextStep })
      .eq("id", user.id);

    setStep(nextStep);
  }

  async function completeOnboarding() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("users")
      .update({ onboarding_completed: true, onboarding_step: 5 })
      .eq("id", user.id);

    window.location.href = "/dashboard";
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === step;
            const isDone = stepNum < step;
            return (
              <div key={label} className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    isDone
                      ? "bg-brand-500 text-white"
                      : isActive
                        ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500"
                        : "bg-zinc-100 text-zinc-400"
                  }`}
                >
                  {isDone ? "\u2713" : stepNum}
                </div>
                <span
                  className={`text-xs ${
                    isActive ? "font-medium text-brand-700" : "text-zinc-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-1.5 rounded-full bg-zinc-100">
          <div
            className="h-1.5 rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-zinc-200 bg-white p-8">
        {step === 1 && (
          <StepPersona
            selected={persona}
            onSelect={(p) => setPersona(p)}
            onNext={async () => {
              if (!persona) return;
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from("users")
                  .update({ persona })
                  .eq("id", user.id);
              }
              updateStep(2);
            }}
          />
        )}
        {step === 2 && (
          <StepUpload
            onNext={(results, questions) => {
              setUploadResults(results);
              setSocraticQuestions(questions);
              updateStep(3);
            }}
            onSkip={() => updateStep(3)}
          />
        )}
        {step === 3 && (
          <StepCloud
            uploadResults={uploadResults}
            onNext={() => updateStep(4)}
          />
        )}
        {step === 4 && (
          <StepSocratic
            questions={socraticQuestions}
            onNext={() => updateStep(5)}
            onSkip={() => updateStep(5)}
          />
        )}
        {step === 5 && <StepReady onFinish={completeOnboarding} />}
      </div>
    </div>
  );
}
