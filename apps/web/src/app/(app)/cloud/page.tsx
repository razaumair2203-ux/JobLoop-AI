"use client";

import { useState } from "react";
import { Cloud, Filter } from "lucide-react";

// --- Mock Data ---
interface CloudNode {
  id: string;
  name: string;
  category: string;
  type: "skill" | "capability" | "domain";
  evidence_count: number;
  strength: "strong" | "related" | "gap";
  summary: string;
  niches: string[];
}

const mockNodes: CloudNode[] = [
  { id: "1", name: "TypeScript", category: "Languages", type: "skill", evidence_count: 5, strength: "strong", summary: "Used in all production projects since 2021. Strict mode, monorepo configs, DefinitelyTyped contributor.", niches: ["fintech", "devtools"] },
  { id: "2", name: "Python", category: "Languages", type: "skill", evidence_count: 3, strength: "related", summary: "Used for data scripts and automation. Django REST experience.", niches: [] },
  { id: "3", name: "Go", category: "Languages", type: "skill", evidence_count: 1, strength: "gap", summary: "Hackathon project only. Basic HTTP server and CLI tool.", niches: [] },
  { id: "4", name: "React", category: "Frameworks", type: "skill", evidence_count: 6, strength: "strong", summary: "4+ years production. Hooks, context, server components, concurrent features.", niches: ["saas", "fintech", "e-commerce"] },
  { id: "5", name: "Next.js", category: "Frameworks", type: "skill", evidence_count: 4, strength: "strong", summary: "Led Angular-to-Next.js 14 migration serving 2M users. App router, ISR, middleware.", niches: ["saas", "devtools"] },
  { id: "6", name: "Node.js", category: "Frameworks", type: "skill", evidence_count: 3, strength: "related", summary: "Express/Fastify APIs, background workers, WebSocket servers.", niches: [] },
  { id: "7", name: "AWS", category: "Infrastructure", type: "skill", evidence_count: 2, strength: "related", summary: "S3, CloudFront, Lambda. AWS Cloud Practitioner certified.", niches: [] },
  { id: "8", name: "Docker", category: "Infrastructure", type: "skill", evidence_count: 3, strength: "strong", summary: "Multi-stage builds, compose for local dev, optimized image sizes by 60%.", niches: ["devtools"] },
  { id: "9", name: "Kubernetes", category: "Infrastructure", type: "skill", evidence_count: 0, strength: "gap", summary: "No direct experience. Docker and CI/CD provide foundation.", niches: [] },
  { id: "10", name: "Technical Leadership", category: "Soft Skills", type: "capability", evidence_count: 4, strength: "strong", summary: "Led 3-person frontend pod. Mentored 2 juniors. Architecture decision records.", niches: ["saas"] },
  { id: "11", name: "Cross-team Collaboration", category: "Soft Skills", type: "capability", evidence_count: 3, strength: "strong", summary: "Design system adopted by 3 teams. Facilitated cross-team API contracts.", niches: [] },
  { id: "12", name: "E-commerce", category: "Domain", type: "domain", evidence_count: 2, strength: "related", summary: "Built checkout flows and product catalogs for DataFlow's retail clients.", niches: ["e-commerce"] },
];

const categories = [
  "All",
  "Languages",
  "Frameworks",
  "Infrastructure",
  "Soft Skills",
  "Domain",
];

const strengthColors = {
  strong: { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  related: { bar: "bg-sky-500", badge: "bg-sky-50 text-sky-700" },
  gap: { bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700" },
};

export default function CloudPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered =
    activeCategory === "All"
      ? mockNodes
      : mockNodes.filter((n) => n.category === activeCategory);

  const totalSkills = mockNodes.length;
  const strongCount = mockNodes.filter((n) => n.strength === "strong").length;
  const categoryCount = new Set(mockNodes.map((n) => n.category)).size;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Profile Cloud</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Your skills, backed by evidence
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 flex gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-3">
          <p className="text-2xl font-semibold text-zinc-900">{totalSkills}</p>
          <p className="text-xs text-zinc-500">Total skills</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-3">
          <p className="text-2xl font-semibold text-emerald-600">
            {strongCount}
          </p>
          <p className="text-xs text-zinc-500">Strong evidence</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-3">
          <p className="text-2xl font-semibold text-zinc-900">
            {categoryCount}
          </p>
          <p className="text-xs text-zinc-500">Categories</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex items-center gap-2">
        <Filter className="h-4 w-4 text-zinc-400" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-brand-50 text-brand-700"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Skill Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((node) => (
          <SkillCard key={node.id} node={node} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 flex flex-col items-center text-center">
          <Cloud className="h-12 w-12 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-500">
            No skills in this category
          </p>
        </div>
      )}
    </div>
  );
}

function SkillCard({ node }: { node: CloudNode }) {
  const colors = strengthColors[node.strength];
  const maxEvidence = 6;
  const barWidth = Math.min((node.evidence_count / maxEvidence) * 100, 100);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md hover:border-brand-200">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{node.name}</h3>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {node.category}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}>
          {node.strength === "strong"
            ? "Strong"
            : node.strength === "related"
              ? "Related"
              : "Gap"}
        </span>
      </div>

      {/* Evidence bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span>{node.evidence_count} evidence points</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${colors.bar} transition-all`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Summary */}
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-zinc-600">
        {node.summary}
      </p>

      {/* Niche pills */}
      {node.niches.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.niches.map((n) => (
            <span
              key={n}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500"
            >
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
