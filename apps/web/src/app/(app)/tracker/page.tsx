"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Table2,
  Kanban,
  Plus,
  X,
  FileText,
  Mail,
  Star,
  Lightbulb,
  Loader2,
  FolderOpen,
} from "lucide-react";

// --- Types ---
type Stage = "saved" | "analyzing" | "ready_to_apply" | "applied";
type Outcome = "pending" | "callback" | "interview" | "offer" | "closed" | "ghosted";

interface Application {
  id: string;
  company: string;
  role: string;
  stage: Stage;
  outcome: Outcome | null;
  source: string;
  source_url: string | null;
  applied_date: string | null;
  created_at: string;
  position: { label: string; score: number } | null;
  match_analysis: {
    gaps: string[];
    strengths: string[];
    bridge_strategies: string[];
    recommendation_level: string;
  } | null;
  notes: string | null;
  excitement: number | null;
}

interface Pattern {
  gap: string;
  count: number;
  message: string;
}

interface TrackerData {
  applications: Application[];
  patterns: Pattern[];
  stats: { total: number; applied: number; interviews: number; offers: number };
}

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
  closed: { label: "Closed", color: "bg-zinc-100 text-zinc-400" },
  ghosted: { label: "Ghosted", color: "bg-zinc-50 text-zinc-400" },
};

const kanbanColumns = [
  { key: "saved", label: "Saved", border: "border-l-zinc-400" },
  { key: "applied", label: "Applied", border: "border-l-blue-500" },
  { key: "interview", label: "Interview", border: "border-l-amber-500" },
  { key: "offer", label: "Offer", border: "border-l-emerald-500" },
  { key: "closed", label: "Closed", border: "border-l-zinc-300" },
];

export default function TrackerPage() {
  const [view, setView] = useState<"table" | "board">("table");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [data, setData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function updateApp(appId: string, updates: Record<string, unknown>) {
    const res = await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await fetchData();
      if (selectedApp?.id === appId) {
        const updated = data?.applications.find((a) => a.id === appId);
        if (updated) setSelectedApp({ ...updated, ...updates } as Application);
      }
    }
  }

  const apps = data?.applications ?? [];
  const patterns = data?.patterns ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Pattern Insights */}
      {patterns.length > 0 && (
        <div className="mb-6 space-y-2">
          {patterns.map((p) => (
            <div
              key={p.gap}
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
            >
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">{p.message}</p>
                <Link
                  href="/cloud"
                  className="mt-1 text-xs font-medium text-amber-700 hover:text-amber-800"
                >
                  View your Cloud profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-zinc-400" />
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Applications</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {apps.length} application{apps.length !== 1 ? "s" : ""} tracked
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
        {apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16">
            <FolderOpen className="h-10 w-10 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-500">No applications yet</p>
            <p className="mt-1 text-xs text-zinc-400">
              Paste a job description to get started
            </p>
            <Link
              href="/analyze"
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Analyze a JD
            </Link>
          </div>
        ) : view === "table" ? (
          <TableView apps={apps} onSelect={setSelectedApp} onExcitementChange={(id, r) => updateApp(id, { excitement: r })} />
        ) : (
          <KanbanView apps={apps} onSelect={setSelectedApp} />
        )}
      </div>

      {selectedApp && (
        <DetailPanel
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdate={updateApp}
        />
      )}
    </div>
  );
}

// --- Company Initial ---
function CompanyInitial({ company }: { company: string }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-500">
      {company[0]?.toUpperCase() ?? "?"}
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
  apps: Application[];
  onSelect: (a: Application) => void;
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
            <th className="px-4 py-3 font-medium text-zinc-500">Date</th>
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
                  <CompanyInitial company={app.company} />
                  <span className="font-medium text-zinc-900">
                    {app.company}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-600">{app.role}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stageConfig[app.stage]?.color ?? "bg-zinc-100 text-zinc-500"}`}>
                  {stageConfig[app.stage]?.label ?? app.stage}
                </span>
              </td>
              <td className="px-4 py-3">
                {app.outcome && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${outcomeConfig[app.outcome]?.color ?? "bg-zinc-100 text-zinc-500"}`}>
                    {outcomeConfig[app.outcome]?.label ?? app.outcome}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <ExcitementStars
                  rating={app.excitement ?? 0}
                  onChange={(r) => onExcitementChange(app.id, r)}
                />
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {app.applied_date
                  ? new Date(app.applied_date).toLocaleDateString()
                  : new Date(app.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Kanban Card ---
function KanbanCard({
  app,
  border,
  onSelect,
}: {
  app: Application;
  border: string;
  onSelect: (a: Application) => void;
}) {
  return (
    <button
      onClick={() => onSelect(app)}
      className={`w-full rounded-lg border-l-3 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md ${border}`}
    >
      <div className="flex items-center gap-2">
        <CompanyInitial company={app.company} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900">{app.company}</p>
          <p className="truncate text-xs text-zinc-500">{app.role}</p>
        </div>
      </div>
      {app.position && (
        <p className="mt-1.5 text-xs text-zinc-400">{app.position.label}</p>
      )}
    </button>
  );
}

// --- Kanban View ---
function KanbanView({
  apps,
  onSelect,
}: {
  apps: Application[];
  onSelect: (a: Application) => void;
}) {
  function getColumnApps(key: string) {
    if (key === "closed")
      return apps.filter((a) => a.outcome === "closed" || a.outcome === "ghosted");
    if (key === "interview")
      return apps.filter((a) => a.outcome === "interview" || a.outcome === "callback");
    if (key === "offer") return apps.filter((a) => a.outcome === "offer");
    if (key === "applied")
      return apps.filter((a) => a.stage === "applied" && (!a.outcome || a.outcome === "pending"));
    return apps.filter(
      (a) => a.stage === "saved" || a.stage === "ready_to_apply" || a.stage === "analyzing"
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {kanbanColumns.map((col) => {
        const colApps = getColumnApps(col.key);
        return (
          <div key={col.key} className="w-64 shrink-0 rounded-xl bg-zinc-50 p-3">
            <div className="flex items-center justify-between px-1 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {col.label}
              </h3>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-200 px-1.5 text-xs font-medium text-zinc-600">
                {colApps.length}
              </span>
            </div>
            <div className="space-y-2">
              {colApps.map((app) => (
                <KanbanCard key={app.id} app={app} border={col.border} onSelect={onSelect} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Detail Panel ---
function DetailPanel({
  app,
  onClose,
  onUpdate,
}: {
  app: Application;
  onClose: () => void;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
}) {
  const [notes, setNotes] = useState(app.notes ?? "");

  const posColors: Record<string, string> = {
    "Strong position": "bg-emerald-50 text-emerald-700",
    Competitive: "bg-sky-50 text-sky-700",
    Stretch: "bg-amber-50 text-amber-700",
  };

  const strengths = app.match_analysis?.strengths ?? [];
  const gaps = app.match_analysis?.gaps ?? [];
  const bridges = app.match_analysis?.bridge_strategies ?? [];

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[400px] border-l border-zinc-200 bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-200 p-5">
            <div className="flex items-center gap-3">
              <CompanyInitial company={app.company} />
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">{app.company}</h2>
                <p className="text-sm text-zinc-500">{app.role}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-zinc-100">
              <X className="h-5 w-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Position */}
            {app.position && (
              <div>
                <label className="text-xs font-medium uppercase text-zinc-400">
                  Position Assessment
                </label>
                <div className="mt-1.5">
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${posColors[app.position.label] || "bg-zinc-100 text-zinc-600"}`}>
                    {app.position.label}
                  </span>
                </div>
              </div>
            )}

            {/* Priority */}
            <div>
              <label className="text-xs font-medium uppercase text-zinc-400">Priority</label>
              <div className="mt-1.5">
                <ExcitementStars
                  rating={app.excitement ?? 0}
                  onChange={(r) => onUpdate(app.id, { excitement: r })}
                  size="md"
                />
              </div>
            </div>

            {/* Outcome */}
            <div>
              <label className="text-xs font-medium uppercase text-zinc-400">Outcome</label>
              <div className="mt-1.5">
                <select
                  value={app.outcome ?? "pending"}
                  onChange={(e) => onUpdate(app.id, { outcome: e.target.value })}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 focus:border-brand-500 focus:outline-none"
                >
                  {Object.entries(outcomeConfig).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Strengths */}
            {strengths.length > 0 && (
              <div>
                <label className="text-xs font-medium uppercase text-zinc-400">Strengths</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {strengths.map((s) => (
                    <span key={s} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Gaps */}
            {gaps.length > 0 && (
              <div>
                <label className="text-xs font-medium uppercase text-zinc-400">Gaps to Address</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {gaps.map((g) => (
                    <span key={g} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bridge Strategies */}
            {bridges.length > 0 && (
              <div>
                <label className="text-xs font-medium uppercase text-zinc-400">Bridge Strategies</label>
                <ul className="mt-1.5 space-y-1.5">
                  {bridges.map((b, i) => (
                    <li key={i} className="text-xs text-zinc-600">{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs font-medium uppercase text-zinc-400">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => {
                  if (notes !== (app.notes ?? "")) {
                    onUpdate(app.id, { notes });
                  }
                }}
                rows={3}
                placeholder="Add notes..."
                className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-zinc-200 p-5 space-y-2">
            <Link
              href={`/cv?app=${app.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              <FileText className="h-4 w-4" />
              Generate CV
            </Link>
            <Link
              href={`/cv/cover-letter?app=${app.id}`}
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
