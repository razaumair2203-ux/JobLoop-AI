"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Search,
  FileText,
  Kanban,
  Cloud,
  Users,
  LogOut,
  Command,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface SidebarProps {
  user: {
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, kbd: "1" },
  { href: "/analyze", label: "Analyze JD", icon: Search, kbd: "2" },
  { href: "/cv", label: "CV Builder", icon: FileText, kbd: "3" },
  { href: "/tracker", label: "Tracker", icon: Kanban, kbd: "4" },
  { href: "/cloud", label: "Profile Cloud", icon: Cloud, kbd: "5" },
  { href: "/network", label: "Network", icon: Users, kbd: "6" },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-surface-border bg-surface-0">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-surface-border px-5">
        <Image src="/parrot.jpg" alt="JobLoop" width={28} height={28} className="rounded" />
        <Link href="/dashboard" className="text-lg font-bold text-surface-text focus-ring">
          JobLoop
        </Link>
      </div>

      {/* Command palette trigger */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-surface-border bg-surface-1 px-3 py-1.5 text-xs text-surface-text-muted transition-colors hover:bg-surface-2 hover:text-surface-text-secondary focus-ring"
        >
          <Search className="h-3 w-3" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3" aria-label="Main navigation">
        <ul className="space-y-0.5" role="list">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-all duration-150 focus-ring ${
                    isActive
                      ? "text-surface-text font-medium"
                      : "text-surface-text-secondary hover:bg-surface-2 hover:text-surface-text"
                  }`}
                >
                  {/* Active indicator pill */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-brand-500 animate-pill"
                      aria-hidden="true"
                    />
                  )}
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded-md bg-surface-2 dark:bg-surface-3 -z-10"
                      aria-hidden="true"
                    />
                  )}
                  <item.icon className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                    isActive ? "text-brand-500" : "group-hover:text-surface-text"
                  }`} />
                  <span className="flex-1">{item.label}</span>
                  <kbd className="hidden lg:inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-surface-2 px-1.5 text-[10px] font-medium text-surface-text-muted transition-opacity opacity-0 group-hover:opacity-100">
                    {item.kbd}
                  </kbd>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-surface-border p-4">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="h-8 w-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-700/20 dark:text-brand-300">
              {initials}
            </div>
          )}
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium text-surface-text">
              {user.fullName}
            </p>
            <p className="truncate text-xs text-surface-text-muted">{user.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-surface-text-secondary transition-all duration-150 hover:bg-surface-2 hover:text-surface-text press focus-ring"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
