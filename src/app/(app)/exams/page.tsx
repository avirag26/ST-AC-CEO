"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth-storage";

type Mark = { id: string; studentId: string; subject: string; score: number | null; attendance: string | null; feedback: string | null; student: { fullName: string } };
type Exam = { id: string; title: string; startsAt: string; tutorProfile: { user: { fullName: string } }; subjects: { name: string; maxMarks: number }[]; marks: Mark[] };
type Options = { students: { id: string; fullName: string; className: string | null }[]; tutors: { id: string; user: { fullName: string } }[]; subjects: { name: string }[] };
const field = "mt-1 min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-base";
const primary = "min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
const card = "rounded-2xl border border-border bg-white p-5 sm:p-6";
function message(e: unknown) { return e instanceof Error ? e.message : "Something went wrong. Please try again."; }

function ResultForm({ mark, max, onSaved }: { mark: Mark; max: number; onSaved: () => void }) {
  const [attendance, setAttendance] = useState(mark.attendance ?? "PRESENT");
  const [score, setScore] = useState(mark.score == null ? "" : String(mark.score));
  const [feedback, setFeedback] = useState(mark.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setSaved(false);
    try {
      await api.put("/exams/marks/" + mark.id, { attendance, ...(attendance === "PRESENT" ? { score: Number(score) } : {}), feedback });
      setSaved(true); onSaved();
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-3 rounded-xl bg-surface-muted p-4">
    <h3 className="font-semibold">{mark.student.fullName} · {mark.subject}</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Attendance<select className={field} value={attendance} onChange={(e) => { setAttendance(e.target.value); setSaved(false); }}><option value="PRESENT">Present</option><option value="ABSENT">Absent</option></select></label>
      {attendance === "PRESENT" && <label className="text-sm">Score out of {max}<input className={field} type="number" step="0.01" min={0} max={max} required value={score} onChange={(e) => { setScore(e.target.value); setSaved(false); }} /></label>}
    </div>
    <label className="block text-sm">Feedback and areas to practise<textarea className={field} maxLength={2000} value={feedback} onChange={(e) => { setFeedback(e.target.value); setSaved(false); }} /></label>
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    {saved && <p role="status" className="text-sm text-success">Result saved.</p>}
    <button className={primary} disabled={busy}>{busy ? "Saving…" : "Save result"}</button>
  </form>;
}

export default function ExamsPage() {
  const [role, setRole] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("upcoming");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [tutor, setTutor] = useState("");
  const [students, setStudents] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [subjects, setSubjects] = useState([{ name: "", maxMarks: 100 }]);
  const manager = role === "CEO" || role === "ADMIN";
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const { data } = await api.get<Exam[]>("/exams"); setExams(data); }
    catch (e) { setError(message(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const user = getStoredUser();
    if (!user || !["CEO", "ADMIN", "HOME_TUTOR", "OFFLINE_TUTOR", "PARENT"].includes(user.role)) { window.location.replace("/login"); return; }
    setRole(user.role); void load();
    if (user.role === "CEO" || user.role === "ADMIN") {
      api.get<Options>("/exams/options").then((r) => setOptions(r.data)).catch((e) => setError(message(e)));
    }
  }, [load]);
  async function create(e: FormEvent) {
    e.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      await api.post("/exams", { title, startsAt: new Date(startsAt).toISOString(), tutorProfileId: tutor, subjects, studentIds: students });
      setTitle(""); setStudents([]); setSuccess("Exam scheduled. The assigned tutor and selected families can now see it."); await load();
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  const visible = exams.filter((e) => (Date.parse(e.startsAt) > Date.now()) === (tab === "upcoming")).sort((a, b) => tab === "upcoming" ? Date.parse(a.startsAt) - Date.parse(b.startsAt) : Date.parse(b.startsAt) - Date.parse(a.startsAt));
  return <main className="min-h-dvh bg-background px-4 py-6 sm:px-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm font-medium text-primary">← Back to dashboard</Link>
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Learning progress</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Exams & results</h1><p className="mt-2 text-text-secondary">{role === "PARENT" ? "Your children's timetable, results, and next steps." : "Plan assessments and turn results into useful feedback."}</p></div><button className="min-h-11 rounded-xl border border-border bg-white px-4" onClick={() => void load()} disabled={loading}>Refresh</button></header>
      {error && <p className="rounded-xl bg-error-bg p-4 text-error" role="alert">{error}</p>}
      {success && <p className="rounded-xl bg-green-50 p-4 text-success" role="status">{success}</p>}
      {manager && <details className={card}><summary className="cursor-pointer font-semibold">Schedule an exam</summary>
        {!options ? <p className="mt-4">Exam options are unavailable or loading. Refresh this page to retry.</p> : <form onSubmit={create} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Exam title<input required minLength={2} maxLength={150} className={field} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="text-sm">Date and time<input required type="datetime-local" className={field} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></label></div>
          <label className="block text-sm">Assigned teacher<select className={field} required value={tutor} onChange={(e) => setTutor(e.target.value)}><option value="">Choose a teacher</option>{options.tutors.map((t) => <option key={t.id} value={t.id}>{t.user.fullName}</option>)}</select></label>
          <fieldset className="space-y-3"><legend className="mb-2 font-medium">Subjects and maximum marks</legend>{subjects.map((s, i) => <div key={i} className="grid grid-cols-[1fr_90px_auto] items-end gap-2">
            <label className="text-sm">Subject<select required className={field} value={s.name} onChange={(e) => setSubjects(subjects.map((v, j) => j === i ? { ...v, name: e.target.value } : v))}><option value="">Choose</option>{options.subjects.map((s) => <option key={s.name}>{s.name}</option>)}</select></label>
            <label className="text-sm">Max marks<input required className={field} type="number" min={1} max={1000} value={s.maxMarks} onChange={(e) => setSubjects(subjects.map((v, j) => j === i ? { ...v, maxMarks: Number(e.target.value) } : v))} /></label>
            <button type="button" aria-label={"Remove subject " + (i + 1)} className="min-h-11 px-2 text-error disabled:opacity-30" disabled={subjects.length === 1} onClick={() => setSubjects(subjects.filter((_, j) => i !== j))}>×</button>
          </div>)}<button type="button" className="min-h-11 text-sm font-medium text-primary" disabled={subjects.length >= 20} onClick={() => setSubjects([...subjects, { name: "", maxMarks: 100 }])}>+ Add subject</button></fieldset>
          <fieldset><legend className="font-medium">Students ({students.length} selected)</legend><label className="mt-2 block text-sm">Find by student or class<input className={field} value={search} onChange={(e) => setSearch(e.target.value)} type="search" /></label>
            <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-border p-2">{options.students.filter((s) => (s.fullName + " " + s.className).toLowerCase().includes(search.toLowerCase())).map((s) => <label key={s.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-surface-muted"><input type="checkbox" className="h-5 w-5" checked={students.includes(s.id)} onChange={(e) => setStudents(e.target.checked ? [...students, s.id] : students.filter((id) => id !== s.id))} /><span className="text-sm">{s.fullName} <span className="text-text-secondary">{s.className}</span></span></label>)}{options.students.length === 0 && <p className="p-3 text-sm">Register students before creating an exam.</p>}</div>
          </fieldset><button className={primary} disabled={busy || students.length === 0}>{busy ? "Scheduling…" : "Schedule exam"}</button>
        </form>}
      </details>}
      <div className="flex gap-2" aria-label="Exam period">{["upcoming", "history"].map((value) => <button key={value} aria-pressed={tab === value} className={"min-h-11 rounded-full px-5 text-sm font-medium " + (tab === value ? "bg-primary text-white" : "border border-border bg-white")} onClick={() => setTab(value)}>{value === "upcoming" ? "Upcoming" : "History & results"}</button>)}</div>
      {loading ? <p role="status" className={card}>Loading exams…</p> : !error && !visible.length ? <div className={card}><h2 className="font-semibold">No exams here yet</h2><p className="mt-2 text-sm text-text-secondary">{manager ? "Schedule an exam to get started." : "Exams assigned to you will appear here."}</p></div> : visible.map((exam) => <article key={exam.id} className={card}>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{new Date(exam.startsAt).toLocaleString()}</p><h2 className="mt-2 text-xl font-semibold">{exam.title}</h2><p className="mt-1 text-sm text-text-secondary">Teacher: {exam.tutorProfile.user.fullName}</p>
        <div className="mt-4 flex flex-wrap gap-2">{exam.subjects.map((s) => <span key={s.name} className="rounded-full bg-surface-muted px-3 py-1 text-xs">{s.name} · {s.maxMarks} marks</span>)}</div>
        <details className="mt-5"><summary className="min-h-11 cursor-pointer font-medium text-primary">{role === "PARENT" ? "View results & feedback" : "View roster & record results"}</summary><div className="mt-3 space-y-3">{exam.marks.map((mark) => {
          const max = exam.subjects.find((s) => s.name === mark.subject)?.maxMarks ?? 100;
          return role !== "PARENT" && Date.parse(exam.startsAt) <= Date.now() ? <ResultForm key={mark.id} mark={mark} max={max} onSaved={() => {}} /> : <div key={mark.id} className="rounded-xl bg-surface-muted p-4"><h3 className="font-medium">{mark.student.fullName} · {mark.subject}</h3><p className="mt-2 text-sm">{mark.attendance === "ABSENT" ? "Absent" : mark.score == null ? "Results not recorded yet" : mark.score + " / " + max}</p>{mark.score != null && mark.score / max < 0.5 && <p className="mt-2 text-sm text-warning">Needs more practice in this subject.</p>}{mark.feedback && <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{mark.feedback}</p>}</div>;
        })}</div></details>
      </article>)}
    </div>
  </main>;
}

