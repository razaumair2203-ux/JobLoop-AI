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
      <h1 className="text-lg font-semibold text-surface-text">Browser Extension</h1>
      <p className="mt-1 text-sm text-surface-text-muted">
        One-click save job postings and auto-fill applications
      </p>

      {/* Extension card */}
      <div className="mt-6 rounded-lg border border-surface-border bg-surface-0 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-100">
            <Globe2 className="h-7 w-7 text-brand-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-surface-text">JobLoop Browser Extension</h2>
            <p className="mt-1 text-sm text-surface-text-muted">
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
          <div key={feature.title} className="rounded-lg border border-surface-border bg-surface-0 p-4">
            <feature.icon className="h-5 w-5 text-brand-500" />
            <h3 className="mt-2 text-sm font-semibold text-surface-text">{feature.title}</h3>
            <p className="mt-1 text-xs text-surface-text-muted">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Settings */}
      {installed && (
        <div className="mt-6 rounded-lg border border-surface-border bg-surface-0 p-6">
          <h3 className="text-sm font-semibold text-surface-text">Extension Settings</h3>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-text-secondary">Auto-save submissions</p>
                <p className="text-xs text-surface-text-muted">
                  Automatically save to tracker when you submit an application
                </p>
              </div>
              <button
                onClick={() => setAutoSave(!autoSave)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  autoSave ? "bg-brand-600" : "bg-surface-3"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface-0 shadow transition-transform ${
                    autoSave ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-text-secondary">Auto-fill applications</p>
                <p className="text-xs text-surface-text-muted">
                  Pre-fill application forms with your profile data
                </p>
              </div>
              <button
                onClick={() => setAutoFill(!autoFill)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  autoFill ? "bg-brand-600" : "bg-surface-3"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface-0 shadow transition-transform ${
                    autoFill ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-lg bg-surface-2 p-3 text-xs text-surface-text-muted">
            <Shield className="h-4 w-4 shrink-0 text-surface-text-muted" />
            The extension only reads job posting content. It never accesses your email, passwords, or browsing history.
          </div>
        </div>
      )}
    </div>
  );
}
