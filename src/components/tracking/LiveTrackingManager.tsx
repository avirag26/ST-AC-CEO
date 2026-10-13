"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, api } from "@/lib/api";

type FlowStep = {
  step: string;
  label: string;
  at: string | null;
  lat: number | null;
  lng: number | null;
  mapsUrl: string | null;
};

type TrackingItem = {
  sessionId: string;
  title: string | null;
  subjectName: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  step: string;
  tutor: { fullName: string; phone: string | null };
  student: {
    fullName: string;
    className: string | null;
    parentName: string;
  } | null;
  flow?: FlowStep[];
  eventCount?: number;
  leftHomeAt?: string | null;
  reachedAt?: string | null;
  classStartedAt?: string | null;
  location: {
    lat: number;
    lng: number;
    at: string | null;
    source: "live" | "checkpoint";
  } | null;
  mapsUrl: string | null;
};

type ListResponse = {
  updatedAt: string;
  count: number;
  items: TrackingItem[];
};

type DetailResponse = TrackingItem & {
  flow: FlowStep[];
  events: {
    id: string;
    kind: "CHECKPOINT" | "LIVE_PING";
    step: string;
    lat: number | null;
    lng: number | null;
    recordedAt: string;
    mapsUrl: string | null;
  }[];
};

type TabId = "live" | "history";

function stepLabel(step: string) {
  switch (step) {
    case "LEFT_HOME":
      return "Left home";
    case "REACHED":
      return "Reached student";
    case "CLASS_STARTED":
      return "Class started";
    case "STOPPED":
      return "Stopped";
    default:
      return step;
  }
}

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function LiveTrackingManager() {
  const [tab, setTab] = useState<TabId>("live");
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const path =
          tab === "live" ? "/tracking/live" : "/tracking/history";
        const { data: res } = await api.get<ListResponse>(path);
        setData(res);
      } catch (err) {
        setData(null);
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load tracking data.",
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    setExpandedId(null);
    setDetail(null);
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh || tab !== "live") return;
    const timer = window.setInterval(() => {
      void load(true);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load, tab]);

  async function toggleDetail(sessionId: string) {
    if (expandedId === sessionId) {
      setExpandedId(null);
      setDetail(null);
      setDetailError(null);
      return;
    }
    setExpandedId(sessionId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const { data: res } = await api.get<DetailResponse>(
        `/tracking/${sessionId}`,
      );
      setDetail(res);
    } catch (err) {
      setDetailError(
        err instanceof ApiError
          ? err.message
          : "Could not load journey history.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live tracking"
        description="Watch active home-tutor journeys and review full stored history (leave → reach → start → stop + GPS trail)."
      />

      <div
        className="grid grid-cols-2 gap-2"
        role="tablist"
        aria-label="Tracking views"
      >
        {(
          [
            { id: "live" as const, label: "Active now" },
            { id: "history" as const, label: "Journey history" },
          ] as const
        ).map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.id)}
              className={[
                "min-h-11 rounded-xl border px-3 text-sm font-semibold",
                selected
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-text hover:bg-surface-muted",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => void load()}>
          Refresh now
        </Button>
        {tab === "live" ? (
          <Button
            size="sm"
            variant={autoRefresh ? "primary" : "secondary"}
            onClick={() => setAutoRefresh((v) => !v)}
          >
            Auto-refresh {autoRefresh ? "on" : "off"}
          </Button>
        ) : null}
        {data ? (
          <p className="text-xs text-text-secondary">
            Updated {formatWhen(data.updatedAt)} · {data.count}{" "}
            {tab === "live" ? "active" : "recorded"}
          </p>
        ) : null}
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Alert variant="info">
        Every leave / reach / start / stop and live GPS ping is stored in the
        database. Active uses Redis when available; History always reads from
        DB.
      </Alert>

      {loading ? (
        <p className="text-sm text-text-secondary">Loading…</p>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title={tab === "live" ? "No active journeys" : "No journey history yet"}
          description={
            tab === "live"
              ? "When a home tutor leaves for a class, they will appear here."
              : "Completed and started journeys will appear here with the full flow."
          }
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => {
            const open = expandedId === item.sessionId;
            return (
              <Card key={item.sessionId} padding="sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-text">
                        {item.title || item.subjectName || "Online session"}
                      </p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {stepLabel(item.step)}
                      </span>
                      {item.location ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-success">
                          {item.location.source === "live"
                            ? "Live ping"
                            : "Checkpoint"}
                        </span>
                      ) : null}
                      {typeof item.eventCount === "number" ? (
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary">
                          {item.eventCount} GPS events
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-text-secondary">
                      Tutor: {item.tutor.fullName}
                      {item.tutor.phone ? ` · ${item.tutor.phone}` : ""}
                    </p>
                    {item.student ? (
                      <p className="text-sm text-text-secondary">
                        Student: {item.student.fullName}
                        {item.student.className
                          ? ` · ${item.student.className}`
                          : ""}
                        {" · "}Parent: {item.student.parentName}
                      </p>
                    ) : null}

                    {item.flow ? (
                      <ol className="mt-2 space-y-1 text-xs text-text-secondary">
                        {item.flow.map((step) => (
                          <li key={step.step}>
                            {step.label}: {formatWhen(step.at)}
                            {step.mapsUrl ? (
                              <>
                                {" · "}
                                <a
                                  href={step.mapsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary underline"
                                >
                                  map
                                </a>
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {item.mapsUrl ? (
                      <a
                        href={item.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary-dark"
                      >
                        Open map
                      </a>
                    ) : null}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void toggleDetail(item.sessionId)}
                    >
                      {open ? "Hide trail" : "Full trail"}
                    </Button>
                  </div>
                </div>

                {open ? (
                  <div className="mt-4 border-t border-border pt-4">
                    {detailLoading ? (
                      <p className="text-sm text-text-secondary">
                        Loading stored trail…
                      </p>
                    ) : detailError ? (
                      <p className="text-sm text-error" role="alert">
                        {detailError}
                      </p>
                    ) : detail ? (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-text">
                          Stored journey trail ({detail.events.length} events)
                        </p>
                        {detail.events.length === 0 ? (
                          <p className="text-sm text-text-secondary">
                            No GPS events stored yet for this session.
                          </p>
                        ) : (
                          <ul className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
                            {detail.events.map((event) => (
                              <li
                                key={event.id}
                                className="flex flex-wrap items-center justify-between gap-2 text-sm"
                              >
                                <div>
                                  <span className="font-medium text-text">
                                    {event.kind === "CHECKPOINT"
                                      ? "Checkpoint"
                                      : "Live ping"}
                                  </span>
                                  <span className="text-text-secondary">
                                    {" · "}
                                    {stepLabel(event.step)} ·{" "}
                                    {formatWhen(event.recordedAt)}
                                  </span>
                                  {typeof event.lat === "number" &&
                                  typeof event.lng === "number" ? (
                                    <span className="block text-xs text-text-secondary">
                                      {event.lat.toFixed(5)},{" "}
                                      {event.lng.toFixed(5)}
                                    </span>
                                  ) : null}
                                </div>
                                {event.mapsUrl ? (
                                  <a
                                    href={event.mapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-medium text-primary underline"
                                  >
                                    Map
                                  </a>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
