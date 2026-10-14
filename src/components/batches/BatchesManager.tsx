"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { TextField } from "@/components/ui/TextField";
import { ApiError, api } from "@/lib/api";
import { useClientList } from "@/lib/useClientList";

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

const selectClass =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary disabled:opacity-60";

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

  const [classFilter, setClassFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

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

  const classOptions = useMemo(() => {
    const ids = Array.from(
      new Map(batches.map((b) => [b.classGrade.id, b.classGrade.name])).entries(),
    ).sort((a, b) => a[1].localeCompare(b[1]));
    return [
      { value: "", label: "All classes" },
      ...ids.map(([id, label]) => ({ value: id, label })),
    ];
  }, [batches]);

  const getSearchText = useCallback(
    (batch: BatchListItem) =>
      [
        batch.name,
        batch.classGrade.name,
        batch.tutor?.fullName,
        batch.tutor?.phone,
      ]
        .filter(Boolean)
        .join(" "),
    [],
  );

  const matchesFilters = useCallback(
    (batch: BatchListItem) => {
      if (classFilter && batch.classGrade.id !== classFilter) return false;
      if (activeFilter === "active" && !batch.isActive) return false;
      if (activeFilter === "inactive" && batch.isActive) return false;
      return true;
    },
    [classFilter, activeFilter],
  );

  const list = useClientList({
    items: batches,
    getSearchText,
    matchesFilters,
    filterKey: `${classFilter}-${activeFilter}`,
    pageSize: 10,
  });

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

  const loadOptions = useCallback(async () => {
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
      // dropdowns stay empty
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
    void loadOptions();
  }, [loadBatches, loadOptions]);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const availableStudents = useMemo(() => {
    const enrolled = new Set(detail?.students.map((s) => s.id) ?? []);
    const className = detail?.classGrade.name;
    return allStudents
      .filter((s) => !enrolled.has(s.id))
      .sort((a, b) => {
        const aMatch = className && a.className === className ? 0 : 1;
        const bMatch = className && b.className === className ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return a.fullName.localeCompare(b.fullName);
      });
  }, [allStudents, detail]);

  const matchingClassStudents = useMemo(() => {
    if (!detail) return [];
    const className = detail.classGrade.name;
    return availableStudents.filter((s) => s.className === className);
  }, [availableStudents, detail]);

  function resetCreateForm() {
    setName("");
    setClassGradeId("");
    setTutorProfileId("");
    setNameError(null);
    setClassError(null);
    setFormError(null);
  }

  function openCreate() {
    resetCreateForm();
    setModalOpen(true);
    void loadOptions();
  }

  function closeModal() {
    if (creating) return;
    setModalOpen(false);
  }

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
      resetCreateForm();
      setModalOpen(false);
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
      setSuccess("Tutor updated.");
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
      setSuccess("Student removed.");
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
        description="Center batches by class, tutor assignment, and enrollment."
        action={<Button onClick={openCreate}>Create batch</Button>}
      />

      {success ? <Alert variant="success">{success}</Alert> : null}

      <ListToolbar
        search={list.query}
        onSearchChange={list.setQuery}
        searchPlaceholder="Search batch, class, tutor…"
        filters={[
          {
            id: "class",
            label: "Class",
            value: classFilter,
            options: classOptions,
            onChange: setClassFilter,
          },
          {
            id: "active",
            label: "Status",
            value: activeFilter,
            options: [
              { value: "", label: "All" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
            onChange: setActiveFilter,
          },
        ]}
        resultLabel={
          loading
            ? "Loading…"
            : `${list.filteredCount} of ${list.totalCount} batches`
        }
        actions={
          <Button variant="secondary" onClick={() => void loadBatches()}>
            Refresh
          </Button>
        }
      />

      {listError ? <Alert variant="error">{listError}</Alert> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card padding="sm">
          <h2 className="mb-3 px-1 text-sm font-semibold text-text">Batches</h2>
          {loading ? (
            <p className="p-2 text-sm text-text-secondary">Loading batches…</p>
          ) : list.filteredCount === 0 ? (
            <EmptyState
              title={batches.length === 0 ? "No batches yet" : "No matches"}
              description={
                batches.length === 0
                  ? "Create a batch to get started."
                  : "Try a different search or filter."
              }
            />
          ) : (
            <div className="space-y-2 p-1">
              {list.pageItems.map((batch) => {
                const active = selectedId === batch.id;
                return (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => setSelectedId(batch.id)}
                    className={[
                      "w-full rounded-xl border px-4 py-3 text-left transition-colors",
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
                        <p
                          className={
                            batch.isActive ? "text-success" : "text-error"
                          }
                        >
                          {batch.isActive ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </button>
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
        </Card>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text">Details</h2>
          {!selectedId ? (
            <EmptyState
              title="Select a batch"
              description="Pick a batch to manage tutor and students."
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
                  Offline tutor
                </label>
                <select
                  id="editTutor"
                  value={editTutorId}
                  onChange={(e) => setEditTutorId(e.target.value)}
                  className={selectClass}
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
                  <p className="text-sm text-text-secondary">None enrolled.</p>
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
                  Add students
                </h3>
                <p className="text-xs text-text-secondary">
                  Prefer batch at student signup. Use this for existing students
                  without a batch.
                </p>
                {availableStudents.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    No students available to enroll.
                  </p>
                ) : (
                  <>
                    {matchingClassStudents.length > 0 ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEnrollIds(matchingClassStudents.map((s) => s.id));
                        }}
                      >
                        Select all {detail.classGrade.name} (
                        {matchingClassStudents.length})
                      </Button>
                    ) : null}
                    <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                      {availableStudents.map((student) => {
                        const sameClass =
                          student.className === detail.classGrade.name;
                        return (
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
                                  {sameClass ? (
                                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                      {detail.classGrade.name}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="block text-xs text-text-secondary">
                                  {student.className
                                    ? `${student.className} · `
                                    : ""}
                                  {student.parent.fullName} ·{" "}
                                  {student.parent.email}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    <Button
                      size="sm"
                      onClick={handleEnroll}
                      isLoading={enrolling}
                      disabled={enrollIds.length === 0}
                    >
                      Enroll ({enrollIds.length})
                    </Button>
                  </>
                )}
              </div>
            </Card>
          )}
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Create batch"
        description="Name the batch and choose a class. Tutor is optional."
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
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
                className={selectClass}
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
                className={selectClass}
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
                  No approved offline tutors yet.
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={creating}>
              Create batch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
