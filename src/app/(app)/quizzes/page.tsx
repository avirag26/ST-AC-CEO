"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth-storage";
type Question = { prompt: string; options: string[]; correct?: number };
type Assignment = { id: string; student: { fullName: string }; score: number | null; submittedAt: string | null };
type Quiz = { id: string; title: string; dueAt: string; questions: Question[]; assignments: Assignment[] };
const field = "mt-1 min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-base";
const button = "min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const card = "rounded-2xl border border-border bg-white p-5 sm:p-6";
function errorText(e: unknown) { return e instanceof Error ? e.message : "Please try again."; }
function Attempt({ quiz, assignment, reload }: { quiz: Quiz; assignment: Assignment; reload: () => void }) {
  const [answers, setAnswers] = useState<number[]>(quiz.questions.map(() => -1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await api.post("/quizzes/" + assignment.id + "/submit", { answers }); reload(); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-4 space-y-5">
    <p className="text-sm text-text-secondary">Complete this quiz for {assignment.student.fullName}. Check every answer before submitting; you can submit once.</p>
    {quiz.questions.map((q, i) => <fieldset key={i} className="rounded-xl bg-surface-muted p-4"><legend className="px-1 font-medium">{i + 1}. {q.prompt}</legend><div className="space-y-2">{q.options.map((option, j) => <label key={j} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm"><input className="mt-0.5 h-5 w-5 shrink-0" required type="radio" name={assignment.id + "-" + i} checked={answers[i] === j} onChange={() => setAnswers(answers.map((v, index) => index === i ? j : v))} /><span>{option}</span></label>)}</div></fieldset>)}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}<button className={button} disabled={busy || answers.some((a) => a < 0)}>{busy ? "Submitting…" : "Submit final answers"}</button>
  </form>;
}
export default function QuizzesPage() {
  const [parent, setParent] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [students, setStudents] = useState<{ id: string; fullName: string; className: string | null }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [questions, setQuestions] = useState([{ prompt: "", options: ["", "", "", ""], correct: 0 }]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setQuizzes((await api.get<Quiz[]>("/quizzes")).data); }
    catch (e) { setError(errorText(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const user = getStoredUser(); if (!user) { window.location.replace("/login"); return; }
    setParent(user.role === "PARENT"); void load();
    if (user.role !== "PARENT") api.get<typeof students>("/quizzes/students").then((r) => setStudents(r.data)).catch((e) => setError(errorText(e)));
  }, [load]);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); setBusy(true); setError(""); setSuccess("");
    try { await api.post("/quizzes", { title: data.get("title"), dueAt: new Date(String(data.get("dueAt"))).toISOString(), studentIds: selected, questions }); setSuccess("Quiz published to the selected families."); setSelected([]); setQuestions([{ prompt: "", options: ["", "", "", ""], correct: 0 }]); form.reset(); await load(); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return <main className="min-h-dvh bg-background px-4 py-6 sm:px-6"><div className="mx-auto max-w-5xl space-y-6">
    <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm font-medium text-primary">← Back to dashboard</Link>
    <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">A little practice, every day</p><h1 className="mt-2 text-3xl font-semibold">Quizzes</h1><p className="mt-2 text-text-secondary">{parent ? "Help your child practise, then see their score." : "Create focused practice for your students."}</p></header>
    {error && <p role="alert" className="rounded-xl bg-error-bg p-4 text-error">{error}</p>}{success && <p role="status" className="rounded-xl bg-green-50 p-4 text-success">{success}</p>}
    <button className="min-h-11 rounded-xl border border-border bg-white px-4" disabled={loading} onClick={() => void load()}>Refresh quizzes</button>
    {!parent && <details className={card}><summary className="cursor-pointer font-semibold">Create a quiz</summary><form onSubmit={create} className="mt-5 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Quiz title<input name="title" required minLength={2} maxLength={150} className={field} /></label><label className="text-sm">Deadline<input name="dueAt" required type="datetime-local" className={field} /></label></div>
      <fieldset><legend className="font-medium">Choose students ({selected.length})</legend><p className="mt-1 text-sm text-text-secondary">Choose individuals or all students in a class.</p>
        <div className="my-2 flex flex-wrap gap-2">{Array.from(new Set(students.map((s) => s.className).filter(Boolean))).map((name) => <button type="button" key={name} className="min-h-11 rounded-xl border border-border px-3 text-sm" onClick={() => setSelected(Array.from(new Set([...selected, ...students.filter((s) => s.className === name).map((s) => s.id)])))}>Select {name}</button>)}</div>
        <div className="max-h-56 overflow-auto rounded-xl border border-border p-2">{students.map((s) => <label key={s.id} className="flex min-h-11 items-center gap-3 p-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={selected.includes(s.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, s.id] : selected.filter((id) => id !== s.id))} />{s.fullName} · {s.className}</label>)}{!students.length && <p className="p-3 text-sm">No eligible students. Tutors need assigned students or batches.</p>}</div>
      </fieldset>
      {questions.map((q, i) => <fieldset key={i} className="space-y-3 rounded-xl bg-surface-muted p-4"><legend className="font-medium">Question {i + 1}</legend><label className="block text-sm">Question<input className={field} required minLength={2} maxLength={1000} value={q.prompt} onChange={(e) => setQuestions(questions.map((v, j) => j === i ? { ...v, prompt: e.target.value } : v))} /></label>
        <div className="grid gap-3 sm:grid-cols-2">{q.options.map((option, k) => <label key={k} className="text-sm">Choice {k + 1}<input required maxLength={300} className={field} value={option} onChange={(e) => setQuestions(questions.map((v, j) => j === i ? { ...v, options: v.options.map((o, n) => n === k ? e.target.value : o) } : v))} /></label>)}</div>
        <label className="block text-sm">Correct choice<select className={field} value={q.correct} onChange={(e) => setQuestions(questions.map((v, j) => j === i ? { ...v, correct: Number(e.target.value) } : v))}>{q.options.map((_, k) => <option key={k} value={k}>Choice {k + 1}</option>)}</select></label>
        <button type="button" className="min-h-11 text-sm text-error disabled:opacity-40" disabled={questions.length === 1} onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>Remove question</button>
      </fieldset>)}
      <div className="flex flex-wrap gap-3"><button type="button" className="min-h-11 rounded-xl border border-border px-4 text-sm" disabled={questions.length >= 50} onClick={() => setQuestions([...questions, { prompt: "", options: ["", "", "", ""], correct: 0 }])}>+ Add question</button><button className={button} disabled={busy || !selected.length}>{busy ? "Publishing…" : "Publish quiz"}</button></div>
    </form></details>}
    {loading ? <p role="status" className={card}>Loading quizzes…</p> : !error && !quizzes.length ? <p className={card}>No quizzes yet. New practice will appear here.</p> : quizzes.map((quiz) => <article key={quiz.id} className={card}>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{Date.parse(quiz.dueAt) < Date.now() ? "Closed" : "Open"} · {quiz.questions.length} questions</p><h2 className="mt-2 text-xl font-semibold">{quiz.title}</h2><p className="mt-2 text-sm text-text-secondary">Due {new Date(quiz.dueAt).toLocaleString()}</p>
      {quiz.assignments.map((a) => <details key={a.id} className="mt-4 rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-medium">{a.student.fullName} · {a.submittedAt ? a.score + " / " + quiz.questions.length : "Not submitted"}</summary>{parent && !a.submittedAt && Date.parse(quiz.dueAt) >= Date.now() ? <Attempt quiz={quiz} assignment={a} reload={() => void load()} /> : <p className="mt-3 text-sm text-text-secondary">{a.submittedAt ? "Completed " + new Date(a.submittedAt).toLocaleString() : "Awaiting submission."}</p>}</details>)}
    </article>)}
  </div></main>;
}

