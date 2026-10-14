"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { api } from "@/lib/api";

type Session = { id: string; title: string | null; subjectName: string | null; startsAt: string; status: string };
type Overview = { students: number; pending: number; batches: number; sessions: Session[] };
const actions = [
  ["/students", "01", "Students & families", "Register students and manage their learning journey."],
  ["/tutors", "02", "Your teaching team", "Review applications and welcome new tutors."],
  ["/catalog", "03", "Learning catalog", "Organize your classes and subjects."],
  ["/batches", "04", "Classroom groups", "Bring students and teachers together."],
  ["/sessions", "05", "Session planner", "Plan lessons and keep the week running smoothly."],
  ["/tracking", "06", "Tutor journeys", "Follow active visits and review journey history."],
];

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [students, tutors, batches, sessions] = await Promise.all([
          api.get<unknown[]>("/students"), api.get<unknown[]>("/tutors", { params: { status: "PENDING" } }),
          api.get<{ isActive: boolean }[]>("/batches"), api.get<Session[]>("/sessions"),
        ]);
        if (active) setData({ students: students.data.length, pending: tutors.data.length,
          batches: batches.data.filter((batch) => batch.isActive).length, sessions: sessions.data });
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "We couldn't load your overview."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [revision]);
  const upcoming = data?.sessions.filter((s) => s.status === "SCHEDULED" && Date.parse(s.startsAt) >= Date.now())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)) ?? [];
  const metrics = [["Registered students", data?.students, "/students"], ["Awaiting approval", data?.pending, "/tutors"],
    ["Active batches", data?.batches, "/batches"], ["Upcoming sessions", data ? upcoming.length : undefined, "/sessions"]] as const;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your academy, at a glance</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">A great day to make progress.</h1>
          <p className="mt-3 text-text-secondary">Your people, your classes, and what comes next.</p></div>
        <Button variant="secondary" isLoading={loading} onClick={() => setRevision((v) => v + 1)}>Refresh overview</Button>
      </div>
      {error && <Alert variant="error">{error} Use Refresh overview to try again.</Alert>}
      <section aria-label="Academy summary" aria-busy={loading} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(([label, value, href]) => <Link href={href} key={label}><Card className="h-full hover:border-primary/40">
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">{loading ? "…" : error ? "—" : value}</p>
          <p className="mt-4 text-xs font-medium text-primary">View details →</p>
        </Card></Link>)}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div><h2 className="mb-4 text-lg font-semibold">Your workspace</h2>
          <div className="grid gap-3 sm:grid-cols-2">{actions.map(([href, number, title, description]) =>
            <Link href={href} key={href} className="group"><Card className="h-full transition-colors hover:border-primary/40">
              <span className="text-xs font-semibold tracking-widest text-primary">{number} /</span>
              <h3 className="mt-4 font-semibold group-hover:text-primary">{title} <span aria-hidden>↗</span></h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
            </Card></Link>)}</div>
        </div>
        <div><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Coming up</h2><Link href="/sessions" className="text-sm text-primary">View all →</Link></div>
          <Card><p className="mb-5 text-xs uppercase tracking-widest text-text-secondary">Next scheduled lessons</p>
            {loading ? <p role="status">Loading your schedule…</p> : error ? <p>Schedule unavailable. Please retry.</p> : upcoming.length ?
              <ul className="divide-y divide-border">{upcoming.slice(0, 5).map((s) => <li key={s.id} className="py-4 first:pt-0">
                <p className="text-xs font-semibold text-primary">{new Date(s.startsAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                <p className="mt-2 font-medium">{s.title || s.subjectName || "Class session"}</p>
              </li>)}</ul> : <div className="py-8"><h3 className="font-semibold">Room for your next lesson</h3><p className="mt-2 text-sm leading-6 text-text-secondary">No upcoming sessions yet. Schedule a class to get started.</p><Link href="/sessions" className="mt-5 inline-block font-medium text-primary">Plan a session →</Link></div>}
          </Card>
        </div>
      </section>
    </div>
  );
}
