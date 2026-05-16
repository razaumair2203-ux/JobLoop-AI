"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";

const NAV_SHORTCUTS: Record<string, string> = {
  "1": "/dashboard",
  "2": "/analyze",
  "3": "/cv",
  "4": "/tracker",
  "5": "/cloud",
  "6": "/network",
};

interface AppShellProps {
  user: { email: string; fullName: string; avatarUrl: string | null };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileOpen]);

  // Focus trap for mobile sidebar — Tab cycles within sidebar when open
  const sidebarRef = useRef<HTMLDivElement>(null);
  const handleSidebarKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !sidebarRef.current) return;
    const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // Keyboard shortcuts — number keys navigate (only when no input focused)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === "Escape") { setMobileOpen(false); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const href = NAV_SHORTCUTS[e.key];
      if (href) router.push(href);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Auto-focus first sidebar link when opened
  useEffect(() => {
    if (mobileOpen && sidebarRef.current) {
      const first = sidebarRef.current.querySelector<HTMLElement>('a[href]');
      first?.focus();
    }
  }, [mobileOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-1">
      {/* Skip to content — a11y (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none"
      >
        Skip to content
      </a>

      {/* ── Mobile top bar ── */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-3 border-b border-surface-border bg-surface-0/95 backdrop-blur-sm px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-surface-text-secondary hover:bg-surface-2 active:bg-surface-3 transition-colors focus-ring"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Image src="/parrot.jpg" alt="" width={22} height={22} className="rounded" />
        <span className="text-sm font-semibold text-surface-text">JobLoop</span>
      </header>

      {/* ── Backdrop (mobile only) ── */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar wrapper — focus trap when mobile open ── */}
      <div
        ref={sidebarRef}
        onKeyDown={mobileOpen ? handleSidebarKeyDown : undefined}
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 transform transition-transform duration-200 ease-out lg:relative lg:z-auto lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar user={user} />
      </div>

      {/* ── Main content ── */}
      <main id="main-content" className="flex-1 overflow-y-auto pt-12 lg:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
