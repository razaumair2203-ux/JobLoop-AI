"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";

// --- Mock Before/After Data ---
const beforeSummary =
  "Experienced software engineer with strong skills in web development and modern frameworks. Worked on various projects using React and other technologies.";
const afterSummary =
  "Senior Frontend Engineer with 6+ years building high-performance React applications serving 2M+ monthly users. Led design system adoption across 3 product teams, reducing UI development time by 40%. Proven track record in performance optimization, achieving 40% LCP improvements through code splitting and lazy loading.";

const beforeBullets = [
  "Worked on frontend development using React",
  "Helped improve website performance",
  "Built reusable components for the team",
  "Worked with the QA team on testing",
];

const afterBullets = [
  { text: "Led migration from Angular to Next.js 14, serving 2M monthly users with 40% improved LCP", changed: true },
  { text: "Built design system with 60+ components adopted by 3 product teams, reducing UI dev time by 40%", changed: true },
  { text: "Implemented virtual scrolling for 100K+ row data tables, reducing memory usage by 60%", changed: true },
  { text: "Set up GitHub Actions CI/CD pipeline with 85% test coverage, reducing deploy time from 20 to 4 minutes", changed: true },
];

const beforeSkills = "React, JavaScript, HTML, CSS, Git";
const afterSkills = "TypeScript, React, Next.js, Node.js, Tailwind CSS, Vitest, Playwright, Docker, GitHub Actions, Storybook";

export default function ComparePage() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/cv"
        className="mb-6 flex items-center gap-1.5 text-sm text-surface-text-muted hover:text-surface-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CV Builder
      </Link>

      <h1 className="text-2xl font-bold text-surface-text">Before / After</h1>
      <p className="mt-1 text-sm text-surface-text-muted">
        See how your CV was strengthened with evidence from your Profile Cloud
      </p>

      {/* Evidence Strength Summary */}
      <div className="mt-6 flex gap-6">
        <StrengthBar label="Before" strong={2} related={1} gap={5} />
        <StrengthBar label="After" strong={5} related={2} gap={1} />
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-surface-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border-l-2 border-brand-400 bg-brand-50" />
          Changed text
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Improvement
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          New addition
        </span>
      </div>

      {/* Split comparison */}
      <div className="mt-6 grid grid-cols-2 gap-0 overflow-hidden rounded-lg border border-surface-border">
        {/* Before */}
        <div className="border-r border-surface-border bg-surface-2">
          <div className="border-b border-surface-border px-5 py-3">
            <h3 className="text-sm font-semibold text-surface-text-muted">Before</h3>
          </div>
          <div className="p-6 space-y-5">
            {/* Summary */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-surface-text-muted">
                Summary
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-surface-text-secondary">
                {beforeSummary}
              </p>
            </div>

            {/* Experience bullets */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-surface-text-muted">
                Experience
              </h4>
              <ul className="mt-2 space-y-1.5">
                {beforeBullets.map((b, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-surface-text-secondary"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-surface-3" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Skills */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-surface-text-muted">
                Skills
              </h4>
              <p className="mt-2 text-sm text-surface-text-secondary">{beforeSkills}</p>
            </div>
          </div>
        </div>

        {/* After */}
        <div className="bg-surface-0">
          <div className="border-b border-surface-border px-5 py-3">
            <h3 className="text-sm font-semibold text-surface-text">After</h3>
          </div>
          <div className="p-6 space-y-5">
            {/* Summary */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-surface-text-muted">
                Summary
              </h4>
              <div className="mt-2 rounded border-l-2 border-brand-400 bg-brand-50 px-3 py-2">
                <p className="text-sm leading-relaxed text-surface-text">
                  {afterSummary}
                </p>
                <DiffMarker type="improvement" />
              </div>
            </div>

            {/* Experience bullets */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-surface-text-muted">
                Experience
              </h4>
              <ul className="mt-2 space-y-1.5">
                {afterBullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-surface-3" />
                    {b.changed ? (
                      <div className="flex-1 rounded border-l-2 border-brand-400 bg-brand-50 px-2 py-1">
                        <span className="text-sm text-surface-text">{b.text}</span>
                        <DiffMarker type="improvement" />
                      </div>
                    ) : (
                      <span className="text-sm text-surface-text-secondary">{b.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Skills */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-surface-text-muted">
                Skills
              </h4>
              <div className="mt-2 rounded border-l-2 border-amber-400 bg-amber-50 px-3 py-2">
                <p className="text-sm text-surface-text">{afterSkills}</p>
                <DiffMarker type="addition" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="mt-6 flex justify-end gap-3">
        <Link
          href="/cv"
          className="rounded-lg border border-surface-border px-5 py-2.5 text-sm font-medium text-surface-text-secondary hover:bg-surface-2"
        >
          Edit CV
        </Link>
        <button className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          Export final version
        </button>
      </div>
    </div>
  );
}

function StrengthBar({
  label,
  strong,
  related,
  gap,
}: {
  label: string;
  strong: number;
  related: number;
  gap: number;
}) {
  const total = strong + related + gap;
  return (
    <div className="flex-1 rounded-lg border border-surface-border bg-surface-0 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-surface-text-secondary">{label}</span>
        <span className="text-xs text-surface-text-muted">
          {strong} Strong | {related} Related | {gap} Gap
        </span>
      </div>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${(strong / total) * 100}%` }}
        />
        <div
          className="bg-sky-500 transition-all"
          style={{ width: `${(related / total) * 100}%` }}
        />
        <div
          className="bg-amber-500 transition-all"
          style={{ width: `${(gap / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function DiffMarker({ type }: { type: "improvement" | "addition" }) {
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 text-[10px] font-medium ${
        type === "improvement" ? "text-emerald-600" : "text-amber-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          type === "improvement" ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {type === "improvement" ? "Improved" : "Added"}
    </span>
  );
}
