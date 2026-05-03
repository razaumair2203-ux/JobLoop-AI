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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyze", label: "Analyze JD", icon: Search },
  { href: "/cv", label: "CV Builder", icon: FileText },
  { href: "/tracker", label: "Tracker", icon: Kanban },
  { href: "/cloud", label: "Profile Cloud", icon: Cloud },
  { href: "/network", label: "Network", icon: Users },
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
    <aside className="flex w-64 flex-col border-r border-surface-border bg-surface-0">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-surface-border px-5">
        <Image src="/parrot.jpg" alt="JobLoop" width={28} height={28} className="rounded" />
        <Link href="/dashboard" className="text-lg font-bold text-surface-text">
          JobLoop
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-300"
                  : "text-surface-text-secondary hover:bg-surface-2 hover:text-surface-text"
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive ? "text-brand-500" : ""}`} />
              {item.label}
            </Link>
          );
        })}
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700">
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
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-surface-text-secondary transition-colors hover:bg-surface-2 hover:text-surface-text"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
