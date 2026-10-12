"use client";

import { LoginForm } from "@/components/auth/LoginForm";

const highlights = [
  "Approve tutors before they can sign in",
  "Add classes and subjects for the whole academy",
  "Schedule sessions, exams, fees, and salaries",
];

export function AuthPanel() {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-surface lg:grid lg:min-h-dvh lg:grid-cols-2">
      <header className="shrink-0 bg-primary px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white lg:hidden">
        <p className="text-sm font-medium text-white/85">Straight Line Academy</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">CEO Portal</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85">
          Sign in with your phone number to manage the academy.
        </p>
      </header>

      <aside className="relative hidden overflow-hidden bg-primary text-white lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-14 xl:px-16 xl:py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #93c5fd 0%, transparent 42%), radial-gradient(circle at 85% 75%, #1d4ed8 0%, transparent 45%)",
          }}
        />

        <div className="relative z-10">
          <p className="text-sm font-medium tracking-wide text-white/85">
            Straight Line Academy
          </p>
          <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            CEO control center
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/90 xl:text-lg">
            One place to approve teachers, set up classes and subjects, and keep
            the academy running smoothly.
          </p>
        </div>

        <ul className="relative z-10 mt-12 space-y-4">
          {highlights.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm leading-relaxed text-white/95 xl:text-base"
            >
              <span
                className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-white"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>

        <p className="relative z-10 mt-10 text-sm text-white/70">
          CEO accounts are created by the academy setup — there is no public sign
          up.
        </p>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col lg:min-h-dvh lg:overflow-y-auto lg:bg-surface-muted">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col lg:max-w-2xl lg:px-10 lg:py-10 xl:px-14">
          <div className="mb-6 hidden lg:block">
            <h2 className="text-3xl font-semibold tracking-tight text-text">
              Sign in
            </h2>
            <p className="mt-2 text-base text-text-secondary">
              Use your CEO phone number and password to continue.
            </p>
          </div>

          <div className="relative z-10 -mt-3 px-4 lg:mt-0 lg:px-0">
            <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text-secondary lg:bg-surface">
              CEO access only. Teachers and parents use their own apps.
            </div>
          </div>

          <div className="mt-4 flex flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 lg:mt-6 lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:px-8 lg:py-8 lg:shadow-[var(--shadow-card)]">
            <LoginForm />
          </div>
        </div>
      </section>
    </div>
  );
}
