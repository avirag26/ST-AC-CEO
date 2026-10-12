"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { TextField } from "@/components/ui/TextField";
import { ApiError, api } from "@/lib/api";

type CatalogItem = { id: string; name: string; isActive: boolean };

type OfflineTutorOption = {
  tutorProfileId: string;
  userId: string;
  fullName: string;
  phone: string | null;
  status: string;
};

type StudentOption = {
  id: string;
  fullName: string;
  className: string | null;
  parent: { fullName: string; email: string };
};

type BatchListItem = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  classGrade: { id: string; name: string; isActive: boolean };
  tutor: {
    tutorProfileId: string;
    userId: string;
    fullName: string;
    phone: string | null;
    status: string;
  } | null;
  studentCount: number;
};

type BatchDetail = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  classGrade: { id: string; name: string; isActive: boolean };
  tutor: BatchListItem["tutor"];
  students: {
    enrollmentId: string;
    enrolledAt: string;
    id: string;
    fullName: string;
    className: string | null;
    parentName: string;
    parentEmail: string;
  }[];
  studentCount: number;
};

export function BatchesManager() {
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [classes, setClasses] = useState<CatalogItem[]>([]);
  const [tutors, setTutors] = useState<OfflineTutorOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BatchDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [classGradeId, setClassGradeId] = useState("");
  const [tutorProfileId, setTutorProfileId] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [classError, setClassError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editTutorId, setEditTutorId] = useState("");
  const [enrollIds, setEnrollIds] = useState<string[]>([]);
  const [savingTutor, setSavingTutor] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const { data } = await api.get<BatchListItem[]>("/batches");
      setBatches(data);
    } catch (error) {
      setBatches([]);
      setListError(
        error instanceof ApiError
          ? error.message
          : "Could not load batches. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setActionError(null);
    try {
      const { data } = await api.get<BatchDetail>(`/batches/${id}`);
      setDetail(data);
      setEditTutorId(data.tutor?.tutorProfileId ?? "");
      setEnrollIds([]);
    } catch (error) {
      setDetail(null);
      setActionError(
        error instanceof ApiError
          ? error.message
          : "Could not load batch details.",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBatches();
    void (async () => {
      try {
        const [classesRes, tutorsRes, studentsRes] = await Promise.all([
          api.get<CatalogItem[]>("/catalog/classes"),
          api.get<OfflineTutorOption[]>("/batches/offline-tutors"),
          api.get<
            {
              id: string;
              fullName: string;
              className: string | null;
              parent: { fullName: string; email: string };
            }[]
          >("/students"),
        ]);
        setClasses(classesRes.data.filter((c) => c.isActive));
        setTutors(tutorsRes.data);
        setAllStudents(
          studentsRes.data.map((s) => ({
            id: s.id,
            fullName: s.fullName,
            className: s.className,
            parent: {
              fullName: s.parent.fullName,
              email: s.parent.email,
            },
          })),
        );
      } catch {
        // dropdowns stay empty; create form will show validation
      }
    })();
  }, [loadBatches]);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const availableStudents = useMemo(() => {
    const enrolled = new Set(detail?.students.map((s) => s.id) ?? []);
    return allStudents.filter((s) => !enrolled.has(s.id));
  }, [allStudents, detail]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    setNameError(null);
    setClassError(null);

    let ok = true;
    if (!name.trim()) {
      setNameError("Enter a batch name.");
      ok = false;
    }
    if (!classGradeId) {
      setClassError("Select a class.");
      ok = false;
    }
    if (!ok) return;

    setCreating(true);
    try {
      const { data } = await api.post<BatchDetail>("/batches", {
        name: name.trim(),
        classGradeId,
        tutorProfileId: tutorProfileId || undefined,
      });
      setName("");
      setClassGradeId("");
      setTutorProfileId("");
      setSuccess(`Batch “${data.name}” created.`);
      await loadBatches();
      setSelectedId(data.id);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Could not create batch. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveTutor() {
    if (!detail) return;
    setSavingTutor(true);
    setActionError(null);
    setSuccess(null);
    try {
      const { data } = await api.patch<BatchDetail>(`/batches/${detail.id}`, {
        tutorProfileId: editTutorId || null,
      });
      setDetail(data);
      setSuccess("Tutor assignment updated.");
      await loadBatches();
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "Could not update tutor.",
      );
    } finally {
      setSavingTutor(false);
    }
  }

  async function handleToggleActive() {
    if (!detail) return;
    setTogglingActive(true);
    setActionError(null);
    setSuccess(null);
    try {
      const { data } = await api.patch<BatchDetail>(`/batches/${detail.id}`, {
        isActive: !detail.isActive,
      });
      setDetail(data);
      setSuccess(data.isActive ? "Batch activated." : "Batch deactivated.");
      await loadBatches();
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "Could not update batch status.",
      );
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleEnroll() {
    if (!detail || enrollIds.length === 0) return;
    setEnrolling(true);
    setActionError(null);
    setSuccess(null);
    try {
      const { data } = await api.post<BatchDetail>(
        `/batches/${detail.id}/students`,
        { studentIds: enrollIds },
      );
      setDetail(data);
      setEnrollIds([]);
      setSuccess("Students enrolled.");
      await loadBatches();
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "Could not enroll students.",
      );
    } finally {
      setEnrolling(false);
    }
  }

  async function handleUnenroll(studentId: string) {
    if (!detail) return;
    setRemovingId(studentId);
    setActionError(null);
    setSuccess(null);
    try {
      const { data } = await api.delete<BatchDetail>(
        `/batches/${detail.id}/students/${studentId}`,
      );
      setDetail(data);
      setSuccess("Student removed from batch.");
      await loadBatches();
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "Could not remove student.",
      );
    } finally {
      setRemovingId(null);
    }
  }

  function toggleEnrollId(id: string) {
    setEnrollIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offline batches"
        description="Create center batches under a class, assign an offline tutor, and enroll students."
      />

      {success ? <Alert variant="success">{success}</Alert> : null}

      <Card>
        <h2 className="text-base font-semibold text-text">Create batch</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Example: Class 8 — Morning A. Sessions come in the next step.
        </p>

        <form onSubmit={handleCreate} className="mt-5 space-y-4" noValidate>
          {formError ? <Alert variant="error">{formError}</Alert> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="batchName"
              label="Batch name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              error={nameError ?? undefined}
              placeholder="e.g. Morning A"
            />

            <div className="flex w-full flex-col gap-1.5">
              <label
                htmlFor="classGradeId"
                className="text-sm font-medium text-text"
              >
                Class
              </label>
              <select
                id="classGradeId"
                value={classGradeId}
                onChange={(e) => {
                  setClassGradeId(e.target.value);
                  if (classError) setClassError(null);
                }}
                className="min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary"
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {classError ? (
                <p role="alert" className="text-xs text-error">
                  {classError}
                </p>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-1.5 sm:col-span-2">
              <label
                htmlFor="tutorProfileId"
                className="text-sm font-medium text-text"
              >
                Offline tutor (optional)
              </label>
              <select
                id="tutorProfileId"
                value={tutorProfileId}
                onChange={(e) => setTutorProfileId(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary"
              >
                <option value="">Assign later</option>
                {tutors.map((tutor) => (
                  <option key={tutor.tutorProfileId} value={tutor.tutorProfileId}>
                    {tutor.fullName}
                    {tutor.phone ? ` · ${tutor.phone}` : ""}
                  </option>
                ))}
              </select>
              {tutors.length === 0 ? (
                <p className="text-xs text-text-secondary">
                  No approved offline tutors yet. Approve one under Tutor
                  approvals first.
                </p>
              ) : null}
            </div>
          </div>

          <Button type="submit" isLoading={creating}>
            Create batch
          </Button>
        </form>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-text">All batches</h2>
          {listError ? <Alert variant="error">{listError}</Alert> : null}
          {loading ? (
            <p className="text-sm text-text-secondary">Loading batches…</p>
          ) : batches.length === 0 ? (
            <EmptyState
              title="No batches yet"
              description="Create a batch above to get started."
            />
          ) : (
            <div className="space-y-2">
              {batches.map((batch) => {
                const active = selectedId === batch.id;
                return (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => setSelectedId(batch.id)}
                    className={[
                      "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                      active
                        ? "border-primary bg-surface-muted"
                        : "border-border bg-surface hover:border-primary/40",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text">{batch.name}</p>
                        <p className="mt-0.5 text-sm text-text-secondary">
                          {batch.classGrade.name}
                          {batch.tutor
                            ? ` · ${batch.tutor.fullName}`
                            : " · No tutor"}
                        </p>
                      </div>
                      <div className="text-right text-xs text-text-secondary">
                        <p>{batch.studentCount} students</p>
                        <p className={batch.isActive ? "text-success" : "text-error"}>
                          {batch.isActive ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-text">Batch details</h2>
          {!selectedId ? (
            <EmptyState
              title="Select a batch"
              description="Choose a batch from the list to enroll students or change the tutor."
            />
          ) : detailLoading || !detail ? (
            <p className="text-sm text-text-secondary">Loading details…</p>
          ) : (
            <Card padding="sm" className="space-y-5">
              {actionError ? <Alert variant="error">{actionError}</Alert> : null}

              <div>
                <p className="text-lg font-semibold text-text">{detail.name}</p>
                <p className="mt-1 text-sm text-text-secondary">
                  {detail.classGrade.name} · {detail.studentCount} students ·{" "}
                  {detail.isActive ? "Active" : "Inactive"}
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="editTutor"
                  className="text-sm font-medium text-text"
                >
                  Assigned offline tutor
                </label>
                <select
                  id="editTutor"
                  value={editTutorId}
                  onChange={(e) => setEditTutorId(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary"
                >
                  <option value="">Unassigned</option>
                  {tutors.map((tutor) => (
                    <option
                      key={tutor.tutorProfileId}
                      value={tutor.tutorProfileId}
                    >
                      {tutor.fullName}
                      {tutor.phone ? ` · ${tutor.phone}` : ""}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveTutor}
                    isLoading={savingTutor}
                  >
                    Save tutor
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleToggleActive}
                    isLoading={togglingActive}
                  >
                    {detail.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text">
                  Enrolled students
                </h3>
                {detail.students.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    No students enrolled yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.students.map((student) => (
                      <li
                        key={student.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-text">
                            {student.fullName}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {student.parentName} · {student.parentEmail}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="dangerOutline"
                          onClick={() => handleUnenroll(student.id)}
                          isLoading={removingId === student.id}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text">
                  Enroll students
                </h3>
                {availableStudents.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    All registered students are already in this batch, or none
                    exist yet.
                  </p>
                ) : (
                  <>
                    <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                      {availableStudents.map((student) => (
                        <li key={student.id}>
                          <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-surface-muted">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={enrollIds.includes(student.id)}
                              onChange={() => toggleEnrollId(student.id)}
                            />
                            <span>
                              <span className="block text-sm font-medium text-text">
                                {student.fullName}
                              </span>
                              <span className="block text-xs text-text-secondary">
                                {student.parent.fullName} · {student.parent.email}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      onClick={handleEnroll}
                      isLoading={enrolling}
                      disabled={enrollIds.length === 0}
                    >
                      Enroll selected ({enrollIds.length})
                    </Button>
                  </>
                )}
              </div>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
