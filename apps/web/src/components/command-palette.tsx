"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  FileText,
  Kanban,
  Cloud,
  Users,
  Settings,
  Sun,
  Moon,
  Monitor,
  Command,
} from "lucide-react";
import { useTheme } from "./theme-provider";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string; // extra search terms
  section: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const { setTheme } = useTheme();

  // Define commands
  const commands = useMemo<CommandItem[]>(() => [
    // Navigation
    { id: "dashboard", label: "Go to Dashboard", icon: <LayoutDashboard size={16} />, action: () => router.push("/dashboard"), keywords: "home overview", section: "Navigation" },
    { id: "analyze", label: "Analyze JD", icon: <Search size={16} />, action: () => router.push("/analyze"), keywords: "job description match", section: "Navigation" },
    { id: "cv", label: "CV Builder", icon: <FileText size={16} />, action: () => router.push("/cv"), keywords: "resume tailor generate", section: "Navigation" },
    { id: "tracker", label: "Application Tracker", icon: <Kanban size={16} />, action: () => router.push("/tracker"), keywords: "applications jobs pipeline", section: "Navigation" },
    { id: "cloud", label: "Profile Cloud", icon: <Cloud size={16} />, action: () => router.push("/cloud"), keywords: "skills evidence depth", section: "Navigation" },
    { id: "network", label: "Network", icon: <Users size={16} />, action: () => router.push("/network"), keywords: "contacts connections", section: "Navigation" },
    { id: "settings", label: "Settings", icon: <Settings size={16} />, action: () => router.push("/settings"), keywords: "preferences account", section: "Navigation" },
    // Theme
    { id: "theme-light", label: "Switch to Light Mode", icon: <Sun size={16} />, action: () => setTheme("light"), keywords: "theme appearance", section: "Theme" },
    { id: "theme-dark", label: "Switch to Dark Mode", icon: <Moon size={16} />, action: () => setTheme("dark"), keywords: "theme appearance", section: "Theme" },
    { id: "theme-system", label: "Use System Theme", icon: <Monitor size={16} />, action: () => setTheme("system"), keywords: "theme auto", section: "Theme" },
  ], [router, setTheme]);

  // Filter commands by query
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.id.includes(q) ||
      (c.keywords ?? "").includes(q)
    );
  }, [commands, query]);

  // Group by section
  const sections = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push(item);
    }
    return map;
  }, [filtered]);

  // Clamp active index
  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(Math.max(0, filtered.length - 1));
  }, [filtered.length, activeIndex]);

  // Open/close with Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Save focus + restore on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-cmd-item]");
    items[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const execute = useCallback((item: CommandItem) => {
    setOpen(false);
    item.action();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) execute(filtered[activeIndex]);
    } else if (e.key === "Tab") {
      // Focus trap — keep focus within the palette
      e.preventDefault();
    }
  }, [filtered, activeIndex, execute]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        ref={dialogRef}
        className="fixed inset-x-4 top-[20vh] z-[101] mx-auto max-w-lg rounded-xl border border-surface-border bg-surface-0 shadow-2xl animate-enter overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-surface-border px-4 py-3">
          <Command size={16} className="text-surface-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-surface-text placeholder:text-surface-text-muted outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center rounded bg-surface-2 px-1.5 text-[10px] font-medium text-surface-text-muted">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[300px] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-surface-text-muted">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {Array.from(sections.entries()).map(([section, items]) => {
            const sectionStartIndex = filtered.indexOf(items[0]);
            return (
              <div key={section}>
                <p className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-surface-text-muted">
                  {section}
                </p>
                {items.map((item, i) => {
                  const globalIndex = sectionStartIndex + i;
                  const isActive = globalIndex === activeIndex;
                  return (
                    <button
                      key={item.id}
                      data-cmd-item
                      onClick={() => execute(item)}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                        isActive
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-700/10 dark:text-brand-300"
                          : "text-surface-text-secondary hover:bg-surface-2"
                      }`}
                    >
                      <span className={isActive ? "text-brand-500" : "text-surface-text-muted"}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-surface-border px-4 py-2 text-[10px] text-surface-text-muted">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded bg-surface-2 px-1 font-medium">&uarr;&darr;</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded bg-surface-2 px-1 font-medium">&crarr;</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded bg-surface-2 px-1 font-medium">esc</kbd>
            close
          </span>
        </div>
      </div>
    </>
  );
}
