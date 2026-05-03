"use client";

import { useState } from "react";
import {
  Globe2,
  Download,
  Check,
  Globe,
  Save,
  Zap,
  Shield,
} from "lucide-react";

export default function ExtensionsPage() {
  const [installed, setInstalled] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [autoFill, setAutoFill] = useState(false);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-semibold text-zinc-900">Browser Extension</h1>
      <p className="mt-1 text-sm text-zinc-500">
        One-click save job postings and auto-fill applications
      </p>

      {/* Extension card */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-100">
            <Globe2 className="h-7 w-7 text-brand-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-zinc-900">JobLoop Browser Extension</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Save job postings from any website with one click. Auto-detects job descriptions on
              LinkedIn, Indeed, Greenhouse, Lever, and 50+ job boards.
            </p>
            <div className="mt-3">
              {installed ? (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <Check className="h-4 w-4" />
                  Installed &middot; v1.2.0
                </div>
              ) : (
                <button
                  onClick={() => setInstalled(true)}
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <Download className="h-4 w-4" />
                  Install Extension
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          {
            icon: Save,
            title: "One-click Save",
            description: "Save any job posting to your tracker instantly",
          },
          {
            icon: Zap,
            title: "Auto-fill Applications",
            description: "Fill application forms with your tailored CV data",
          },
          {
            icon: Globe,
            title: "50+ Job Boards",
            description: "Works on LinkedIn, Indeed, Greenhouse, Lever, and more",
          },
        ].map((feature) => (
          <div key={feature.title} className="rounded-xl border border-zinc-200 bg-white p-4">
            <feature.icon className="h-5 w-5 text-brand-500" />
            <h3 className="mt-2 text-sm font-semibold text-zinc-900">{feature.title}</h3>
            <p className="mt-1 text-xs text-zinc-500">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Settings */}
      {installed && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-zinc-900">Extension Settings</h3>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-700">Auto-save submissions</p>
                <p className="text-xs text-zinc-500">
                  Automatically save to tracker when you submit an application
                </p>
              </div>
              <button
                onClick={() => setAutoSave(!autoSave)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  autoSave ? "bg-brand-600" : "bg-zinc-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    autoSave ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-700">Auto-fill applications</p>
                <p className="text-xs text-zinc-500">
                  Pre-fill application forms with your profile data
                </p>
              </div>
              <button
                onClick={() => setAutoFill(!autoFill)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  autoFill ? "bg-brand-600" : "bg-zinc-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    autoFill ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
            <Shield className="h-4 w-4 shrink-0 text-zinc-400" />
            The extension only reads job posting content. It never accesses your email, passwords, or browsing history.
          </div>
        </div>
      )}
    </div>
  );
}
