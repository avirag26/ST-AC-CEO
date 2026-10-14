"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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

type Resource = {
  id: string;
  title: string;
  className: string;
  subject: string;
  createdAt: string;
};

const selectClass =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary";

export default function ResourcesPage() {
  const [items, setItems] = useState<Resource[]>([]);
  const [catalog, setCatalog] = useState<{ subjects: string[]; classes: string[] }>({
    subjects: [],
    classes: [],
  });
  const [manager, setManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [revision, setRevision] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      window.location.replace("/login");
      return;
    }
    const manage = ["CEO", "ADMIN"].includes(user.role);
    setManager(manage);
    setLoading(true);
    setError("");
    const jobs: Promise<unknown>[] = [
      api.get<Resource[]>("/resources").then((r) => setItems(r.data)),
    ];
    if (manage) {
      jobs.push(
        Promise.all([
          api.get<{ name: string }[]>("/catalog/subjects"),
          api.get<{ name: string }[]>("/catalog/classes"),
        ]).then(([s, c]) =>
          setCatalog({
            subjects: s.data.map((v) => v.name),
            classes: c.data.map((v) => v.name),
          }),
        ),
      );
    }
    Promise.all(jobs)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load resources."),
      )
      .finally(() => setLoading(false));
  }, [revision]);

  const refresh = () => setRevision((v) => v + 1);

  const matchesFilters = useCallback(
    (item: Resource) => {
      if (classFilter && item.className !== classFilter) return false;
      if (subjectFilter && item.subject !== subjectFilter) return false;
      return true;
    },
    [classFilter, subjectFilter],
  );

  const getSearchText = useCallback(
    (item: Resource) => [item.title, item.className, item.subject].join(" "),
    [],
  );

  const filterKey = `${classFilter}|${subjectFilter}`;

  const list = useClientList({
    items,
    getSearchText,
    matchesFilters,
    filterKey,
    pageSize: 10,
  });

  const classOptions = useMemo(() => {
    const names = Array.from(new Set(items.map((i) => i.className))).sort();
    return [{ value: "", label: "All classes" }, ...names.map((n) => ({ value: n, label: n }))];
  }, [items]);

  const subjectOptions = useMemo(() => {
    const names = Array.from(new Set(items.map((i) => i.subject))).sort();
    return [{ value: "", label: "All subjects" }, ...names.map((n) => ({ value: n, label: n }))];
  }, [items]);

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file") as File;
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a PDF smaller than 10 MB.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/resources", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      form.reset();
      setUploadOpen(false);
      setSuccess("Resource uploaded.");
      refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string) {
    setError("");
    setBusy(true);
    try {
      const { data } = await api.get<{ url: string }>(
        "/resources/" + id + "/download",
      );
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="PDFs by class and subject."
        action={
          manager ? (
            <Button type="button" onClick={() => setUploadOpen(true)}>
              Upload PDF
            </Button>
          ) : null
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <ListToolbar
        search={list.query}
        onSearchChange={list.setQuery}
        searchPlaceholder="Search title, class, or subject…"
        filters={[
          {
            id: "class",
            label: "Class",
            value: classFilter,
            onChange: setClassFilter,
            options: classOptions,
          },
          {
            id: "subject",
            label: "Subject",
            value: subjectFilter,
            onChange: setSubjectFilter,
            options: subjectOptions,
          },
        ]}
        resultLabel={
          loading
            ? "Loading…"
            : `${list.filteredCount} of ${list.totalCount} resources`
        }
        actions={
          <Button variant="secondary" isLoading={loading} onClick={refresh}>
            Refresh
          </Button>
        }
      />

      {loading ? (
        <Card>
          <p role="status" className="text-sm text-text-secondary">
            Loading resources…
          </p>
        </Card>
      ) : list.pageItems.length === 0 ? (
        <EmptyState title="No resources" description="Nothing matches your filters." />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {list.pageItems.map((r) => (
              <Card key={r.id}>
                <p className="text-xs font-medium text-text-secondary">
                  {r.className} · {r.subject}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-text">
                  {r.title}
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  PDF · {new Date(r.createdAt).toLocaleDateString()}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => void download(r.id)}
                  disabled={busy}
                >
                  Download
                </Button>
              </Card>
            ))}
          </div>
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
          open={uploadOpen}
          onClose={() => {
            if (!busy) setUploadOpen(false);
          }}
          title="Upload PDF"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setUploadOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="upload-resource-form"
                isLoading={busy}
              >
                Upload
              </Button>
            </div>
          }
        >
          <form id="upload-resource-form" onSubmit={upload} className="space-y-4">
            <TextField
              name="title"
              label="Title"
              required
              minLength={2}
              maxLength={150}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-text">
                Class
                <select name="className" required className={selectClass + " mt-1.5"}>
                  <option value="">Choose a class</option>
                  {catalog.classes.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-text">
                Subject
                <select name="subject" required className={selectClass + " mt-1.5"}>
                  <option value="">Choose a subject</option>
                  {catalog.subjects.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-text">
              PDF file (max 10 MB)
              <input
                name="file"
                required
                type="file"
                accept="application/pdf,.pdf"
                className={selectClass + " mt-1.5"}
              />
            </label>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
