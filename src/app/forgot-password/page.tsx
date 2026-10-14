"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const { data } = await api.post<{ message: string }>(sent ? "/auth/password/reset" : "/auth/password/request", sent ? { email, code, password } : { email });
      setMessage(data.message); if (sent) setDone(true); else setSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); } finally { setBusy(false); }
  }
  const field = "mt-2 min-h-12 w-full rounded-xl border border-border px-3 py-2 text-base";
  return <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8"><section className="w-full max-w-md rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Straight Line Academy</p><h1 className="mt-4 text-3xl font-semibold tracking-tight">{done ? "You're ready to sign in" : "Reset your password"}</h1><p className="mt-3 text-sm leading-6 text-text-secondary">Use your registered email. We will send a six-digit code to help you get back into your account.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-error-bg p-3 text-sm text-error">{error}</p>}{message && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-primary">{message}</p>}
    {!done && <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">Registered email<input type="email" autoComplete="email" required maxLength={254} value={email} readOnly={sent} onChange={(e) => setEmail(e.target.value)} className={field} /></label>
      {sent && <><label className="block text-sm font-medium">Six-digit code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} className={field} /></label><label className="block text-sm font-medium">New password<input type="password" autoComplete="new-password" required minLength={10} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} className={field} /><span className="mt-1 block text-xs text-text-secondary">Use at least 10 characters.</span></label></>}
      <button disabled={busy} className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-white disabled:opacity-50">{busy ? "Please wait…" : sent ? "Update password" : "Send reset code"}</button>
      {sent && <button type="button" disabled={busy} className="min-h-11 text-sm text-primary" onClick={() => { setSent(false); setCode(""); setMessage(""); }}>Change email or request another code</button>}
    </form>}
    <Link href="/login" className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-primary">← Back to sign in</Link>
  </section></main>;
}

