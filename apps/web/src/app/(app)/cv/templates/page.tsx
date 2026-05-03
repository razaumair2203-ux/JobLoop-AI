"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye } from "lucide-react";

type TemplateId = "professional" | "technical" | "modern" | "executive" | "minimal" | "creative";

const templates: {
  id: TemplateId;
  name: string;
  description: string;
  accent: string;
  bgAccent: string;
  features: string[];
}[] = [
  {
    id: "professional",
    name: "Professional",
    description: "Clean, traditional layout. Best for corporate roles and established industries.",
    accent: "bg-zinc-800",
    bgAccent: "bg-zinc-50",
    features: ["Single column", "Classic typography", "Subtle dividers"],
  },
  {
    id: "technical",
    name: "Technical",
    description: "Structured and data-dense. Ideal for engineering and technical roles.",
    accent: "bg-blue-600",
    bgAccent: "bg-blue-50",
    features: ["Skill tags", "Compact layout", "Monospace accents"],
  },
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary feel with brand accent. Great for startups and product roles.",
    accent: "bg-brand-600",
    bgAccent: "bg-brand-50",
    features: ["Bold header", "Color accents", "Open spacing"],
  },
  {
    id: "executive",
    name: "Executive",
    description: "Authoritative and refined. Suited for leadership and senior management.",
    accent: "bg-slate-700",
    bgAccent: "bg-slate-50",
    features: ["Wide margins", "Serif headings", "Understated elegance"],
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Maximum white space, zero noise. For design, UX, and creative-technical roles.",
    accent: "bg-neutral-900",
    bgAccent: "bg-neutral-50",
    features: ["Generous whitespace", "Thin rules", "Light weight"],
  },
  {
    id: "creative",
    name: "Creative",
    description: "Distinctive layout with visual flair. For marketing, design, and brand roles.",
    accent: "bg-violet-600",
    bgAccent: "bg-violet-50",
    features: ["Accent sidebar", "Icon markers", "Expressive type"],
  },
];

export default function TemplateGalleryPage() {
  const [selected, setSelected] = useState<TemplateId>("professional");
  const [previewing, setPreviewing] = useState<TemplateId | null>(null);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/cv"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Template Gallery</h1>
            <p className="text-sm text-zinc-500">Choose a template that fits your target role</p>
          </div>
        </div>
        <Link
          href="/cv"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Apply Template
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`group relative rounded-xl border-2 p-1 text-left transition-all ${
                  selected === t.id
                    ? "border-brand-500 ring-2 ring-brand-200"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                {/* Selection badge */}
                {selected === t.id && (
                  <div className="absolute -right-2 -top-2 z-10 rounded-full bg-brand-600 p-1">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                )}

                {/* Thumbnail Preview */}
                <div className={`relative rounded-lg ${t.bgAccent} p-4`}>
                  <TemplateThumbnail templateId={t.id} accent={t.accent} />
                  {/* Preview overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition-all group-hover:bg-black/5 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewing(t.id);
                      }}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-md hover:bg-zinc-50"
                    >
                      <Eye className="mr-1 inline h-3.5 w-3.5" />
                      Preview
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${t.accent}`} />
                    <h3 className="text-sm font-semibold text-zinc-900">{t.name}</h3>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{t.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.features.map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview Panel */}
        {previewing && (
          <div className="w-[420px] shrink-0 border-l border-zinc-200 bg-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                {templates.find((t) => t.id === previewing)?.name} Preview
              </h3>
              <button
                onClick={() => setPreviewing(null)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <span className="text-xs">Close</span>
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <div className="mx-auto aspect-[8.5/11] w-full rounded bg-white shadow-lg">
                <TemplateFullPreview templateId={previewing} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Thumbnail: miniature CV representation ---
function TemplateThumbnail({ templateId, accent }: { templateId: TemplateId; accent: string }) {
  const configs: Record<TemplateId, { headerStyle: string; bodyStyle: string }> = {
    professional: { headerStyle: "text-center", bodyStyle: "space-y-2" },
    technical: { headerStyle: "text-left", bodyStyle: "space-y-1.5" },
    modern: { headerStyle: "text-center", bodyStyle: "space-y-2" },
    executive: { headerStyle: "text-center", bodyStyle: "space-y-2.5" },
    minimal: { headerStyle: "text-left", bodyStyle: "space-y-3" },
    creative: { headerStyle: "text-left", bodyStyle: "space-y-2" },
  };

  const config = configs[templateId];

  return (
    <div className="aspect-[8.5/11] rounded bg-white p-3 shadow-sm">
      {/* Header block */}
      <div className={config.headerStyle}>
        <div className={`mx-auto h-2 w-16 rounded-full ${accent}`} />
        <div className="mx-auto mt-1 h-1 w-24 rounded-full bg-zinc-200" />
        {templateId === "creative" && (
          <div className="absolute left-3 top-3 h-full w-1 rounded-full bg-violet-300" />
        )}
      </div>

      {/* Body blocks */}
      <div className={`mt-3 ${config.bodyStyle}`}>
        <div>
          <div className={`h-1 w-12 rounded-full ${accent} opacity-60`} />
          <div className="mt-1 h-1 w-full rounded-full bg-zinc-100" />
          <div className="mt-0.5 h-1 w-3/4 rounded-full bg-zinc-100" />
        </div>
        <div>
          <div className={`h-1 w-14 rounded-full ${accent} opacity-60`} />
          <div className="mt-1 h-1 w-full rounded-full bg-zinc-100" />
          <div className="mt-0.5 h-1 w-5/6 rounded-full bg-zinc-100" />
          <div className="mt-0.5 h-1 w-2/3 rounded-full bg-zinc-100" />
        </div>
        <div>
          <div className={`h-1 w-10 rounded-full ${accent} opacity-60`} />
          <div className="mt-1 flex flex-wrap gap-0.5">
            <div className="h-1 w-6 rounded-full bg-zinc-100" />
            <div className="h-1 w-8 rounded-full bg-zinc-100" />
            <div className="h-1 w-5 rounded-full bg-zinc-100" />
            <div className="h-1 w-7 rounded-full bg-zinc-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Full Preview with sample content ---
function TemplateFullPreview({ templateId }: { templateId: TemplateId }) {
  const styles: Record<TemplateId, { heading: string; accent: string; border: string; font: string }> = {
    professional: { heading: "text-zinc-800", accent: "text-zinc-600", border: "border-zinc-300", font: "font-sans" },
    technical: { heading: "text-blue-700", accent: "text-blue-600", border: "border-blue-200", font: "font-mono" },
    modern: { heading: "text-brand-600", accent: "text-brand-500", border: "border-brand-200", font: "font-sans" },
    executive: { heading: "text-slate-700", accent: "text-slate-500", border: "border-slate-200", font: "font-serif" },
    minimal: { heading: "text-neutral-900", accent: "text-neutral-400", border: "border-neutral-200", font: "font-sans" },
    creative: { heading: "text-violet-700", accent: "text-violet-500", border: "border-violet-200", font: "font-sans" },
  };

  const s = styles[templateId];

  return (
    <div className={`p-6 text-[10px] leading-relaxed ${s.font}`}>
      {templateId === "creative" && (
        <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l bg-violet-400" />
      )}
      <div className={templateId === "professional" || templateId === "modern" || templateId === "executive" ? "text-center" : ""}>
        <h1 className={`text-sm font-bold ${s.heading}`}>Alex Chen</h1>
        <p className={`mt-0.5 text-[9px] ${s.accent}`}>
          alex@email.com | San Francisco, CA
        </p>
      </div>

      <div className="mt-3">
        <h2 className={`border-b ${s.border} pb-0.5 text-[9px] font-bold uppercase tracking-wider ${s.heading}`}>
          Summary
        </h2>
        <p className="mt-1 text-zinc-600">
          Senior Frontend Engineer with 6+ years building React applications. Led component library adoption across teams.
        </p>
      </div>

      <div className="mt-2">
        <h2 className={`border-b ${s.border} pb-0.5 text-[9px] font-bold uppercase tracking-wider ${s.heading}`}>
          Experience
        </h2>
        <div className="mt-1">
          <div className="flex justify-between">
            <span className="font-semibold text-zinc-800">Sr. Frontend Engineer</span>
            <span className="text-[8px] text-zinc-400">2022-Present</span>
          </div>
          <p className="text-zinc-500">Scale Corp</p>
          <ul className="mt-0.5 space-y-0.5 text-zinc-600">
            <li className="flex gap-1">
              <span className="mt-1 h-0.5 w-0.5 shrink-0 rounded-full bg-zinc-400" />
              Led migration to Next.js 14, serving 2M users
            </li>
            <li className="flex gap-1">
              <span className="mt-1 h-0.5 w-0.5 shrink-0 rounded-full bg-zinc-400" />
              Built 60+ component design system
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-2">
        <h2 className={`border-b ${s.border} pb-0.5 text-[9px] font-bold uppercase tracking-wider ${s.heading}`}>
          Skills
        </h2>
        <p className="mt-1 text-zinc-600">TypeScript, React, Next.js, Node.js, Tailwind</p>
      </div>
    </div>
  );
}
