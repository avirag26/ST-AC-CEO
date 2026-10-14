"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";

type Session = {
  id: string;
  title: string | null;
  subjectName: string | null;
  startsAt: string;
  status: string;
};

type Overview = {
  students: number;
  pending: number;
  batches: number;
  sessions: Session[];
};

const links = [
  { href: "/students", label: "Students" },
  { href: "/tutors", label: "Tutors" },
  { href: "/catalog", label: "Classes & subjects" },
  { href: "/batches", label: "Batches" },
  { href: "/sessions", label: "Sessions" },
  { href: "/tracking", label: "Tracking" },
] as const;

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
          api.get<unknown[]>("/students"),
          api.get<unknown[]>("/tutors", { params: { status: "PENDING" } }),
          api.get<{ isActive: boolean }[]>("/batches"),
          api.get<Session[]>("/sessions"),
        ]);
        if (active) {
          setData({
            students: students.data.length,
            pending: tutors.data.length,
            batches: batches.data.filter((batch) => batch.isActive).length,
            sessions: sessions.data,
          });
        }
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error ? e.message : "Could not load dashboard.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [revision]);

  const upcoming =
    data?.sessions
      .filter(
        (s) =>
          s.status === "SCHEDULED" && Date.parse(s.startsAt) >= Date.now(),
      )
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)) ?? [];

  const metrics = [
    ["Students", data?.students, "/students"],
    ["Pending tutors", data?.pending, "/tutors"],
    ["Active batches", data?.batches, "/batches"],
    ["Upcoming sessions", data ? upcoming.length : undefined, "/sessions"],
  ] as const;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        action={
          <Button
            variant="secondary"
            isLoading={loading}
            onClick={() => setRevision((v) => v + 1)}
          >
            Refresh
          </Button>
        }
      />

      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : null}

      <section
        aria-label="Summary"
        aria-busy={loading}
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {metrics.map(([label, value, href]) => (
          <Link href={href} key={label}>
            <Card className="h-full hover:border-primary/40">
              <p className="text-sm text-text-secondary">{label}</p>
              <p className="mt-4 text-4xl font-semibold tabular-nums tracking-tight text-text">
                {loading ? "…" : error ? "—" : value}
              </p>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="mb-4 text-lg font-semibold text-text">Quick links</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {links.map(({ href, label }) => (
              <Link href={href} key={href} className="group">
                <Card className="h-full transition-colors hover:border-primary/40">
                  <h3 className="font-semibold text-text group-hover:text-primary">
                    {label}
                  </h3>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Upcoming sessions</h2>
            <Link href="/sessions" className="text-sm text-primary">
              All sessions
            </Link>
          </div>
          <Card>
            {loading ? (
              <p role="status" className="text-sm text-text-secondary">
                Loading…
              </p>
            ) : error ? (
              <p className="text-sm text-text-secondary">Unavailable.</p>
            ) : upcoming.length ? (
              <ul className="divide-y divide-border">
                {upcoming.slice(0, 5).map((s) => (
                  <li key={s.id} className="py-4 first:pt-0">
                    <p className="text-xs font-medium text-text-secondary">
                      {new Date(s.startsAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="mt-2 font-medium text-text">
                      {s.title || s.subjectName || "Session"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-4">
                <p className="text-sm text-text-secondary">No upcoming sessions.</p>
                <Link href="/sessions" className="mt-3 inline-block text-sm font-medium text-primary">
                  Sessions
                </Link>
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
