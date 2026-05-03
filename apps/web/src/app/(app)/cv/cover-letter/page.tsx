"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  RefreshCw,
  Briefcase,
  Code,
  FolderOpen,
} from "lucide-react";

// --- Types ---
type Tone = "professional" | "assertive" | "technical" | "conversational";

interface Paragraph {
  type: "opening" | "body" | "closing";
  text: string;
  evidence_used: string[];
  strategy: string;
}

// --- Mock Data ---
const mockParagraphs: Paragraph[] = [
  {
    type: "opening",
    text: "I'm writing to express my strong interest in the Staff Engineer, Developer Experience position at Vercel. Having spent the past four years building high-performance Next.js applications serving millions of users, I've developed a deep understanding of the framework's capabilities and the developer experience challenges that Vercel is uniquely positioned to solve.",
    evidence_used: ["Next.js migration at Scale Corp", "2M monthly users"],
    strategy:
      "Opens with specific Vercel-relevant experience rather than generic enthusiasm. Demonstrates product familiarity through real usage.",
  },
  {
    type: "body",
    text: "At Scale Corp, I led the migration from Angular to Next.js 14, which reduced our Largest Contentful Paint by 40% and simplified our deployment pipeline from 20-minute builds to 4-minute CI/CD cycles. This experience gave me firsthand insight into the migration challenges that Vercel's customers face — challenges I'd love to help address through better tooling and documentation. Beyond framework expertise, I built a design system of 60+ components adopted by three product teams, reducing UI development time by 40%. This work required balancing developer ergonomics with performance constraints — exactly the kind of trade-off that defines great DX. I also implemented virtual scrolling for tables with 100K+ rows, demonstrating my commitment to solving real performance problems at scale.",
    evidence_used: [
      "Next.js migration — 40% LCP improvement",
      "Design system — 60+ components, 3 teams",
      "CI/CD pipeline — 20min to 4min",
      "Virtual scrolling — 100K+ rows",
    ],
    strategy:
      "Body focuses on quantified achievements that directly map to Vercel's DX mission. Each accomplishment is framed as relevant to the role rather than listed generically.",
  },
  {
    type: "closing",
    text: "I'm particularly drawn to Vercel's mission of making the web faster and more accessible to developers. My combination of deep Next.js expertise, performance optimization skills, and experience building tools that other developers love makes me confident I can contribute meaningfully to your DX team. I'd welcome the opportunity to discuss how my experience aligns with your team's current priorities.",
    evidence_used: ["Overall Cloud evidence"],
    strategy:
      "Closing ties personal motivation to company mission. Avoids desperate tone — positions as mutual exploration rather than pleading.",
  },
];

const mockSources = [
  { name: "Work Experience", icon: "briefcase", count: 4 },
  { name: "Skills", icon: "code", count: 6 },
  { name: "Projects", icon: "folder", count: 2 },
];

const sourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  briefcase: Briefcase,
  code: Code,
  folder: FolderOpen,
};

export default function CoverLetterPage() {
  const [tone, setTone] = useState<Tone>("professional");
  const [paragraphs, setParagraphs] = useState(mockParagraphs);
  const [expandedStrategy, setExpandedStrategy] = useState<number | null>(null);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const wordCount = paragraphs
    .reduce((acc, p) => acc + p.text.split(/\s+/).length, 0);

  function handleCopy() {
    const text = paragraphs.map((p) => p.text).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/cv"
        className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CV Builder
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900">Cover Letter</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Generated from your Profile Cloud evidence — every claim is backed by
        real experience
      </p>

      {/* Tone selector */}
      <div className="mt-6 flex gap-2">
        {(
          ["professional", "assertive", "technical", "conversational"] as Tone[]
        ).map((t) => (
          <button
            key={t}
            onClick={() => setTone(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tone === t
                ? "bg-brand-600 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-brand-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Evidence sources (collapsible) */}
      <button
        onClick={() => setSourcesExpanded(!sourcesExpanded)}
        className="mt-4 flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-600"
      >
        <span className="font-medium">
          Evidence sources ({mockSources.reduce((a, s) => a + s.count, 0)}{" "}
          points used)
        </span>
        {sourcesExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {sourcesExpanded && (
        <div className="mt-2 flex gap-3 overflow-x-auto">
          {mockSources.map((src) => {
            const Icon = sourceIcons[src.icon] || Briefcase;
            return (
              <div
                key={src.name}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2"
              >
                <Icon className="h-4 w-4 text-brand-500" />
                <div>
                  <p className="text-xs font-medium text-zinc-700">
                    {src.name}
                  </p>
                  <p className="text-xs text-zinc-400">{src.count} points</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Letter content */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="p-8 space-y-6">
          {paragraphs.map((para, idx) => (
            <div key={idx}>
              {/* Paragraph label */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {para.type}
                </span>
                <button
                  onClick={() =>
                    setExpandedStrategy(
                      expandedStrategy === idx ? null : idx
                    )
                  }
                  className="text-xs text-brand-500 hover:text-brand-600"
                >
                  {expandedStrategy === idx
                    ? "Hide strategy"
                    : "Why this approach?"}
                </button>
              </div>

              {/* Editable text */}
              <div className="mt-2">
                <p className="text-sm leading-relaxed text-zinc-800">
                  {para.text}
                  {/* Inline citation badges */}
                  {para.evidence_used.map((_, eIdx) => (
                    <span
                      key={eIdx}
                      className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded bg-brand-100 text-[10px] font-medium text-brand-600"
                      title={para.evidence_used[eIdx]}
                    >
                      {eIdx + 1}
                    </span>
                  ))}
                </p>
              </div>

              {/* Strategy explanation */}
              {expandedStrategy === idx && (
                <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50 p-3">
                  <p className="text-xs font-medium text-brand-700">
                    Strategy
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-brand-800">
                    {para.strategy}
                  </p>
                  <div className="mt-2">
                    <p className="text-xs font-medium text-brand-700">
                      Evidence used
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {para.evidence_used.map((e, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-1.5 text-xs text-brand-600"
                        >
                          <span className="h-1 w-1 rounded-full bg-brand-400" />
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-zinc-400">{wordCount} words</span>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy"}
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
