"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { clearSession, type AuthUser } from "@/lib/auth-storage";

const navItems = [
  { href: "/resources", label: "Resources", hint: "Class notes & PDFs" },
  { href: "/quizzes", label: "Quizzes", hint: "Practice & scores" },
  { href: "/finance", label: "Fees & salaries", hint: "Balances & payment records" },
  { href: "/exams", label: "Exams & results", hint: "Timetable & progress" },
  { href: "/dashboard", label: "Dashboard", hint: "Overview" },
  { href: "/catalog", label: "Classes & Subjects", hint: "Catalog" },
  { href: "/tutors", label: "Tutor approvals", hint: "Pending reviews" },
  { href: "/students", label: "Students & parents", hint: "Create accounts" },
  { href: "/batches", label: "Offline batches", hint: "Groups & tutors" },
  { href: "/sessions", label: "Schedule sessions", hint: "Online & offline" },
  { href: "/tracking", label: "Live tracking", hint: "Home tutor journeys" },
];

type AppShellProps = {
  user: AuthUser;
  children: ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await api.post("/auth/logout");
    } catch {
      // Clear local session anyway.
    } finally {
      clearSession();
      router.replace("/login");
    }
  }

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[260px_1fr]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:p-3 focus:text-primary">Skip to main content</a>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/80 bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <p className="text-xs font-medium text-primary">Straight Line Academy</p>
          <p className="text-sm font-semibold text-text">CEO Portal</p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-surface text-text shadow-sm"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="text-lg" aria-hidden>
            {menuOpen ? "✕" : "☰"}
          </span>
        </button>
      </header>

      {menuOpen ? (
        <div className="border-b border-border bg-surface px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "min-h-11 rounded-xl px-3 py-2 text-sm font-medium",
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "text-text hover:bg-surface-muted",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 rounded-2xl border border-border bg-surface-muted p-3">
            <p className="text-sm font-medium text-text">{user.fullName}</p>
            <p className="text-xs text-text-secondary">{user.phone}</p>
            <Button
              variant="secondary"
              className="mt-3 w-full"
              onClick={handleSignOut}
              isLoading={signingOut}
            >
              Sign out
            </Button>
          </div>
        </div>
      ) : null}

      <aside className="hidden border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto lg:px-4 lg:py-6">
        <div className="rounded-2xl bg-[#17243b] px-4 py-5 text-white shadow-sm">
          <p className="text-sm font-medium text-white/85">Straight Line Academy</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">CEO Portal</h1>
          <p className="mt-2 text-sm text-white/80">
            Manage your academy from one place.
          </p>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Main">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-xl px-3 py-3 transition-colors",
                  active
                    ? "bg-blue-50 text-primary ring-1 ring-blue-100"
                    : "text-text-secondary hover:bg-surface-muted hover:text-text",
                )}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="mt-0.5 block text-xs opacity-80">{item.hint}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-border bg-surface-muted p-4">
          <p className="text-sm font-semibold text-text">{user.fullName}</p>
          <p className="mt-0.5 text-xs text-text-secondary">{user.phone}</p>
          <Button
            variant="secondary"
            className="mt-3 w-full"
            onClick={handleSignOut}
            isLoading={signingOut}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <main id="main-content" className="min-w-0">
        <div className="hidden items-center justify-between border-b border-border bg-white/80 px-8 py-4 lg:flex">
          <p className="text-sm text-text-secondary">Workspace <span className="mx-3 text-border">/</span> <span className="font-medium text-text">{navItems.find((item) => item.href === pathname)?.label ?? "Academy"}</span></p>
          <span className="flex items-center gap-3 text-sm font-medium"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-primary" aria-hidden>{user.fullName.slice(0, 1)}</span>{user.fullName}</span>
        </div>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
