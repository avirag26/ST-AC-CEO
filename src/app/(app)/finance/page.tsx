"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth-storage";

type Fee = { id: string; title: string; student: { fullName: string }; amount: number; balance: number; paid: number; currency: string; dueAt: string; payments: { id: string; amount: number; reference: string; createdAt: string }[] };
type Salary = { id: string; period: string; amount: number; currency: string; reference: string; tutorProfile: { user: { fullName: string } } };
type Options = { students: { id: string; fullName: string }[]; tutors: { id: string; user: { fullName: string } }[] };
const input = "mt-1 min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-base";
const button = "min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const panel = "rounded-2xl border border-border bg-white p-5 sm:p-6";
function money(n: number, currency: string) { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n / 100); }
function errorMessage(e: unknown) { return e instanceof Error ? e.message : "Could not save. Please try again."; }
function PaymentForm({ fee, refresh }: { fee: Fee; refresh: () => void }) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [requestId, setRequestId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setRequestId(crypto.randomUUID()), []);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await api.post("/finance/fees/" + fee.id + "/payments", { amount: Math.round(Number(amount) * 100), reference, requestId }); setRequestId(crypto.randomUUID()); setAmount(""); setReference(""); refresh(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-4 space-y-3 border-t border-border pt-4">
    <p className="text-sm text-text-secondary">Record a payment already received. This does not charge the family.</p>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Amount received ({fee.currency})<input required type="number" min="0.01" step="0.01" max={fee.balance / 100} className={input} value={amount} onChange={(e) => { setAmount(e.target.value); setRequestId(crypto.randomUUID()); }} /></label><label className="text-sm">Receipt / transfer reference<input required maxLength={150} className={input} value={reference} onChange={(e) => { setReference(e.target.value); setRequestId(crypto.randomUUID()); }} /></label></div>
    {error && <p role="alert" className="text-sm text-error">{error}</p>}<button className={button} disabled={busy || !requestId}>{busy ? "Recording…" : "Record received payment"}</button>
  </form>;
}
export default function FinancePage() {
  const [role, setRole] = useState("");
  const [fees, setFees] = useState<Fee[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [kind, setKind] = useState("fees");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const manager = role === "CEO" || role === "ADMIN";
  useEffect(() => {
    const user = getStoredUser();
    if (!user) { window.location.replace("/login"); return; }
    setRole(user.role);
    const tutor = user.role === "HOME_TUTOR" || user.role === "OFFLINE_TUTOR";
    if (tutor) setKind("salaries");
    const manage = user.role === "CEO" || user.role === "ADMIN";
    setLoading(true); setError("");
    const jobs: Promise<unknown>[] = [];
    if (!tutor) jobs.push(api.get<Fee[]>("/finance/fees").then((r) => setFees(r.data)));
    if (user.role !== "PARENT") jobs.push(api.get<Salary[]>("/finance/salaries").then((r) => setSalaries(r.data)));
    if (manage) jobs.push(api.get<Options>("/exams/options").then((r) => setOptions(r.data)));
    Promise.all(jobs).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  }, [revision]);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const fields = new FormData(form);
    setBusy(true); setError(""); setSuccess("");
    const amount = Math.round(Number(fields.get("amount")) * 100);
    const currency = String(fields.get("currency"));
    try {
      const payload = kind === "fees" ? { studentId: fields.get("person"), title: fields.get("title"), dueAt: new Date(String(fields.get("date"))).toISOString(), amount, currency }
        : { tutorProfileId: fields.get("person"), period: fields.get("date"), reference: fields.get("title"), amount, currency };
      await api.post("/finance/" + kind, payload); form.reset(); setSuccess(kind === "fees" ? "Fee added to the family's account." : "Salary payment recorded."); setRevision((v) => v + 1);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <main className="min-h-dvh bg-background px-4 py-6 sm:px-6"><div className="mx-auto max-w-5xl space-y-6">
    <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm font-medium text-primary">← Back to dashboard</Link>
    <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Clear records, less paperwork</p><h1 className="mt-2 text-3xl font-semibold">{role === "PARENT" ? "Your family's fees" : manager ? "Fees & salaries" : "Your salary history"}</h1><p className="mt-2 text-text-secondary">Review amounts, dates, and payment references in one place.</p></header>
    {error && <p role="alert" className="rounded-xl bg-error-bg p-4 text-error">{error}</p>}{success && <p role="status" className="rounded-xl bg-green-50 p-4 text-success">{success}</p>}
    <div className="flex flex-wrap gap-2">{manager && ["fees", "salaries"].map((v) => <button key={v} aria-pressed={kind === v} onClick={() => setKind(v)} className={kind === v ? button : "min-h-11 rounded-xl border border-border bg-white px-4"}>{v === "fees" ? "Student fees" : "Tutor salaries"}</button>)}<button className="min-h-11 rounded-xl border border-border bg-white px-4" disabled={loading} onClick={() => setRevision((v) => v + 1)}>Refresh</button></div>
    {manager && options && <details className={panel}><summary className="cursor-pointer font-semibold">{kind === "fees" ? "Add a student fee" : "Record salary paid"}</summary><form onSubmit={create} className="mt-5 space-y-4" key={kind}>
      <p className="text-sm text-text-secondary">{kind === "fees" ? "The selected family will see this fee and its remaining balance." : "Only record money already paid. One salary record per tutor per month."}</p>
      <label className="block text-sm">{kind === "fees" ? "Student" : "Tutor"}<select name="person" required className={input}><option value="">Choose</option>{kind === "fees" ? options.students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>) : options.tutors.map((t) => <option key={t.id} value={t.id}>{t.user.fullName}</option>)}</select></label>
      <label className="block text-sm">{kind === "fees" ? "Fee description" : "Payment reference"}<input name="title" required minLength={2} maxLength={150} className={input} /></label>
      <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm">Amount (INR)<input name="amount" required type="number" min="0.01" max="1000000" step="0.01" className={input} /></label><label className="text-sm">Currency<input name="currency" value="INR" readOnly className={input} /></label><label className="text-sm">{kind === "fees" ? "Due date" : "Salary month"}<input name="date" required type={kind === "fees" ? "date" : "month"} className={input} /></label></div>
      <button disabled={busy} className={button}>{busy ? "Saving…" : kind === "fees" ? "Add fee" : "Confirm salary paid"}</button>
    </form></details>}
    {loading ? <p role="status" className={panel}>Loading payment records…</p> : error ? null : kind === "fees" ? fees.length ? <div className="space-y-4">{fees.map((fee) => <article className={panel} key={fee.id}>
      <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-primary">{fee.student.fullName}</p><h2 className="mt-2 text-lg font-semibold">{fee.title}</h2><p className="mt-1 text-sm text-text-secondary">Due {new Date(fee.dueAt).toLocaleDateString()}</p></div><div><span className={"rounded-full px-3 py-1 text-xs font-medium " + (fee.balance === 0 ? "bg-green-50 text-success" : "bg-amber-50 text-warning")}>{fee.balance === 0 ? "Paid" : "Balance due"}</span><p className="mt-3 text-2xl font-semibold">{money(fee.balance, fee.currency)}</p></div></div>
      <p className="mt-3 text-sm text-text-secondary">Total {money(fee.amount, fee.currency)} · Received {money(fee.paid, fee.currency)}</p>
      {fee.payments.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm font-medium text-primary">Payment history ({fee.payments.length})</summary><ul className="mt-3 divide-y divide-border">{fee.payments.map((p) => <li className="break-words py-3 text-sm" key={p.id}><strong>{money(p.amount, fee.currency)}</strong> · {new Date(p.createdAt).toLocaleDateString()}<p className="text-text-secondary">{p.reference}</p></li>)}</ul></details>}
      {manager && fee.balance > 0 && <PaymentForm fee={fee} refresh={() => setRevision((v) => v + 1)} />}
    </article>)}</div> : <p className={panel}>No fees have been added yet.</p> : salaries.length ? <div className="grid gap-4 sm:grid-cols-2">{salaries.map((s) => <article className={panel} key={s.id}><p className="text-xs font-semibold uppercase tracking-widest text-primary">{s.period} · Credited</p><h2 className="mt-3 text-lg font-semibold">{s.tutorProfile.user.fullName}</h2><p className="mt-3 text-2xl font-semibold">{money(s.amount, s.currency)}</p><p className="mt-3 break-words text-sm text-text-secondary">Reference: {s.reference}</p></article>)}</div> : <p className={panel}>No salary payments recorded yet.</p>}
  </div></main>;
}

