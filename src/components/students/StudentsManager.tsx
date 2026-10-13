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

type BatchOption = {
  id: string;
  name: string;
  isActive: boolean;
  classGrade: { id: string; name: string };
};

type StudentListItem = {
  id: string;
  fullName: string;
  className: string | null;
  createdAt: string;
  batches: {
    id: string;
    name: string;
    isActive: boolean;
    className: string;
  }[];
  parent: {
    profileId: string;
    userId: string;
    fullName: string;
    email: string;
    phone: string | null;
    status: string;
  };
};

type CreateResponse = {
  message: string;
  emailDelivery: { emailed: boolean; reason: string };
  credentials: { email: string; temporaryPassword: string };
  student: {
    id: string;
    fullName: string;
    className: string | null;
    batch: { id: string; name: string; className: string } | null;
  };
  parent: {
    fullName: string;
    email: string;
    phone: string | null;
  };
};

type FieldErrors = {
  parentFullName?: string;
  parentEmail?: string;
  parentPhone?: string;
  studentFullName?: string;
  className?: string;
  batchId?: string;
};

function validate(values: {
  parentFullName: string;
  parentEmail: string;
  parentPhone: string;
  studentFullName: string;
  className: string;
  batchId: string;
  batchesForClass: number;
}): FieldErrors {
  const errors: FieldErrors = {};
  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  if (!values.parentFullName.trim()) {
    errors.parentFullName = "Enter the parent’s full name.";
  }
  if (!values.parentEmail.trim()) {
    errors.parentEmail = "Enter the family’s email.";
  } else if (!emailOk(values.parentEmail)) {
    errors.parentEmail = "Enter a valid email.";
  }

  if (values.parentPhone.trim()) {
    const phone = values.parentPhone.replace(/[\s\-()]/g, "");
    if (!/^\+?[0-9]{10,15}$/.test(phone)) {
      errors.parentPhone = "Use 10–15 digits, or leave blank.";
    }
  }

  if (!values.studentFullName.trim()) {
    errors.studentFullName = "Enter the student’s full name.";
  }

  if (!values.className) {
    errors.className = "Select the student’s class.";
  } else if (values.batchesForClass === 0) {
    errors.batchId =
      "No batch for this class yet. Create one under Catalog → Classes, then come back.";
  } else if (!values.batchId) {
    errors.batchId = "Select a batch for this class.";
  }

  return errors;
}

export function StudentsManager() {
  const [items, setItems] = useState<StudentListItem[]>([]);
  const [classes, setClasses] = useState<CatalogItem[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [parentFullName, setParentFullName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [studentFullName, setStudentFullName] = useState("");
  const [className, setClassName] = useState("");
  const [batchId, setBatchId] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const batchesForClass = useMemo(
    () =>
      batches.filter(
        (b) => b.isActive && b.classGrade.name === className,
      ),
    [batches, className],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const { data } = await api.get<StudentListItem[]>("/students");
      setItems(data);
    } catch (error) {
      setItems([]);
      setListError(
        error instanceof ApiError
          ? error.message
          : "Could not load students. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const [classesRes, batchesRes] = await Promise.all([
        api.get<CatalogItem[]>("/catalog/classes"),
        api.get<BatchOption[]>("/batches"),
      ]);
      setClasses(classesRes.data.filter((c) => c.isActive));
      setBatches(batchesRes.data);
    } catch {
      setClasses([]);
      setBatches([]);
    }
  }, []);

  useEffect(() => {
    void loadList();
    void loadOptions();
  }, [loadList, loadOptions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setCreated(null);

    const nextErrors = validate({
      parentFullName,
      parentEmail,
      parentPhone,
      studentFullName,
      className,
      batchId,
      batchesForClass: batchesForClass.length,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const { data } = await api.post<CreateResponse>("/students", {
        parentFullName: parentFullName.trim(),
        parentEmail: parentEmail.trim(),
        parentPhone: parentPhone.trim() || undefined,
        studentFullName: studentFullName.trim(),
        className,
        batchId,
      });
      setCreated(data);
      setParentFullName("");
      setParentEmail("");
      setParentPhone("");
      setStudentFullName("");
      setClassName("");
      setBatchId("");
      setErrors({});
      await loadList();
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Could not create accounts. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students & parents"
        description="Create a student under a parent, pick their class, and enroll them in a batch."
      />

      <Alert variant="info">
        Choose class and batch here so the student is ready for offline sessions.
        Create batches under Catalog → Classes if none exist yet.
      </Alert>

      <Card>
        <h2 className="text-base font-semibold text-text">Register new pair</h2>
        <p className="mt-1 text-sm text-text-secondary">
          One parent account + one student profile. Same email for login.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-5"
          noValidate
        >
          {formError ? <Alert variant="error">{formError}</Alert> : null}

          {created ? (
            <Alert variant="success">
              <p className="font-medium">{created.message}</p>
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  Student: <strong>{created.student.fullName}</strong>
                  {created.student.className
                    ? ` · ${created.student.className}`
                    : ""}
                  {created.student.batch
                    ? ` · Batch: ${created.student.batch.name}`
                    : ""}
                </p>
                <p>Login email: {created.credentials.email}</p>
                <p>
                  Temporary password:{" "}
                  <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">
                    {created.credentials.temporaryPassword}
                  </code>
                </p>
                <p className="text-xs text-text-secondary">
                  {created.emailDelivery.reason}
                </p>
              </div>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="parentFullName"
              label="Parent full name"
              value={parentFullName}
              onChange={(e) => {
                setParentFullName(e.target.value);
                if (errors.parentFullName)
                  setErrors((c) => ({ ...c, parentFullName: undefined }));
              }}
              error={errors.parentFullName}
              autoComplete="name"
            />
            <TextField
              name="parentEmail"
              label="Email (parent / family login)"
              type="email"
              value={parentEmail}
              onChange={(e) => {
                setParentEmail(e.target.value);
                if (errors.parentEmail)
                  setErrors((c) => ({ ...c, parentEmail: undefined }));
              }}
              error={errors.parentEmail}
              autoComplete="email"
              hint="One email for parent login — student has no separate account."
            />
            <TextField
              name="parentPhone"
              label="Parent phone (optional)"
              type="tel"
              value={parentPhone}
              onChange={(e) => {
                setParentPhone(e.target.value);
                if (errors.parentPhone)
                  setErrors((c) => ({ ...c, parentPhone: undefined }));
              }}
              error={errors.parentPhone}
            />
            <TextField
              name="studentFullName"
              label="Student full name"
              value={studentFullName}
              onChange={(e) => {
                setStudentFullName(e.target.value);
                if (errors.studentFullName)
                  setErrors((c) => ({ ...c, studentFullName: undefined }));
              }}
              error={errors.studentFullName}
            />

            <div className="flex w-full flex-col gap-1.5">
              <label
                htmlFor="className"
                className="text-sm font-medium text-text"
              >
                Student class
              </label>
              <select
                id="className"
                name="className"
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
                  setBatchId("");
                  setErrors((c) => ({
                    ...c,
                    className: undefined,
                    batchId: undefined,
                  }));
                }}
                className="min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary"
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
              {errors.className ? (
                <p role="alert" className="text-xs text-error">
                  {errors.className}
                </p>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-1.5">
              <label
                htmlFor="batchId"
                className="text-sm font-medium text-text"
              >
                Batch
              </label>
              <select
                id="batchId"
                name="batchId"
                value={batchId}
                disabled={!className}
                onChange={(e) => {
                  setBatchId(e.target.value);
                  if (errors.batchId)
                    setErrors((c) => ({ ...c, batchId: undefined }));
                }}
                className="min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary disabled:opacity-60"
              >
                <option value="">
                  {!className
                    ? "Select a class first"
                    : batchesForClass.length === 0
                      ? "No batches for this class"
                      : "Select batch"}
                </option>
                {batchesForClass.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
              {errors.batchId ? (
                <p role="alert" className="text-xs text-error">
                  {errors.batchId}
                </p>
              ) : className && batchesForClass.length === 0 ? (
                <p className="text-xs text-text-secondary">
                  Create a batch under Catalog → Classes for {className}.
                </p>
              ) : (
                <p className="text-xs text-text-secondary">
                  Student is enrolled in this batch for offline sessions.
                </p>
              )}
            </div>
          </div>

          <Button type="submit" isLoading={submitting}>
            Create parent & student
          </Button>
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">Registered students</h2>
        {listError ? <Alert variant="error">{listError}</Alert> : null}
        {loading ? (
          <p className="text-sm text-text-secondary">Loading students…</p>
        ) : items.length === 0 ? (
          <EmptyState
            title="No students yet"
            description="Register a parent and student above to see them listed here."
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} padding="sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-text">{item.fullName}</p>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {item.className ?? "Class not set"}
                      {item.batches.length > 0
                        ? ` · ${item.batches.map((b) => b.name).join(", ")}`
                        : " · No batch"}
                    </p>
                  </div>
                  <div className="text-sm text-text-secondary sm:text-right">
                    <p className="font-medium text-text">
                      Parent: {item.parent.fullName}
                    </p>
                    <p>{item.parent.email}</p>
                    {item.parent.phone ? <p>{item.parent.phone}</p> : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
