"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Sparkles,
  Plus,
  X,
  Clock,
  Download,
  GitCompare,
  Pencil,
  Check,
  GripVertical,
  Palette,
  LayoutGrid,
  GitBranch,
  ChevronDown,
  Type,
} from "lucide-react";

// --- Mock Data ---
const mockCV = {
  contact: {
    full_name: "Alex Chen",
    email: "alex.chen@email.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    linkedin_url: "linkedin.com/in/alexchen",
    github_url: "github.com/alexchen",
    portfolio_url: null,
  },
  summary:
    "Senior Frontend Engineer with 6+ years building high-performance React applications. Led component library adoption across 3 product teams, reducing UI development time by 40%. Passionate about design systems, accessibility, and developer experience.",
  experience: [
    {
      company: "Scale Corp",
      title: "Senior Frontend Engineer",
      start_date: "Jan 2022",
      end_date: "Present",
      location: "San Francisco, CA",
      bullets: [
        { text: "Led migration from Angular to Next.js 14, serving 2M monthly users with 40% improved LCP", jd_matches: ["React", "Next.js", "Performance"], evidence_sources: ["cloud-1"] },
        { text: "Built design system with 60+ components adopted by 3 product teams, reducing UI dev time by 40%", jd_matches: ["Design system"], evidence_sources: ["cloud-2"] },
        { text: "Implemented virtual scrolling for 100K+ row data tables, reducing memory usage by 60%", jd_matches: ["Performance"], evidence_sources: ["cloud-3"] },
        { text: "Set up GitHub Actions CI/CD pipeline, reducing deploy time from 20 to 4 minutes", jd_matches: ["CI/CD"], evidence_sources: ["cloud-4"] },
      ],
    },
    {
      company: "DataFlow Inc",
      title: "Frontend Engineer",
      start_date: "Mar 2019",
      end_date: "Dec 2021",
      location: "Remote",
      bullets: [
        { text: "Developed real-time dashboard with WebSocket streaming for 500+ concurrent users", jd_matches: ["React"], evidence_sources: ["cloud-5"] },
        { text: "Achieved 85% test coverage with Vitest and Playwright E2E testing", jd_matches: ["Testing"], evidence_sources: ["cloud-6"] },
        { text: "Mentored 2 junior developers through structured onboarding program", jd_matches: ["Leadership"], evidence_sources: ["cloud-7"] },
      ],
    },
  ],
  skills: {
    Languages: ["TypeScript", "JavaScript", "Python", "HTML/CSS"],
    Frameworks: ["React", "Next.js", "Node.js", "Tailwind CSS"],
    Tools: ["Git", "Docker", "GitHub Actions", "Figma", "Storybook"],
    Testing: ["Vitest", "Playwright", "React Testing Library"],
  } as Record<string, string[]>,
  education: [
    {
      institution: "UC Berkeley",
      degree: "B.S. Computer Science",
      year: "2019",
      highlights: ["Dean's List", "HackBerkeley Winner 2018"],
    },
  ],
  certifications: ["AWS Cloud Practitioner", "Meta Frontend Developer"],
  settings: {
    section_order: ["summary", "experience", "skills", "education", "certifications"],
    max_pages: 1 as const,
    template_id: "professional" as const,
    accent_color: "#db2777",
    font: "inter" as const,
    show_photo: false,
    photo_url: null,
  },
};

const mockVersions = [
  { id: "v3", name: "Tailored for Vercel", date: "May 1, 2026", summary: "Added Next.js focus, performance metrics" },
  { id: "v2", name: "Tailored for Stripe", date: "Apr 28, 2026", summary: "Emphasized payment/API experience" },
  { id: "v1", name: "Base CV", date: "Apr 25, 2026", summary: "Initial upload + Cloud parsing" },
];

type TemplateId = "professional" | "technical" | "modern" | "executive" | "minimal" | "creative";

const templateOptions: { id: TemplateId; label: string }[] = [
  { id: "professional", label: "Professional" },
  { id: "technical", label: "Technical" },
  { id: "modern", label: "Modern" },
  { id: "executive", label: "Executive" },
  { id: "minimal", label: "Minimal" },
  { id: "creative", label: "Creative" },
];

const fontOptions = [
  { id: "inter", label: "Inter (Sans)" },
  { id: "georgia", label: "Georgia (Serif)" },
  { id: "jetbrains", label: "JetBrains (Mono)" },
];

const accentColors = [
  { id: "zinc", color: "#3f3f46", label: "Slate" },
  { id: "brand", color: "#db2777", label: "Brand" },
  { id: "blue", color: "#2563eb", label: "Blue" },
  { id: "violet", color: "#7c3aed", label: "Violet" },
  { id: "emerald", color: "#059669", label: "Emerald" },
  { id: "amber", color: "#d97706", label: "Amber" },
];

const spacingOptions = [
  { id: "compact", label: "Compact" },
  { id: "normal", label: "Normal" },
  { id: "relaxed", label: "Relaxed" },
];

// Mock branches (master + tailored versions)
const mockBranches = [
  { id: "master", name: "Master Resume", isBase: true, jobTarget: null, lastEdited: "Apr 25, 2026" },
  { id: "vercel", name: "Tailored for Vercel", isBase: false, jobTarget: "Senior Frontend Engineer", lastEdited: "May 1, 2026" },
  { id: "stripe", name: "Tailored for Stripe", isBase: false, jobTarget: "Frontend Platform Lead", lastEdited: "Apr 28, 2026" },
];

/** Convert API GeneratedCV to the shape the UI expects */
function apiCVToLocal(data: {
  cv: {
    summary: string;
    experience: Array<{
      company: string;
      title: string;
      start_date: string;
      end_date: string;
      location?: string;
      bullets: string[];
    }>;
    skills: Record<string, string[]>;
    education: Array<{
      institution: string;
      degree: string;
      year: string;
      highlights?: string[];
    }>;
    certifications: string[];
  };
  company?: string;
  role?: string;
}) {
  const cv = data.cv;
  return {
    contact: {
      full_name: "",
      email: "",
      phone: "",
      location: "",
      linkedin_url: "",
      github_url: "",
      portfolio_url: null,
    },
    summary: cv.summary || "",
    experience: (cv.experience || []).map((exp) => ({
      company: exp.company,
      title: exp.title,
      start_date: exp.start_date,
      end_date: exp.end_date,
      location: exp.location || "",
      bullets: (exp.bullets || []).map((b) =>
        typeof b === "string"
          ? { text: b, jd_matches: [] as string[], evidence_sources: [] as string[] }
          : b,
      ),
    })),
    skills: cv.skills || {},
    education: (cv.education || []).map((edu) => ({
      institution: edu.institution,
      degree: edu.degree,
      year: edu.year,
      highlights: edu.highlights || [],
    })),
    certifications: cv.certifications || [],
    settings: {
      section_order: ["summary", "experience", "skills", "education", "certifications"],
      max_pages: 1 as const,
      template_id: "professional" as const,
      accent_color: "#db2777",
      font: "inter" as const,
      show_photo: false,
      photo_url: null,
    },
  };
}

export default function CVBuilderPage() {
  const searchParams = useSearchParams();
  const appId = searchParams.get("app");

  const [cv, setCv] = useState(mockCV);
  const [activeTab, setActiveTab] = useState("summary");
  const [template, setTemplate] = useState<TemplateId>("professional");
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState("vercel");
  const [cvName, setCvName] = useState("Tailored for Vercel");
  const [editingName, setEditingName] = useState(false);
  const [sectionOrder, setSectionOrder] = useState(["summary", "experience", "skills", "education", "certifications"]);
  const [font, setFont] = useState("inter");
  const [accentColor, setAccentColor] = useState("brand");
  const [spacing, setSpacing] = useState("normal");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const generateCV = useCallback(async (applicationId: string) => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || "Generation failed");
        return;
      }
      const localCV = apiCVToLocal(data);
      setCv(localCV);
      setCvName(`Tailored for ${data.company || "role"}`);
      setActiveBranch("generated");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    if (appId) {
      generateCV(appId);
    }
  }, [appId, generateCV]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  if (generating) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm font-medium text-zinc-700">Generating your tailored CV...</p>
          <p className="mt-1 text-xs text-zinc-400">This usually takes 10-30 seconds</p>
        </div>
      </div>
    );
  }

  if (genError) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">CV Generation Failed</p>
          <p className="mt-2 text-xs text-red-600">{genError}</p>
          <button
            onClick={() => appId && generateCV(appId)}
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Branch selector */}
          <div className="relative">
            <button
              onClick={() => setBranchMenuOpen(!branchMenuOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <GitBranch className="h-3.5 w-3.5" />
              {mockBranches.find((b) => b.id === activeBranch)?.name ?? "Master"}
              <ChevronDown className="h-3 w-3" />
            </button>
            {branchMenuOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                {mockBranches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBranch(b.id);
                      setCvName(b.name);
                      setBranchMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 ${
                      activeBranch === b.id ? "bg-brand-50" : ""
                    }`}
                  >
                    <GitBranch className={`h-3.5 w-3.5 ${b.isBase ? "text-zinc-400" : "text-brand-500"}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900">{b.name}</p>
                      <p className="text-xs text-zinc-400">
                        {b.isBase ? "Base resume" : b.jobTarget} · {b.lastEdited}
                      </p>
                    </div>
                    {activeBranch === b.id && <Check className="h-4 w-4 text-brand-600" />}
                  </button>
                ))}
                <div className="border-t border-zinc-100 px-3 py-2">
                  <button className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
                    <Plus className="h-3 w-3" /> New tailored version
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CV name */}
          {editingName ? (
            <input
              value={cvName}
              onChange={(e) => setCvName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              autoFocus
              className="rounded border border-brand-300 px-2 py-1 text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 hover:text-brand-600"
            >
              {cvName}
              <Pencil className="h-3 w-3 text-zinc-400" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVersionPanelOpen(!versionPanelOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <Clock className="h-3.5 w-3.5" />
            History
          </button>
          <Link
            href="/cv/compare"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare
          </Link>
          <button className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Editor */}
        <div className="flex w-1/2 flex-col border-r border-zinc-200 bg-white">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
              <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                <Tabs.List className="flex border-b border-zinc-200">
                  {sectionOrder.map((tab) => (
                    <SortableTab key={tab} id={tab} activeTab={activeTab} onSelect={setActiveTab} />
                  ))}
                </Tabs.List>
              </SortableContext>
            </DndContext>

            <div className="flex-1 overflow-y-auto p-5">
              <Tabs.Content value="summary">
                <SummaryEditor
                  value={cv.summary}
                  onChange={(v) => setCv({ ...cv, summary: v })}
                />
              </Tabs.Content>

              <Tabs.Content value="experience">
                <ExperienceEditor
                  entries={cv.experience}
                  onChange={(exp) => setCv({ ...cv, experience: exp })}
                />
              </Tabs.Content>

              <Tabs.Content value="skills">
                <SkillsEditor
                  skills={cv.skills}
                  onChange={(s) => setCv({ ...cv, skills: s })}
                />
              </Tabs.Content>

              <Tabs.Content value="education">
                <EducationEditor education={cv.education} />
              </Tabs.Content>

              <Tabs.Content value="certifications">
                <CertificationsEditor certs={cv.certifications} />
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="flex w-1/2 flex-col bg-zinc-100">
          {/* Template selector + customize */}
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">Template:</span>
              {templateOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    template === t.id
                      ? "bg-brand-600 text-white"
                      : "bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/cv/templates"
                className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-500 hover:bg-white hover:text-zinc-700"
              >
                <LayoutGrid className="h-3 w-3" />
                Gallery
              </Link>
              <button
                onClick={() => setCustomizeOpen(!customizeOpen)}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  customizeOpen
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-zinc-200 text-zinc-500 hover:bg-white hover:text-zinc-700"
                }`}
              >
                <Palette className="h-3 w-3" />
                Customize
              </button>
            </div>
          </div>

          {/* Customization panel */}
          {customizeOpen && (
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="flex items-start gap-6">
                {/* Font */}
                <div>
                  <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    <Type className="h-3 w-3" /> Font
                  </label>
                  <div className="mt-1.5 flex gap-1">
                    {fontOptions.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFont(f.id)}
                        className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                          font === f.id
                            ? "bg-brand-600 text-white"
                            : "bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    <Palette className="h-3 w-3" /> Accent Color
                  </label>
                  <div className="mt-1.5 flex gap-1.5">
                    {accentColors.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setAccentColor(c.id)}
                        title={c.label}
                        className={`h-6 w-6 rounded-full border-2 transition-transform ${
                          accentColor === c.id
                            ? "scale-110 border-zinc-800"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Spacing */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    Spacing
                  </label>
                  <div className="mt-1.5 flex gap-1">
                    {spacingOptions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSpacing(s.id)}
                        className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                          spacing === s.id
                            ? "bg-brand-600 text-white"
                            : "bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paper preview */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto aspect-[8.5/11] w-full max-w-[560px] rounded bg-white shadow-lg">
              <CVPreview cv={cv} template={template} />
            </div>
          </div>
        </div>

        {/* Version History Panel */}
        {versionPanelOpen && (
          <div className="w-72 shrink-0 border-l border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                Version History
              </h3>
              <button
                onClick={() => setVersionPanelOpen(false)}
                className="rounded p-1 hover:bg-zinc-100"
              >
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>
            <div className="space-y-1 p-2">
              {mockVersions.map((v) => (
                <button
                  key={v.id}
                  className="w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-50"
                >
                  <p className="text-sm font-medium text-zinc-900">{v.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{v.date}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{v.summary}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sortable Tab ---
function SortableTab({ id, activeTab, onSelect }: { id: string; activeTab: string; onSelect: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isActive = activeTab === id;

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(id)}
      className={`flex items-center gap-1 border-b-2 px-4 py-3 text-sm font-medium capitalize transition-colors ${
        isActive
          ? "border-brand-500 text-brand-700"
          : "border-transparent text-zinc-500 hover:text-zinc-700"
      }`}
    >
      <GripVertical
        className="h-3 w-3 cursor-grab text-zinc-300 hover:text-zinc-500"
        {...attributes}
        {...listeners}
      />
      {id}
    </button>
  );
}

// --- Section Editors ---

function SummaryEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">
          Professional Summary
        </h3>
        <AIButton label="Improve with AI" />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="mt-3 w-full rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <button className="mt-1 text-xs text-brand-500 hover:text-brand-600">
        Why this wording?
      </button>
    </div>
  );
}

// Mock AI suggestions for bullets
const aiSuggestions: Record<string, string> = {
  "Led migration from Angular to Next.js 14, serving 2M monthly users with 40% improved LCP":
    "Spearheaded enterprise-scale migration from Angular to Next.js 14, delivering 40% LCP improvement and serving 2M+ monthly active users across 3 product verticals",
  "Built design system with 60+ components adopted by 3 product teams, reducing UI dev time by 40%":
    "Architected and shipped a 60+ component design system with full Storybook documentation and accessibility compliance, adopted by 3 product teams and reducing UI development cycles by 40%",
  "Implemented virtual scrolling for 100K+ row data tables, reducing memory usage by 60%":
    "Engineered high-performance virtual scrolling solution for data-intensive tables (100K+ rows), cutting memory consumption by 60% and eliminating UI jank",
};

function ExperienceEditor({
  entries,
  onChange,
}: {
  entries: typeof mockCV.experience;
  onChange: (e: typeof mockCV.experience) => void;
}) {
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);

  function handleAccept(entryIdx: number, bulletIdx: number, suggestion: string) {
    const updated = [...entries];
    const bullets = [...updated[entryIdx].bullets];
    bullets[bulletIdx] = { ...bullets[bulletIdx], text: suggestion };
    updated[entryIdx] = { ...updated[entryIdx], bullets };
    onChange(updated);
    setActiveSuggestion(null);
  }

  return (
    <div className="space-y-6">
      {entries.map((entry, idx) => (
        <div key={idx} className="rounded-lg border border-zinc-200 p-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={entry.company}
              onChange={(e) => {
                const updated = [...entries];
                updated[idx] = { ...entry, company: e.target.value };
                onChange(updated);
              }}
              placeholder="Company"
              className="rounded border border-zinc-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <input
              value={entry.title}
              onChange={(e) => {
                const updated = [...entries];
                updated[idx] = { ...entry, title: e.target.value };
                onChange(updated);
              }}
              placeholder="Title"
              className="rounded border border-zinc-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <input
              value={entry.start_date}
              placeholder="Start date"
              readOnly
              className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
            />
            <input
              value={entry.end_date}
              placeholder="End date"
              readOnly
              className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
            />
          </div>
          <div className="mt-3 space-y-2">
            {entry.bullets.map((bullet, bIdx) => {
              const key = `${idx}-${bIdx}`;
              const suggestion = aiSuggestions[bullet.text];
              const isActive = activeSuggestion === key;
              return (
                <div key={bIdx}>
                  <div className="flex items-start gap-2">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" />
                    <textarea
                      value={bullet.text}
                      rows={2}
                      className="flex-1 rounded border border-zinc-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      onChange={() => {}}
                    />
                    <button
                      onClick={() => suggestion && setActiveSuggestion(isActive ? null : key)}
                      className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors ${
                        isActive
                          ? "border-brand-400 bg-brand-50 text-brand-700"
                          : "border-brand-200 text-brand-600 hover:bg-brand-50"
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      AI
                    </button>
                  </div>
                  {/* AI Suggestion with Accept/Reject */}
                  {isActive && suggestion && (
                    <div className="ml-3.5 mt-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                            AI Suggestion
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-emerald-900">
                            {suggestion}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handleAccept(idx, bIdx, suggestion)}
                          className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          <Check className="h-3 w-3" />
                          Accept
                        </button>
                        <button
                          onClick={() => setActiveSuggestion(null)}
                          className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                        >
                          <X className="h-3 w-3" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button className="mt-2 flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600">
            <Plus className="h-3 w-3" /> Add bullet
          </button>
        </div>
      ))}
      <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 py-3 text-sm text-zinc-500 hover:border-brand-400 hover:text-brand-600">
        <Plus className="h-4 w-4" /> Add experience
      </button>
    </div>
  );
}

function SkillsEditor({
  skills,
  onChange,
}: {
  skills: Record<string, string[]>;
  onChange: (s: typeof skills) => void;
}) {
  return (
    <div className="space-y-4">
      {Object.entries(skills).map(([category, items]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold uppercase text-zinc-400">
            {category}
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {items.map((skill) => (
              <span
                key={skill}
                className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700"
              >
                {skill}
                <button className="ml-0.5 text-zinc-400 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button className="rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-400 hover:border-brand-400 hover:text-brand-500">
              <Plus className="inline h-3 w-3" /> Add
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EducationEditor({ education }: { education: typeof mockCV.education }) {
  return (
    <div className="space-y-4">
      {education.map((edu, idx) => (
        <div key={idx} className="rounded-lg border border-zinc-200 p-4">
          <input value={edu.institution} readOnly className="w-full text-sm font-medium text-zinc-900" />
          <p className="text-sm text-zinc-600">{edu.degree} — {edu.year}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {edu.highlights.map((h) => (
              <span key={h} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600">{h}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CertificationsEditor({ certs }: { certs: string[] }) {
  return (
    <div className="space-y-2">
      {certs.map((cert) => (
        <div key={cert} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5">
          <span className="text-sm text-zinc-700">{cert}</span>
        </div>
      ))}
      <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 py-2.5 text-sm text-zinc-500 hover:border-brand-400 hover:text-brand-600">
        <Plus className="h-4 w-4" /> Add certification
      </button>
    </div>
  );
}

// --- AI Button ---
function AIButton({ label, small }: { label: string; small?: boolean }) {
  return (
    <button
      className={`flex items-center gap-1 rounded-lg border border-brand-200 text-brand-600 transition-colors hover:bg-brand-50 ${
        small ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-xs"
      }`}
    >
      <Sparkles className={small ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </button>
  );
}

// --- Live CV Preview ---
function CVPreview({
  cv,
  template,
}: {
  cv: typeof mockCV;
  template: TemplateId;
}) {
  const templateStyles: Record<TemplateId, { text: string; border: string; font: string; align: string }> = {
    professional: { text: "text-zinc-800", border: "border-zinc-300", font: "", align: "text-center" },
    technical: { text: "text-blue-700", border: "border-blue-200", font: "font-mono", align: "text-left" },
    modern: { text: "text-brand-600", border: "border-brand-200", font: "", align: "text-center" },
    executive: { text: "text-slate-700", border: "border-slate-200", font: "font-serif", align: "text-center" },
    minimal: { text: "text-neutral-900", border: "border-neutral-200", font: "", align: "text-left" },
    creative: { text: "text-violet-700", border: "border-violet-200", font: "", align: "text-left" },
  };
  const ts = templateStyles[template];
  const accentColor = ts.text;
  const borderColor = ts.border;

  return (
    <div className={`relative p-8 text-[11px] leading-relaxed ${ts.font}`}>
      {template === "creative" && (
        <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l bg-violet-400" />
      )}
      {/* Header */}
      <div className={ts.align}>
        <h1 className={`text-lg font-bold ${accentColor}`}>
          {cv.contact.full_name}
        </h1>
        <p className="mt-0.5 text-[10px] text-zinc-500">
          {cv.contact.email} | {cv.contact.phone} | {cv.contact.location}
        </p>
        {cv.contact.linkedin_url && (
          <p className="text-[10px] text-zinc-400">
            {cv.contact.linkedin_url} | {cv.contact.github_url}
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4">
        <h2 className={`border-b ${borderColor} pb-0.5 text-xs font-bold uppercase tracking-wide ${accentColor}`}>
          Summary
        </h2>
        <p className="mt-1.5 text-zinc-700">{cv.summary}</p>
      </div>

      {/* Experience */}
      <div className="mt-3">
        <h2 className={`border-b ${borderColor} pb-0.5 text-xs font-bold uppercase tracking-wide ${accentColor}`}>
          Experience
        </h2>
        {cv.experience.map((exp, idx) => (
          <div key={idx} className="mt-2">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-zinc-800">{exp.title}</span>
              <span className="text-[10px] text-zinc-500">
                {exp.start_date} — {exp.end_date}
              </span>
            </div>
            <p className="text-zinc-600">
              {exp.company}, {exp.location}
            </p>
            <ul className="mt-1 space-y-0.5">
              {exp.bullets.map((b, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                  <span className="text-zinc-700">{b.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Skills */}
      <div className="mt-3">
        <h2 className={`border-b ${borderColor} pb-0.5 text-xs font-bold uppercase tracking-wide ${accentColor}`}>
          Skills
        </h2>
        <div className="mt-1.5 space-y-0.5">
          {Object.entries(cv.skills).map(([cat, items]) => (
            <p key={cat}>
              <span className="font-semibold text-zinc-700">{cat}: </span>
              <span className="text-zinc-600">{items.join(", ")}</span>
            </p>
          ))}
        </div>
      </div>

      {/* Education */}
      <div className="mt-3">
        <h2 className={`border-b ${borderColor} pb-0.5 text-xs font-bold uppercase tracking-wide ${accentColor}`}>
          Education
        </h2>
        {cv.education.map((edu, idx) => (
          <div key={idx} className="mt-1.5">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-zinc-800">{edu.degree}</span>
              <span className="text-[10px] text-zinc-500">{edu.year}</span>
            </div>
            <p className="text-zinc-600">{edu.institution}</p>
          </div>
        ))}
      </div>

      {/* Certifications */}
      {cv.certifications.length > 0 && (
        <div className="mt-3">
          <h2 className={`border-b ${borderColor} pb-0.5 text-xs font-bold uppercase tracking-wide ${accentColor}`}>
            Certifications
          </h2>
          <p className="mt-1.5 text-zinc-700">
            {cv.certifications.join(" | ")}
          </p>
        </div>
      )}
    </div>
  );
}
