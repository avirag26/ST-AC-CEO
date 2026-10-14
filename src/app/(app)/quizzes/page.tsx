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
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth-storage";
import { useClientList } from "@/lib/useClientList";

type Question = { prompt: string; options: string[]; correct?: number };

type Assignment = {
  id: string;
  student: { fullName: string };
  score: number | null;
  submittedAt: string | null;
};

type Quiz = {
  id: string;
  title: string;
  dueAt: string;
  questions: Question[];
  assignments: Assignment[];
};

function errorText(e: unknown) {
  return e instanceof Error ? e.message : "Please try again.";
}

function Attempt({
  quiz,
  assignment,
  reload,
}: {
  quiz: Quiz;
  assignment: Assignment;
  reload: () => void;
}) {
  const [answers, setAnswers] = useState<number[]>(
    quiz.questions.map(() => -1),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/quizzes/" + assignment.id + "/submit", { answers });
      reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-5">
      <p className="text-sm text-text-secondary">
        Complete this quiz for {assignment.student.fullName}. You can submit
        once.
      </p>
      {quiz.questions.map((q, i) => (
        <fieldset key={i} className="rounded-xl bg-surface-muted p-4">
          <legend className="px-1 font-medium text-text">
            {i + 1}. {q.prompt}
          </legend>
          <div className="space-y-2">
            {q.options.map((option, j) => (
              <label
                key={j}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg bg-surface p-3 text-sm"
              >
                <input
                  className="mt-0.5 h-5 w-5 shrink-0"
                  required
                  type="radio"
                  name={assignment.id + "-" + i}
                  checked={answers[i] === j}
                  onChange={() =>
                    setAnswers(
                      answers.map((v, index) => (index === i ? j : v)),
                    )
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Button
        type="submit"
        isLoading={busy}
        disabled={answers.some((a) => a < 0)}
      >
        Submit answers
      </Button>
    </form>
  );
}

export default function QuizzesPage() {
  const [parent, setParent] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [students, setStudents] = useState<
    { id: string; fullName: string; className: string | null }[]
  >([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [questions, setQuestions] = useState([
    { prompt: "", options: ["", "", "", ""], correct: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setQuizzes((await api.get<Quiz[]>("/quizzes")).data);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      window.location.replace("/login");
      return;
    }
    setParent(user.role === "PARENT");
    void load();
    if (user.role !== "PARENT") {
      api
        .get<typeof students>("/quizzes/students")
        .then((r) => setStudents(r.data))
        .catch((e) => setError(errorText(e)));
    }
  }, [load]);

  const matchesFilters = useCallback(
    (quiz: Quiz) => {
      if (statusFilter === "all") return true;
      const open = Date.parse(quiz.dueAt) >= Date.now();
      return statusFilter === "open" ? open : !open;
    },
    [statusFilter],
  );

  const getSearchText = useCallback(
    (quiz: Quiz) =>
      [
        quiz.title,
        ...quiz.assignments.map((a) => a.student.fullName),
      ].join(" "),
    [],
  );

  const list = useClientList({
    items: quizzes,
    getSearchText,
    matchesFilters,
    filterKey: statusFilter,
    pageSize: 10,
  });

  function resetCreate() {
    setSelected([]);
    setQuestions([{ prompt: "", options: ["", "", "", ""], correct: 0 }]);
  }

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/quizzes", {
        title: data.get("title"),
        dueAt: new Date(String(data.get("dueAt"))).toISOString(),
        studentIds: selected,
        questions,
      });
      setSuccess("Quiz published.");
      resetCreate();
      form.reset();
      setCreateOpen(false);
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const classNames = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.className).filter(Boolean)),
      ) as string[],
    [students],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quizzes"
        description={
          parent
            ? "Practice quizzes and scores for your children."
            : "Create and assign quizzes to students."
        }
        action={
          !parent ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create quiz
            </Button>
          ) : null
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <ListToolbar
        search={list.query}
        onSearchChange={list.setQuery}
        searchPlaceholder="Search by title or student…"
        filters={[
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "all", label: "All" },
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
            ],
          },
        ]}
        resultLabel={
          loading
            ? "Loading…"
            : `${list.filteredCount} of ${list.totalCount} quizzes`
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
            Loading quizzes…
          </p>
        </Card>
      ) : list.pageItems.length === 0 ? (
        <EmptyState title="No quizzes" description="Nothing matches your filters." />
      ) : (
        <div className="space-y-4">
          {list.pageItems.map((quiz) => {
            const open = Date.parse(quiz.dueAt) >= Date.now();
            return (
              <Card key={quiz.id}>
                <p className="text-xs font-medium text-text-secondary">
                  {open ? "Open" : "Closed"} · {quiz.questions.length}{" "}
                  questions
                </p>
                <h2 className="mt-1 text-lg font-semibold text-text">
                  {quiz.title}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Due {new Date(quiz.dueAt).toLocaleString()}
                </p>
                {quiz.assignments.map((a) => (
                  <details
                    key={a.id}
                    className="mt-4 rounded-xl border border-border p-4"
                  >
                    <summary className="cursor-pointer text-sm font-medium text-text">
                      {a.student.fullName} ·{" "}
                      {a.submittedAt
                        ? `${a.score} / ${quiz.questions.length}`
                        : "Not submitted"}
                    </summary>
                    {parent &&
                    !a.submittedAt &&
                    Date.parse(quiz.dueAt) >= Date.now() ? (
                      <Attempt
                        quiz={quiz}
                        assignment={a}
                        reload={() => void load()}
                      />
                    ) : (
                      <p className="mt-3 text-sm text-text-secondary">
                        {a.submittedAt
                          ? `Submitted ${new Date(a.submittedAt).toLocaleString()}`
                          : "Awaiting submission."}
                      </p>
                    )}
                  </details>
                ))}
              </Card>
            );
          })}
          <Pagination
            page={list.page}
            totalPages={list.totalPages}
            totalItems={list.filteredCount}
            pageSize={list.pageSize}
            onPageChange={list.setPage}
          />
        </div>
      )}

      {!parent ? (
        <Modal
          open={createOpen}
          onClose={() => {
            if (!busy) setCreateOpen(false);
          }}
          title="Create quiz"
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
                form="create-quiz-form"
                isLoading={busy}
                disabled={!selected.length}
              >
                Publish quiz
              </Button>
            </div>
          }
        >
          <form id="create-quiz-form" onSubmit={create} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="title"
                label="Quiz title"
                required
                minLength={2}
                maxLength={150}
              />
              <TextField
                name="dueAt"
                label="Deadline"
                required
                type="datetime-local"
              />
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-text">
                Students ({selected.length})
              </legend>
              {classNames.length > 0 ? (
                <div className="my-2 flex flex-wrap gap-2">
                  {classNames.map((name) => (
                    <Button
                      type="button"
                      key={name}
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setSelected(
                          Array.from(
                            new Set([
                              ...selected,
                              ...students
                                .filter((s) => s.className === name)
                                .map((s) => s.id),
                            ]),
                          ),
                        )
                      }
                    >
                      Select {name}
                    </Button>
                  ))}
                </div>
              ) : null}
              <div className="max-h-56 overflow-auto rounded-xl border border-border p-2">
                {students.map((s) => (
                  <label
                    key={s.id}
                    className="flex min-h-11 cursor-pointer items-center gap-3 p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={selected.includes(s.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, s.id]
                            : selected.filter((id) => id !== s.id),
                        )
                      }
                    />
                    {s.fullName} · {s.className}
                  </label>
                ))}
                {!students.length ? (
                  <p className="p-3 text-sm text-text-secondary">
                    No eligible students.
                  </p>
                ) : null}
              </div>
            </fieldset>
            {questions.map((q, i) => (
              <fieldset
                key={i}
                className="space-y-3 rounded-xl bg-surface-muted p-4"
              >
                <legend className="font-medium text-text">
                  Question {i + 1}
                </legend>
                <TextField
                  label="Question"
                  required
                  minLength={2}
                  maxLength={1000}
                  value={q.prompt}
                  onChange={(e) =>
                    setQuestions(
                      questions.map((v, j) =>
                        j === i ? { ...v, prompt: e.target.value } : v,
                      ),
                    )
                  }
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {q.options.map((option, k) => (
                    <TextField
                      key={k}
                      label={`Choice ${k + 1}`}
                      required
                      maxLength={300}
                      value={option}
                      onChange={(e) =>
                        setQuestions(
                          questions.map((v, j) =>
                            j === i
                              ? {
                                  ...v,
                                  options: v.options.map((o, n) =>
                                    n === k ? e.target.value : o,
                                  ),
                                }
                              : v,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
                <label className="block text-sm font-medium text-text">
                  Correct choice
                  <select
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base shadow-sm focus:border-primary"
                    value={q.correct}
                    onChange={(e) =>
                      setQuestions(
                        questions.map((v, j) =>
                          j === i
                            ? { ...v, correct: Number(e.target.value) }
                            : v,
                        ),
                      )
                    }
                  >
                    {q.options.map((_, k) => (
                      <option key={k} value={k}>
                        Choice {k + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-error"
                  disabled={questions.length === 1}
                  onClick={() =>
                    setQuestions(questions.filter((_, j) => j !== i))
                  }
                >
                  Remove question
                </Button>
              </fieldset>
            ))}
            <Button
              type="button"
              variant="secondary"
              disabled={questions.length >= 50}
              onClick={() =>
                setQuestions([
                  ...questions,
                  { prompt: "", options: ["", "", "", ""], correct: 0 },
                ])
              }
            >
              Add question
            </Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
