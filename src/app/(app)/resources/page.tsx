"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth-storage";
type Resource = { id: string; title: string; className: string; subject: string; createdAt: string };
const field = "mt-1 min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-base";
export default function ResourcesPage() {
  const [items, setItems] = useState<Resource[]>([]);
  const [catalog, setCatalog] = useState<{ subjects: string[]; classes: string[] }>({ subjects: [], classes: [] });
  const [manager, setManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const user = getStoredUser(); if (!user) { window.location.replace("/login"); return; }
    const manage = ["CEO", "ADMIN"].includes(user.role); setManager(manage);
    setLoading(true); setError("");
    const jobs: Promise<unknown>[] = [api.get<Resource[]>("/resources").then((r) => setItems(r.data))];
    if (manage) jobs.push(Promise.all([api.get<{ name: string }[]>("/catalog/subjects"), api.get<{ name: string }[]>("/catalog/classes")]).then(([s, c]) => setCatalog({ subjects: s.data.map((v) => v.name), classes: c.data.map((v) => v.name) })));
    Promise.all(jobs).catch((e) => setError(e instanceof Error ? e.message : "Could not load resources.")).finally(() => setLoading(false));
  }, [revision]);
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); const file = data.get("file") as File;
    if (file.size > 10 * 1024 * 1024) { setError("Choose a PDF smaller than 10 MB."); return; }
    setBusy(true); setError(""); setSuccess("");
    try { await api.post("/resources", data, { headers: { "Content-Type": "multipart/form-data" } }); form.reset(); setSuccess("PDF published to the selected class."); setRevision((v) => v + 1); }
    catch (e) { setError(e instanceof Error ? e.message : "Upload failed. Please try again."); } finally { setBusy(false); }
  }
  async function download(id: string) {
    setError(""); setBusy(true);
    try { const { data } = await api.get<{ url: string }>("/resources/" + id + "/download"); window.location.assign(data.url); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not download."); } finally { setBusy(false); }
  }
  return <main className="min-h-dvh bg-background px-4 py-6 sm:px-6"><div className="mx-auto max-w-5xl space-y-6">
    <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm font-medium text-primary">← Back to dashboard</Link><header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Keep learning</p><h1 className="mt-2 text-3xl font-semibold">Learning resources</h1><p className="mt-2 text-text-secondary">Class notes and practice PDFs, organized by subject.</p></header>
    {error && <p role="alert" className="rounded-xl bg-error-bg p-4 text-error">{error}</p>}{success && <p role="status" className="rounded-xl bg-green-50 p-4 text-success">{success}</p>}
    {manager && <details className="rounded-2xl border border-border bg-white p-5"><summary className="cursor-pointer font-semibold">Upload a PDF</summary><form onSubmit={upload} className="mt-5 space-y-4">
      <label className="block text-sm">Title<input required name="title" minLength={2} maxLength={150} className={field} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Class<select name="className" required className={field}><option value="">Choose a class</option>{catalog.classes.map((v) => <option key={v}>{v}</option>)}</select></label><label className="text-sm">Subject<select name="subject" required className={field}><option value="">Choose a subject</option>{catalog.subjects.map((v) => <option key={v}>{v}</option>)}</select></label></div>
      <label className="block text-sm">PDF file · up to 10 MB<input name="file" required type="file" accept="application/pdf,.pdf" className={field} /></label>
      <button disabled={busy} className="min-h-11 rounded-xl bg-primary px-5 py-2 font-medium text-white disabled:opacity-50">{busy ? "Uploading…" : "Publish resource"}</button>
    </form></details>}
    <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm">Find a subject or resource<input type="search" className={field} value={filter} onChange={(e) => setFilter(e.target.value)} /></label><button disabled={loading} className="min-h-11 rounded-xl border border-border bg-white px-4" onClick={() => setRevision((v) => v + 1)}>Refresh</button></div>
    {loading ? <p role="status">Loading resources…</p> : !error && !items.filter((v) => (v.title + v.subject + v.className).toLowerCase().includes(filter.toLowerCase())).length ? <p className="rounded-2xl border border-border bg-white p-6">No matching resources yet.</p> : <div className="grid gap-4 sm:grid-cols-2">{items.filter((v) => (v.title + v.subject + v.className).toLowerCase().includes(filter.toLowerCase())).map((r) => <article className="rounded-2xl border border-border bg-white p-5" key={r.id}><p className="text-xs font-semibold uppercase tracking-wider text-primary">{r.className} · {r.subject}</p><h2 className="mt-3 text-lg font-semibold">{r.title}</h2><p className="mt-2 text-sm text-text-secondary">PDF · {new Date(r.createdAt).toLocaleDateString()}</p><button onClick={() => void download(r.id)} disabled={busy} className="mt-4 min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Download PDF</button></article>)}</div>}
  </div></main>;
}

