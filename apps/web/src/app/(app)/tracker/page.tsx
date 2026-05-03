"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table2,
  Kanban,
  Plus,
  X,
  FileText,
  Mail,
  Star,
  Clock,
  ArrowRight,
  MessageSquare,
  Send,
  GripVertical,
  ChevronDown,
  FolderOpen,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- Types ---
type Stage = "saved" | "analyzing" | "ready_to_apply" | "applied";
type Outcome = "pending" | "callback" | "interview" | "offer" | "rejected" | "ghosted";

interface Activity {
  id: string;
  type: "stage_change" | "outcome_update" | "note" | "cv_generated" | "applied";
  text: string;
  date: string;
}

interface MockApp {
  id: string;
  company: string;
  role: string;
  stage: Stage;
  outcome: Outcome;
  source: string;
  applied_date: string | null;
  position_label: string;
  strengths: string[];
  gaps: string[];
  notes: string;
  excitement: number; // 1-5 stars
  activities: Activity[];
}

// Company logo via logo.dev (free tier)
function companyLogoUrl(company: string) {
  const domain: Record<string, string> = {
    Stripe: "stripe.com",
    Vercel: "vercel.com",
    Linear: "linear.app",
    Supabase: "supabase.com",
    Figma: "figma.com",
    Notion: "notion.so",
  };
  const d = domain[company];
  if (!d) return null;
  return `https://img.logo.dev/${d}?token=pk_anonymous&size=64`;
}

const mockApps: MockApp[] = [
  { id: "1", company: "Stripe", role: "Senior Frontend Engineer", stage: "applied", outcome: "interview", source: "linkedin", applied_date: "Apr 28, 2026", position_label: "Strong position", strengths: ["React", "TypeScript", "Performance"], gaps: ["Payments API"], notes: "Recruiter reached out first", excitement: 5, activities: [
    { id: "a1", type: "stage_change", text: "Moved to Applied", date: "Apr 28" },
    { id: "a2", type: "outcome_update", text: "Interview scheduled", date: "May 1" },
    { id: "a3", type: "cv_generated", text: "Tailored CV generated", date: "Apr 27" },
  ]},
  { id: "2", company: "Vercel", role: "Staff Engineer, DX", stage: "applied", outcome: "pending", source: "company_site", applied_date: "Apr 30, 2026", position_label: "Competitive", strengths: ["Next.js", "DX", "OSS"], gaps: ["Rust/Turbopack"], notes: "", excitement: 4, activities: [
    { id: "a4", type: "applied", text: "Application submitted", date: "Apr 30" },
    { id: "a5", type: "cv_generated", text: "Tailored CV generated", date: "Apr 29" },
  ]},
  { id: "3", company: "Linear", role: "Frontend Engineer", stage: "ready_to_apply", outcome: "pending", source: "referral", applied_date: null, position_label: "Strong position", strengths: ["React", "Design Systems", "Performance"], gaps: [], notes: "Friend works there", excitement: 5, activities: [
    { id: "a6", type: "stage_change", text: "Analysis complete — Ready to apply", date: "Apr 29" },
    { id: "a7", type: "note", text: "Asked Jake for referral", date: "Apr 28" },
  ]},
  { id: "4", company: "Supabase", role: "Full Stack Engineer", stage: "applied", outcome: "offer", source: "linkedin", applied_date: "Apr 20, 2026", position_label: "Competitive", strengths: ["TypeScript", "React", "PostgreSQL"], gaps: ["Elixir"], notes: "Great culture fit", excitement: 4, activities: [
    { id: "a8", type: "outcome_update", text: "Offer received!", date: "May 1" },
    { id: "a9", type: "outcome_update", text: "Final round interview", date: "Apr 28" },
    { id: "a10", type: "applied", text: "Application submitted", date: "Apr 20" },
  ]},
  { id: "5", company: "Figma", role: "Software Engineer, Canvas", stage: "applied", outcome: "rejected", source: "company_site", applied_date: "Apr 15, 2026", position_label: "Stretch", strengths: ["React", "Performance"], gaps: ["C++", "WebGL"], notes: "", excitement: 3, activities: [
    { id: "a11", type: "outcome_update", text: "Closed — role filled internally", date: "Apr 29" },
    { id: "a12", type: "applied", text: "Application submitted", date: "Apr 15" },
  ]},
  { id: "6", company: "Notion", role: "Frontend Engineer", stage: "saved", outcome: "pending", source: "other", applied_date: null, position_label: "Competitive", strengths: ["React", "TypeScript"], gaps: ["Block editor"], notes: "Interesting role", excitement: 3, activities: [
    { id: "a13", type: "stage_change", text: "Saved to tracker", date: "Apr 25" },
  ]},
];

const stageConfig: Record<Stage, { label: string; color: string }> = {
  saved: { label: "Saved", color: "bg-zinc-100 text-zinc-600" },
  analyzing: { label: "Analyzing", color: "bg-blue-50 text-blue-600" },
  ready_to_apply: { label: "Ready", color: "bg-amber-50 text-amber-600" },
  applied: { label: "Applied", color: "bg-emerald-50 text-emerald-600" },
};

const outcomeConfig: Record<Outcome, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-zinc-100 text-zinc-500" },
  callback: { label: "Callback", color: "bg-sky-50 text-sky-600" },
  interview: { label: "Interview", color: "bg-blue-50 text-blue-600" },
  offer: { label: "Offer", color: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Closed", color: "bg-zinc-100 text-zinc-400 line-through" },
  ghosted: { label: "Ghosted", color: "bg-zinc-50 text-zinc-400" },
};

const kanbanColumns = [
  { key: "saved", label: "Saved", border: "border-l-zinc-400" },
  { key: "applied", label: "Applied", border: "border-l-blue-500" },
  { key: "interview", label: "Interview", border: "border-l-amber-500" },
  { key: "offer", label: "Offer", border: "border-l-emerald-500" },
  { key: "closed", label: "Closed", border: "border-l-zinc-300" },
];

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  stage_change: ArrowRight,
  outcome_update: MessageSquare,
  note: FileText,
  cv_generated: FileText,
  applied: Send,
};

const mockBoards = [
  { id: "all", name: "All Applications", count: 6 },
  { id: "frontend", name: "Frontend Roles", count: 4 },
  { id: "fullstack", name: "Full-Stack Campaign", count: 2 },
];

export default function TrackerPage() {
  const [view, setView] = useState<"table" | "board">("table");
  const [selectedApp, setSelectedApp] = useState<MockApp | null>(null);
  const [apps, setApps] = useState(mockApps);
  const [activeBoard, setActiveBoard] = useState("all");
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);

  function handleExcitementChange(appId: string, rating: number) {
    setApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, excitement: rating } : a))
    );
    if (selectedApp?.id === appId) {
      setSelectedApp((prev) => prev ? { ...prev, excitement: rating } : prev);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Board selector */}
          <div className="relative">
            <button
              onClick={() => setBoardMenuOpen(!boardMenuOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              {mockBoards.find((b) => b.id === activeBoard)?.name}
              <ChevronDown className="h-3 w-3" />
            </button>
            {boardMenuOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                {mockBoards.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { setActiveBoard(b.id); setBoardMenuOpen(false); }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50 ${
                      activeBoard === b.id ? "bg-brand-50 text-brand-700" : "text-zinc-700"
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className="text-xs text-zinc-400">{b.count}</span>
                  </button>
                ))}
                <div className="border-t border-zinc-100 px-3 py-2">
                  <button className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
                    <Plus className="h-3 w-3" /> New board
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Applications</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {apps.length} applications tracked
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "table"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "board"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Board
            </button>
          </div>
          <Link
            href="/analyze"
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            New
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {view === "table" ? (
          <TableView apps={apps} onSelect={setSelectedApp} onExcitementChange={handleExcitementChange} />
        ) : (
          <KanbanView apps={apps} onSelect={setSelectedApp} />
        )}
      </div>

      {selectedApp && (
        <DetailPanel
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onExcitementChange={handleExcitementChange}
        />
      )}
    </div>
  );
}

// --- Company Logo ---
function CompanyLogo({ company }: { company: string }) {
  const url = companyLogoUrl(company);
  if (url) {
    return (
      <img
        src={url}
        alt={company}
        className="h-8 w-8 rounded-lg object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
        }}
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-500">
      {company[0]}
    </div>
  );
}

// --- Excitement Stars ---
function ExcitementStars({
  rating,
  onChange,
  size = "sm",
}: {
  rating: number;
  onChange: (r: number) => void;
  size?: "sm" | "md";
}) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={(e) => {
            e.stopPropagation();
            onChange(star);
          }}
          className="p-0.5"
        >
          <Star
            className={`${iconSize} transition-colors ${
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : "text-zinc-300 hover:text-amber-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// --- Table View ---
function TableView({
  apps,
  onSelect,
  onExcitementChange,
}: {
  apps: MockApp[];
  onSelect: (a: MockApp) => void;
  onExcitementChange: (id: string, r: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-4 py-3 font-medium text-zinc-500">Company</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Role</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Stage</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Outcome</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Priority</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Applied</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => (
            <tr
              key={app.id}
              onClick={() => onSelect(app)}
              className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <CompanyLogo company={app.company} />
                  <span className="font-medium text-zinc-900">
                    {app.company}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-600">{app.role}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stageConfig[app.stage].color}`}>
                  {stageConfig[app.stage].label}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${outcomeConfig[app.outcome].color}`}>
                  {outcomeConfig[app.outcome].label}
                </span>
              </td>
              <td className="px-4 py-3">
                <ExcitementStars
                  rating={app.excitement}
                  onChange={(r) => onExcitementChange(app.id, r)}
                />
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {app.applied_date || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Sortable Kanban Card ---
function SortableCard({
  app,
  border,
  onSelect,
}: {
  app: MockApp;
  border: string;
  onSelect: (a: MockApp) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border-l-3 bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${border}`}
    >
      <div className="flex items-start justify-between">
        <button onClick={() => onSelect(app)} className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <CompanyLogo company={app.company} />
            <div>
              <p className="text-sm font-medium text-zinc-900">{app.company}</p>
              <p className="text-xs text-zinc-500">{app.role}</p>
            </div>
          </div>
        </button>
        <GripVertical
          className="h-4 w-4 cursor-grab text-zinc-300 hover:text-zinc-500"
          {...attributes}
          {...listeners}
        />
      </div>
      {app.applied_date && (
        <p className="mt-1.5 text-xs text-zinc-400">{app.applied_date}</p>
      )}
      <div className="mt-1.5">
        <ExcitementStars rating={app.excitement} onChange={() => {}} />
      </div>
    </div>
  );
}

// --- Kanban View ---
function KanbanView({
  apps,
  onSelect,
}: {
  apps: MockApp[];
  onSelect: (a: MockApp) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function getColumnApps(key: string) {
    if (key === "closed")
      return apps.filter(
        (a) => a.outcome === "rejected" || a.outcome === "ghosted"
      );
    if (key === "interview")
      return apps.filter((a) => a.outcome === "interview" || a.outcome === "callback");
    if (key === "offer") return apps.filter((a) => a.outcome === "offer");
    if (key === "applied")
      return apps.filter(
        (a) =>
          a.stage === "applied" &&
          a.outcome === "pending"
      );
    return apps.filter(
      (a) => a.stage === "saved" || a.stage === "ready_to_apply" || a.stage === "analyzing"
    );
  }

  function handleDragEnd(_event: DragEndEvent) {
    // In production: update app stage/outcome based on which column it was dropped in
    // For now, drag reorders within column only
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map((col) => {
          const colApps = getColumnApps(col.key);
          return (
            <div
              key={col.key}
              className="w-64 shrink-0 rounded-xl bg-zinc-50 p-3"
            >
              <div className="flex items-center justify-between px-1 pb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {col.label}
                </h3>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-200 px-1.5 text-xs font-medium text-zinc-600">
                  {colApps.length}
                </span>
              </div>
              <SortableContext
                items={colApps.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {colApps.map((app) => (
                    <SortableCard
                      key={app.id}
                      app={app}
                      border={col.border}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}

// --- Detail Panel ---
function DetailPanel({
  app,
  onClose,
  onExcitementChange,
}: {
  app: MockApp;
  onClose: () => void;
  onExcitementChange: (id: string, r: number) => void;
}) {
  const posColors: Record<string, string> = {
    "Strong position": "bg-emerald-50 text-emerald-700",
    Competitive: "bg-sky-50 text-sky-700",
    Stretch: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[400px] border-l border-zinc-200 bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-200 p-5">
            <div className="flex items-center gap-3">
              <CompanyLogo company={app.company} />
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {app.company}
                </h2>
                <p className="text-sm text-zinc-500">{app.role}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-zinc-100"
            >
              <X className="h-5 w-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Position */}
            <div>
              <label className="text-xs font-medium uppercase text-zinc-400">
                Position Assessment
              </label>
              <div className="mt-1.5">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${posColors[app.position_label] || "bg-zinc-100 text-zinc-600"}`}>
                  {app.position_label}
                </span>
              </div>
            </div>

            {/* Excitement */}
            <div>
              <label className="text-xs font-medium uppercase text-zinc-400">
                Priority
              </label>
              <div className="mt-1.5">
                <ExcitementStars
                  rating={app.excitement}
                  onChange={(r) => onExcitementChange(app.id, r)}
                  size="md"
                />
              </div>
            </div>

            {/* Stage & Outcome */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium uppercase text-zinc-400">
                  Stage
                </label>
                <div className="mt-1.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stageConfig[app.stage].color}`}>
                    {stageConfig[app.stage].label}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-zinc-400">
                  Outcome
                </label>
                <div className="mt-1.5">
                  <select
                    defaultValue={app.outcome}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 focus:border-brand-500 focus:outline-none"
                  >
                    {Object.entries(outcomeConfig).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Strengths & Gaps */}
            <div>
              <label className="text-xs font-medium uppercase text-zinc-400">
                Strengths
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {app.strengths.map((s) => (
                  <span key={s} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            {app.gaps.length > 0 && (
              <div>
                <label className="text-xs font-medium uppercase text-zinc-400">
                  Gaps to Address
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {app.gaps.map((g) => (
                    <span key={g} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Timeline */}
            <div>
              <label className="text-xs font-medium uppercase text-zinc-400">
                Activity
              </label>
              <div className="mt-2 space-y-3">
                {app.activities.map((activity) => {
                  const Icon = activityIcons[activity.type] || Clock;
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100">
                          <Icon className="h-3 w-3 text-zinc-500" />
                        </div>
                        <div className="mt-1 w-px flex-1 bg-zinc-200" />
                      </div>
                      <div className="pb-3">
                        <p className="text-sm text-zinc-700">{activity.text}</p>
                        <p className="text-xs text-zinc-400">{activity.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium uppercase text-zinc-400">
                Notes
              </label>
              <textarea
                defaultValue={app.notes}
                rows={3}
                placeholder="Add notes..."
                className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-zinc-200 p-5 space-y-2">
            <Link
              href="/cv"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              <FileText className="h-4 w-4" />
              Generate CV
            </Link>
            <Link
              href="/cv/cover-letter"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Mail className="h-4 w-4" />
              Write Cover Letter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
