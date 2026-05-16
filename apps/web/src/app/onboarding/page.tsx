"use client";

import { useState, useEffect } from "react";
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
  const [step, setStep] = useState(0); // 0 = loading from DB
  const [persona, setPersona] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [socraticQuestions, setSocraticQuestions] = useState<SocraticQuestion[]>([]);
  const supabase = createClient();

  // Resume from saved onboarding step on mount / refresh
  useEffect(() => {
    async function loadSavedStep() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStep(1); return; }

      const { data } = await supabase
        .from("users")
        .select("onboarding_step, persona, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (data?.onboarding_completed) {
        window.location.href = "/dashboard";
        return;
      }

      const saved = data?.onboarding_step ?? 1;
      if (data?.persona) setPersona(data.persona);
      setStep(saved);
    }
    loadSavedStep();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Loading state while fetching saved step
  if (step === 0) {
    return (
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      </div>
    );
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
                        : "bg-surface-2 text-surface-text-muted"
                  }`}
                >
                  {isDone ? "\u2713" : stepNum}
                </div>
                <span
                  className={`text-xs ${
                    isActive ? "font-medium text-brand-700" : "text-surface-text-muted"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-1.5 rounded-full bg-surface-2">
          <div
            className="h-1.5 rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-surface-border bg-surface-0 p-8">
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
