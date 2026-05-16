"use client";

import { useState } from "react";
import {
  Search,
  MapPin,
  Building2,
  Briefcase,
  Star,
  ArrowRight,
  Sparkles,
  Filter,
} from "lucide-react";

type JobListing = {
  id: string;
  title: string;
  company: string;
  companyDomain: string;
  location: string;
  type: "remote" | "hybrid" | "onsite";
  matchScore: "strong" | "good" | "stretch";
  matchReason: string;
  posted: string;
  salary: string | null;
  skills: string[];
};

const mockJobs: JobListing[] = [
  {
    id: "1",
    title: "Senior Frontend Engineer",
    company: "Vercel",
    companyDomain: "vercel.com",
    location: "Remote",
    type: "remote",
    matchScore: "strong",
    matchReason: "Your Cloud shows deep React, Next.js, and design system evidence across 6+ years",
    posted: "2 days ago",
    salary: "$180k - $220k",
    skills: ["React", "Next.js", "TypeScript", "Vercel"],
  },
  {
    id: "2",
    title: "Frontend Platform Lead",
    company: "Stripe",
    companyDomain: "stripe.com",
    location: "San Francisco, CA",
    type: "hybrid",
    matchScore: "good",
    matchReason: "Strong frontend fundamentals. Payment domain experience would strengthen your position",
    posted: "5 days ago",
    salary: "$200k - $250k",
    skills: ["React", "TypeScript", "CI/CD", "Design Systems"],
  },
  {
    id: "3",
    title: "Staff Software Engineer, Web",
    company: "Figma",
    companyDomain: "figma.com",
    location: "San Francisco, CA",
    type: "hybrid",
    matchScore: "stretch",
    matchReason: "Strong foundations but staff-level requires distributed systems depth not yet evidenced",
    posted: "1 week ago",
    salary: "$220k - $280k",
    skills: ["TypeScript", "WebGL", "Performance", "Architecture"],
  },
  {
    id: "4",
    title: "Frontend Engineer II",
    company: "Notion",
    companyDomain: "notion.so",
    location: "New York, NY",
    type: "hybrid",
    matchScore: "strong",
    matchReason: "Your React expertise and editor/component library experience are a direct match",
    posted: "3 days ago",
    salary: "$160k - $200k",
    skills: ["React", "TypeScript", "Performance", "Collaboration"],
  },
];

const matchConfig = {
  strong: { label: "Strong match", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  good: { label: "Good match", bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  stretch: { label: "Stretch", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
};

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = mockJobs.filter((job) => {
    const matchesSearch =
      searchQuery === "" ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || job.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-text">Discover Jobs</h1>
          <p className="mt-1 text-sm text-surface-text-muted">
            Jobs matched to your Profile Cloud evidence
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
          <Sparkles className="h-3.5 w-3.5" />
          Powered by your Cloud
        </div>
      </div>

      {/* Search + filters */}
      <div className="mt-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-text-muted" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles, companies..."
            className="w-full rounded-lg border border-surface-border bg-surface-0 py-2.5 pl-10 pr-4 text-sm placeholder:text-surface-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-text-muted" />
          <input
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="Location"
            className="w-48 rounded-lg border border-surface-border bg-surface-0 py-2.5 pl-10 pr-4 text-sm placeholder:text-surface-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-surface-border bg-surface-2 p-0.5">
          {[
            { id: "all", label: "All" },
            { id: "remote", label: "Remote" },
            { id: "hybrid", label: "Hybrid" },
            { id: "onsite", label: "Onsite" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTypeFilter(opt.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === opt.id
                  ? "bg-surface-0 text-surface-text shadow-sm"
                  : "text-surface-text-muted hover:text-surface-text-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Job listings */}
      <div className="mt-6 space-y-3">
        {filtered.map((job) => {
          const match = matchConfig[job.matchScore];
          return (
            <div
              key={job.id}
              className="rounded-lg border border-surface-border bg-surface-0 p-5 transition-colors hover:border-surface-border"
            >
              <div className="flex items-start gap-4">
                <img
                  src={`https://img.logo.dev/${job.companyDomain}?token=pk_anonymous&size=64`}
                  alt={job.company}
                  className="h-10 w-10 rounded-lg border border-surface-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-surface-text">{job.title}</h3>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-surface-text-muted">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {job.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {job.location}
                        </span>
                        {job.salary && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" /> {job.salary}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${match.bg} ${match.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${match.dot}`} />
                        {match.label}
                      </span>
                      <span className="text-xs text-surface-text-muted">{job.posted}</span>
                    </div>
                  </div>

                  {/* Match reason */}
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-surface-2 p-2.5">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
                    <p className="text-xs text-surface-text-secondary">{job.matchReason}</p>
                  </div>

                  {/* Skills */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1">
                      {job.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-surface-text-secondary"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <button className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
                      Analyze
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
