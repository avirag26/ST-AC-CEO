"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth-storage";
import { useClientList } from "@/lib/useClientList";

type Mark = {
  id: string;
  studentId: string;
  subject: string;
  score: number | null;
  attendance: string | null;
  feedback: string | null;
  student: { fullName: string };
};

type Exam = {
  id: string;
  title: string;
  startsAt: string;
  tutorProfile: { user: { fullName: string } };
  subjects: { name: string; maxMarks: number }[];
  marks: Mark[];
};

type Options = {
  students: { id: string; fullName: string; className: string | null }[];
  tutors: { id: string; user: { fullName: string } }[];
  subjects: { name: string }[];
};

const selectClass =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary";

function message(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}

function ResultForm({
  mark,
  max,
  onSaved,
}: {
  mark: Mark;
  max: number;
  onSaved: () => void;
}) {
  const [attendance, setAttendance] = useState(mark.attendance ?? "PRESENT");
  const [score, setScore] = useState(
    mark.score == null ? "" : String(mark.score),
  );
  const [feedback, setFeedback] = useState(mark.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api.put("/exams/marks/" + mark.id, {
        attendance,
        ...(attendance === "PRESENT" ? { score: Number(score) } : {}),
        feedback,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-surface-muted p-4">
      <h3 className="font-semibold">
        {mark.student.fullName} · {mark.subject}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-text">
          Attendance
          <select
            className={selectClass + " mt-1.5"}
            value={attendance}
            onChange={(e) => {
              setAttendance(e.target.value);
              setSaved(false);
            }}
          >
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
          </select>
        </label>
        {attendance === "PRESENT" && (
          <TextField
            label={`Score (max ${max})`}
            type="number"
            step="0.01"
            min={0}
            max={max}
            required
            value={score}
            onChange={(e) => {
              setScore(e.target.value);
              setSaved(false);
            }}
          />
        )}
      </div>
      <label className="block text-sm font-medium text-text">
        Feedback
        <textarea
          className={selectClass + " mt-1.5 min-h-[88px] resize-y"}
          maxLength={2000}
          value={feedback}
          onChange={(e) => {
            setFeedback(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      {error ? <Alert variant="error">{error}</Alert> : null}
      {saved ? (
        <p role="status" className="text-sm text-success">
          Result saved.
        </p>
      ) : null}
      <Button type="submit" isLoading={busy}>
        Save result
      </Button>
    </form>
  );
}

type PeriodTab = "upcoming" | "history";

export default function ExamsPage() {
  const [role, setRole] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<PeriodTab>("upcoming");
  const [createOpen, setCreateOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [tutor, setTutor] = useState("");
  const [students, setStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [subjects, setSubjects] = useState([{ name: "", maxMarks: 100 }]);

  const manager = role === "CEO" || role === "ADMIN";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get<Exam[]>("/exams");
      setExams(data);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = getStoredUser();
    if (
      !user ||
      !["CEO", "ADMIN", "HOME_TUTOR", "OFFLINE_TUTOR", "PARENT"].includes(
        user.role,
      )
    ) {
      window.location.replace("/login");
      return;
    }
    setRole(user.role);
    void load();
    if (user.role === "CEO" || user.role === "ADMIN") {
      api
        .get<Options>("/exams/options")
        .then((r) => setOptions(r.data))
        .catch((e) => setError(message(e)));
    }
  }, [load]);

  const periodExams = useMemo(() => {
    const now = Date.now();
    return exams
      .filter((e) => (Date.parse(e.startsAt) > now) === (period === "upcoming"))
      .sort((a, b) =>
        period === "upcoming"
          ? Date.parse(a.startsAt) - Date.parse(b.startsAt)
          : Date.parse(b.startsAt) - Date.parse(a.startsAt),
      );
  }, [exams, period]);

  const getSearchText = useCallback(
    (exam: Exam) =>
      [
        exam.title,
        exam.tutorProfile.user.fullName,
        ...exam.subjects.map((s) => s.name),
      ].join(" "),
    [],
  );

  const list = useClientList({
    items: periodExams,
    getSearchText,
    filterKey: period,
    pageSize: 10,
  });

  function resetCreateForm() {
    setTitle("");
    setStartsAt("");
    setTutor("");
    setStudents([]);
    setStudentSearch("");
    setSubjects([{ name: "", maxMarks: 100 }]);
  }

  function openCreate() {
    resetCreateForm();
    setCreateOpen(true);
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await api.post("/exams", {
        title,
        startsAt: new Date(startsAt).toISOString(),
        tutorProfileId: tutor,
        subjects,
        studentIds: students,
      });
      resetCreateForm();
      setCreateOpen(false);
      setSuccess("Exam scheduled.");
      await load();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  const filteredStudents =
    options?.students.filter((s) =>
      (s.fullName + " " + (s.className ?? ""))
        .toLowerCase()
        .includes(studentSearch.toLowerCase()),
    ) ?? [];

  const headerDescription =
    role === "PARENT"
      ? "Exam timetable and results for your children."
      : manager
        ? "Schedule exams and record results."
        : "Exams assigned to you.";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams"
        description={headerDescription}
        action={
          <div className="flex flex-wrap gap-2">
            {manager ? (
              <Button type="button" onClick={openCreate}>
                Schedule exam
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <Tabs
        label="Exam period"
        value={period}
        onChange={setPeriod}
        items={[
          { id: "upcoming", label: "Upcoming" },
          { id: "history", label: "History" },
        ]}
      />

      <ListToolbar
        search={list.query}
        onSearchChange={list.setQuery}
        searchPlaceholder="Search by title, teacher, or subject…"
        resultLabel={
          loading
            ? "Loading…"
            : `${list.filteredCount} of ${list.totalCount} exams`
        }
        actions={
          <Button
            variant="secondary"
            isLoading={loading}
            onClick={() => void load()}
          >
            Refresh
          </Button>
        }
      />

      {loading ? (
        <Card>
          <p role="status" className="text-sm text-text-secondary">
            Loading exams…
          </p>
        </Card>
      ) : list.pageItems.length === 0 ? (
        <EmptyState
          title="No exams"
          description={
            manager
              ? "Schedule an exam to get started."
              : "Assigned exams will appear here."
          }
        />
      ) : (
        <div className="space-y-4">
          {list.pageItems.map((exam) => (
            <Card key={exam.id}>
              <p className="text-xs font-medium text-text-secondary">
                {new Date(exam.startsAt).toLocaleString()}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-text">
                {exam.title}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Teacher: {exam.tutorProfile.user.fullName}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {exam.subjects.map((s) => (
                  <span
                    key={s.name}
                    className="rounded-full bg-surface-muted px-3 py-1 text-xs text-text-secondary"
                  >
                    {s.name} · {s.maxMarks} marks
                  </span>
                ))}
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-primary">
                  {role === "PARENT"
                    ? "Results"
                    : "Roster & results"}
                </summary>
                <div className="mt-3 space-y-3">
                  {exam.marks.map((mark) => {
                    const max =
                      exam.subjects.find((s) => s.name === mark.subject)
                        ?.maxMarks ?? 100;
                    const canEdit =
                      role !== "PARENT" && Date.parse(exam.startsAt) <= Date.now();
                    return canEdit ? (
                      <ResultForm
                        key={mark.id}
                        mark={mark}
                        max={max}
                        onSaved={() => {}}
                      />
                    ) : (
                      <div
                        key={mark.id}
                        className="rounded-xl bg-surface-muted p-4"
                      >
                        <h3 className="font-medium text-text">
                          {mark.student.fullName} · {mark.subject}
                        </h3>
                        <p className="mt-2 text-sm text-text-secondary">
                          {mark.attendance === "ABSENT"
                            ? "Absent"
                            : mark.score == null
                              ? "No score recorded"
                              : `${mark.score} / ${max}`}
                        </p>
                        {mark.feedback ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                            {mark.feedback}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </details>
            </Card>
          ))}
          <Pagination
            page={list.page}
            totalPages={list.totalPages}
            totalItems={list.filteredCount}
            pageSize={list.pageSize}
            onPageChange={list.setPage}
          />
        </div>
      )}

      {manager ? (
        <Modal
          open={createOpen}
          onClose={() => {
            if (!busy) setCreateOpen(false);
          }}
          title="Schedule exam"
          size="xl"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="schedule-exam-form"
                isLoading={busy}
                disabled={students.length === 0 || !options}
              >
                Schedule exam
              </Button>
            </div>
          }
        >
          {!options ? (
            <p className="text-sm text-text-secondary">
              Exam options are loading. Close and try again.
            </p>
          ) : (
            <form id="schedule-exam-form" onSubmit={create} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Exam title"
                  required
                  minLength={2}
                  maxLength={150}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <TextField
                  label="Date and time"
                  required
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <label className="block text-sm font-medium text-text">
                Assigned teacher
                <select
                  required
                  className={selectClass + " mt-1.5"}
                  value={tutor}
                  onChange={(e) => setTutor(e.target.value)}
                >
                  <option value="">Choose a teacher</option>
                  {options.tutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-text">
                  Subjects and maximum marks
                </legend>
                {subjects.map((s, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_90px_auto] items-end gap-2"
                  >
                    <label className="text-sm font-medium text-text">
                      Subject
                      <select
                        required
                        className={selectClass + " mt-1.5"}
                        value={s.name}
                        onChange={(e) =>
                          setSubjects(
                            subjects.map((v, j) =>
                              j === i ? { ...v, name: e.target.value } : v,
                            ),
                          )
                        }
                      >
                        <option value="">Choose</option>
                        {options.subjects.map((sub) => (
                          <option key={sub.name} value={sub.name}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <TextField
                      label="Max"
                      required
                      type="number"
                      min={1}
                      max={1000}
                      value={String(s.maxMarks)}
                      onChange={(e) =>
                        setSubjects(
                          subjects.map((v, j) =>
                            j === i
                              ? { ...v, maxMarks: Number(e.target.value) }
                              : v,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove subject ${i + 1}`}
                      disabled={subjects.length === 1}
                      className="text-error"
                      onClick={() =>
                        setSubjects(subjects.filter((_, j) => j !== i))
                      }
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={subjects.length >= 20}
                  onClick={() =>
                    setSubjects([...subjects, { name: "", maxMarks: 100 }])
                  }
                >
                  Add subject
                </Button>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium text-text">
                  Students ({students.length} selected)
                </legend>
                <TextField
                  label="Find student"
                  type="search"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-border p-2">
                  {filteredStudents.map((s) => (
                    <label
                      key={s.id}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-surface-muted"
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={students.includes(s.id)}
                        onChange={(e) =>
                          setStudents(
                            e.target.checked
                              ? [...students, s.id]
                              : students.filter((id) => id !== s.id),
                          )
                        }
                      />
                      <span className="text-sm text-text">
                        {s.fullName}{" "}
                        <span className="text-text-secondary">
                          {s.className}
                        </span>
                      </span>
                    </label>
                  ))}
                  {options.students.length === 0 ? (
                    <p className="p-3 text-sm text-text-secondary">
                      Register students before creating an exam.
                    </p>
                  ) : null}
                </div>
              </fieldset>
            </form>
          )}
        </Modal>
      ) : null}
    </div>
  );
}
