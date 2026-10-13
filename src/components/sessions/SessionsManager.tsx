"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { TextField } from "@/components/ui/TextField";
import { ApiError, api } from "@/lib/api";

type SessionMode = "ONLINE" | "OFFLINE";
type SessionStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";

type CatalogItem = { id: string; name: string; isActive: boolean };

type TutorOption = {
  tutorProfileId: string;
  fullName: string;
  phone: string | null;
};

type BatchOption = {
  id: string;
  name: string;
  isActive: boolean;
  classGrade: { name: string };
  studentCount: number;
  tutor: { tutorProfileId: string; fullName: string } | null;
};

type StudentOption = {
  id: string;
  fullName: string;
  className: string | null;
  parent: { fullName: string; email: string };
};

type SessionItem = {
  id: string;
  title: string | null;
  mode: SessionMode;
  status: SessionStatus;
  subjectName: string | null;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  tutor: {
    tutorProfileId: string;
    fullName: string;
    phone: string | null;
    role: string;
  };
  batch: { id: string; name: string; className: string } | null;
  student: {
    id: string;
    fullName: string;
    parentName: string;
  } | null;
};

function formatRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";
  return `${start.toLocaleString()} → ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function SessionsManager() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [tutors, setTutors] = useState<TutorOption[]>([]);

  const [mode, setMode] = useState<SessionMode>("OFFLINE");
  const [title, setTitle] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [tutorProfileId, setTutorProfileId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const { data } = await api.get<SessionItem[]>("/sessions");
      setSessions(data);
    } catch (error) {
      setSessions([]);
      setListError(
        error instanceof ApiError
          ? error.message
          : "Could not load sessions.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTutors = useCallback(async (nextMode: SessionMode) => {
    try {
      const { data } = await api.get<TutorOption[]>("/sessions/tutors", {
        params: { mode: nextMode },
      });
      setTutors(data);
    } catch {
      setTutors([]);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    void (async () => {
      try {
        const [subjectsRes, batchesRes, studentsRes] = await Promise.all([
          api.get<CatalogItem[]>("/catalog/subjects"),
          api.get<BatchOption[]>("/batches"),
          api.get<
            {
              id: string;
              fullName: string;
              className: string | null;
              parent: { fullName: string; email: string };
            }[]
          >("/students"),
        ]);
        setSubjects(
          subjectsRes.data.filter((s) => s.isActive).map((s) => s.name),
        );
        setBatches(batchesRes.data.filter((b) => b.isActive));
        setStudents(
          studentsRes.data.map((s) => ({
            id: s.id,
            fullName: s.fullName,
            className: s.className,
            parent: s.parent,
          })),
        );
      } catch {
        // dropdowns may stay empty
      }
    })();
  }, [loadSessions]);

  useEffect(() => {
    setTutorProfileId("");
    void loadTutors(mode);
  }, [mode, loadTutors]);

  const selectedBatch = batches.find((b) => b.id === batchId) ?? null;

  useEffect(() => {
    if (mode !== "OFFLINE" || !batchId) return;
    const batch = batches.find((b) => b.id === batchId);
    if (batch?.tutor?.tutorProfileId) {
      setTutorProfileId(batch.tutor.tutorProfileId);
    }
  }, [batchId, batches, mode]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!startsAt || !endsAt) {
      setFormError("Enter start and end times.");
      return;
    }
    if (!tutorProfileId) {
      setFormError("Select a tutor.");
      return;
    }
    if (mode === "OFFLINE" && !batchId) {
      setFormError("Offline sessions need a batch.");
      return;
    }
    if (mode === "OFFLINE" && selectedBatch && selectedBatch.studentCount === 0) {
      setFormError(
        "This batch has no enrolled students. Enroll students when registering them (Students → class + batch), or under Offline batches.",
      );
      return;
    }
    if (mode === "ONLINE" && !studentId) {
      setFormError("Online sessions need a student.");
      return;
    }

    setCreating(true);
    try {
      await api.post("/sessions", {
        mode,
        title: title.trim() || undefined,
        subjectName: subjectName || undefined,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        tutorProfileId,
        batchId: mode === "OFFLINE" ? batchId : undefined,
        studentId: mode === "ONLINE" ? studentId : undefined,
        notes: notes.trim() || undefined,
      });
      setTitle("");
      setSubjectName("");
      setStartsAt("");
      setEndsAt("");
      setBatchId("");
      setStudentId("");
      setNotes("");
      setSuccess("Session scheduled.");
      await loadSessions();
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Could not schedule session.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleCancel(id: string) {
    setCancellingId(id);
    setSuccess(null);
    setListError(null);
    try {
      await api.patch(`/sessions/${id}`, { status: "CANCELLED" });
      setSuccess("Session cancelled.");
      await loadSessions();
    } catch (error) {
      setListError(
        error instanceof ApiError
          ? error.message
          : "Could not cancel session.",
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule sessions"
        description="Create online home sessions or offline center sessions and assign a teacher."
      />

      {success ? <Alert variant="success">{success}</Alert> : null}

      <Card>
        <h2 className="text-base font-semibold text-text">New session</h2>
        <form onSubmit={handleCreate} className="mt-5 space-y-4" noValidate>
          {formError ? <Alert variant="error">{formError}</Alert> : null}

          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { id: "OFFLINE", label: "Offline (center / batch)" },
                { id: "ONLINE", label: "Online (home tutor)" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setMode(option.id);
                  setBatchId("");
                  setStudentId("");
                }}
                className={[
                  "min-h-11 rounded-xl border px-3 text-sm font-semibold",
                  mode === option.id
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-text hover:bg-surface-muted",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="title"
              label="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Math revision"
            />

            <div className="flex w-full flex-col gap-1.5">
              <label
                htmlFor="subjectName"
                className="text-sm font-medium text-text"
              >
                Subject (optional)
              </label>
              <select
                id="subjectName"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary"
              >
                <option value="">Select subject</option>
                {subjects.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <TextField
              name="startsAt"
              label="Starts at"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
            <TextField
              name="endsAt"
              label="Ends at"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />

            {mode === "OFFLINE" ? (
              <div className="flex w-full flex-col gap-1.5 sm:col-span-2">
                <label
                  htmlFor="batchId"
                  className="text-sm font-medium text-text"
                >
                  Batch
                </label>
                <select
                  id="batchId"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary"
                >
                  <option value="">Select batch</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.classGrade.name} — {batch.name} (
                      {batch.studentCount} students)
                    </option>
                  ))}
                </select>
                {selectedBatch ? (
                  <p
                    className={[
                      "text-sm",
                      selectedBatch.studentCount === 0
                        ? "text-warning"
                        : "text-text-secondary",
                    ].join(" ")}
                  >
                    {selectedBatch.studentCount === 0
                      ? "No students in this batch yet. Assign class + batch when registering the student (Students), or enroll under Offline batches."
                      : `${selectedBatch.studentCount} student${selectedBatch.studentCount === 1 ? "" : "s"} in this batch.`}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex w-full flex-col gap-1.5 sm:col-span-2">
                <label
                  htmlFor="studentId"
                  className="text-sm font-medium text-text"
                >
                  Student
                </label>
                <select
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary"
                  required
                >
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName}
                      {student.className ? ` · ${student.className}` : ""}
                      {" · "}
                      {student.parent.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex w-full flex-col gap-1.5 sm:col-span-2">
              <label
                htmlFor="tutorProfileId"
                className="text-sm font-medium text-text"
              >
                Assign tutor
              </label>
              <select
                id="tutorProfileId"
                value={tutorProfileId}
                onChange={(e) => setTutorProfileId(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary"
              >
                <option value="">Select tutor</option>
                {tutors.map((tutor) => (
                  <option key={tutor.tutorProfileId} value={tutor.tutorProfileId}>
                    {tutor.fullName}
                    {tutor.phone ? ` · ${tutor.phone}` : ""}
                  </option>
                ))}
              </select>
              {tutors.length === 0 ? (
                <p className="text-xs text-text-secondary">
                  No approved{" "}
                  {mode === "ONLINE" ? "home" : "offline"} tutors yet.
                </p>
              ) : null}
            </div>

            <TextField
              name="notes"
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="sm:col-span-2"
            />
          </div>

          <Button type="submit" isLoading={creating}>
            Schedule session
          </Button>
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">Scheduled sessions</h2>
        {listError ? <Alert variant="error">{listError}</Alert> : null}
        {loading ? (
          <p className="text-sm text-text-secondary">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Schedule an online or offline session above."
          />
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id} padding="sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-text">
                        {session.title ||
                          session.subjectName ||
                          `${session.mode === "ONLINE" ? "Online" : "Offline"} session`}
                      </p>
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-primary">
                        {session.mode}
                      </span>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          session.status === "SCHEDULED"
                            ? "bg-emerald-50 text-success"
                            : session.status === "CANCELLED"
                              ? "bg-error-bg text-error"
                              : "bg-surface-muted text-text-secondary",
                        ].join(" ")}
                      >
                        {session.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {formatRange(session.startsAt, session.endsAt)}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      Tutor: {session.tutor.fullName}
                      {session.batch
                        ? ` · Batch: ${session.batch.className} — ${session.batch.name}`
                        : ""}
                      {session.student
                        ? ` · Student: ${session.student.fullName}`
                        : ""}
                    </p>
                  </div>
                  {session.status === "SCHEDULED" ? (
                    <Button
                      size="sm"
                      variant="dangerOutline"
                      onClick={() => handleCancel(session.id)}
                      isLoading={cancellingId === session.id}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
