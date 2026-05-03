"use client";

import { PartyPopper, Search, Upload } from "lucide-react";

interface StepReadyProps {
  onFinish: () => void;
}

export function StepReady({ onFinish }: StepReadyProps) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
        <PartyPopper className="h-8 w-8 text-brand-600" />
      </div>

      <h2 className="mt-4 text-xl font-semibold text-zinc-900">
        You're all set!
      </h2>
      <p className="mt-2 text-sm text-zinc-500">
        Your Profile Cloud is ready. Every recommendation will be backed by
        evidence from your real experience.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-200 p-4">
          <Upload className="mx-auto h-6 w-6 text-brand-500" />
          <p className="mt-2 text-sm font-medium text-zinc-900">
            Upload more CVs
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Enrich your Cloud with more experience
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <Search className="mx-auto h-6 w-6 text-blue-500" />
          <p className="mt-2 text-sm font-medium text-zinc-900">
            Analyze a JD
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            See how your evidence matches a role
          </p>
        </div>
      </div>

      <button
        onClick={onFinish}
        className="mt-8 h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
