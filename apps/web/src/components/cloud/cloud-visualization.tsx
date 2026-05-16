"use client";

import { useState, useRef, useLayoutEffect, useCallback } from "react";
import { Layers, GitBranch, Inbox } from "lucide-react";
import { IdentityCard } from "./identity-card";
import { DepthView } from "./depth-view";
import { CareerPath } from "./career-path";
import type { CloudData } from "./types";

interface CloudVisualizationProps {
  data: CloudData;
  animate?: boolean;
}

type TabId = "depth" | "career";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "depth", label: "Skills & Evidence", icon: <Layers size={16} /> },
  { id: "career", label: "Career Path", icon: <GitBranch size={16} /> },
];

export function CloudVisualization({ data, animate = true }: CloudVisualizationProps) {
  const [activeTab, setActiveTab] = useState<TabId>("depth");

  // Empty state
  if (!data.nodes || data.nodes.length === 0) {
    return (
      <div className="text-center py-16 text-surface-text-muted">
        <Inbox size={48} className="mx-auto mb-4 text-surface-text-muted" />
        <p className="text-lg font-medium text-surface-text-secondary">No profile data yet</p>
        <p className="text-sm mt-1 text-surface-text-muted">Upload a CV to build your Profile Cloud.</p>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent, tabId: TabId) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const currentIndex = TABS.findIndex(t => t.id === tabId);
      const nextIndex = e.key === "ArrowRight"
        ? (currentIndex + 1) % TABS.length
        : (currentIndex - 1 + TABS.length) % TABS.length;
      setActiveTab(TABS[nextIndex].id);
      const tabEl = document.getElementById(`cloud-tab-${TABS[nextIndex].id}`);
      tabEl?.focus();
    }
  };

  // Measure tab button positions for precise underline
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

  const updateUnderline = useCallback(() => {
    const activeIndex = TABS.findIndex(t => t.id === activeTab);
    const el = tabRefs.current[activeIndex];
    if (el) {
      setUnderline({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab]);

  useLayoutEffect(() => {
    updateUnderline();
  }, [updateUnderline]);

  return (
    <div className="space-y-6">
      {/* Identity Card */}
      <IdentityCard
        identity={data.identity}
        stats={data.stats}
        roles={data.trajectory.roles}
        nodes={data.nodes}
        animate={animate}
      />

      {/* Tab Navigation — Linear-style underline indicator */}
      <div className="relative" role="tablist" aria-label="Profile views">
        <div className="flex border-b border-surface-border">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[i] = el; }}
              id={`cloud-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`cloud-tabpanel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              className={`flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium transition-colors duration-150 focus-ring ${
                activeTab === tab.id
                  ? "text-surface-text"
                  : "text-surface-text-muted hover:text-surface-text-secondary"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        {/* Sliding underline — width matches actual button, not container percentage */}
        <div
          className="absolute bottom-0 h-[2px] bg-brand-500 transition-all duration-300 ease-out"
          style={{
            left: `${underline.left}px`,
            width: `${underline.width}px`,
          }}
        />
      </div>

      {/* Tab Content — both panels stay mounted, hidden via display to preserve state without layout shift */}
      <div
        id="cloud-tabpanel-depth"
        role="tabpanel"
        aria-labelledby="cloud-tab-depth"
        hidden={activeTab !== "depth"}
      >
        <DepthView nodes={data.nodes} />
      </div>

      <div
        id="cloud-tabpanel-career"
        role="tabpanel"
        aria-labelledby="cloud-tab-career"
        hidden={activeTab !== "career"}
      >
        <CareerPath roles={data.trajectory.roles} />
      </div>
    </div>
  );
}
