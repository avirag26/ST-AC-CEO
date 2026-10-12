"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/TextField";
import { ApiError, api } from "@/lib/api";

export type TutorCard = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  dob: string | null;
  role: "HOME_TUTOR" | "OFFLINE_TUTOR" | string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ACTIVE" | string;
  rejectionReason: string | null;
  createdAt: string;
  subjects: string[];
  classes: string[];
  documentsNote: string | null;
};

type TutorTab = "PENDING" | "APPROVED" | "REJECTED";

const tabItems = [
  { id: "PENDING" as const, label: "Pending" },
  { id: "APPROVED" as const, label: "Approved" },
  { id: "REJECTED" as const, label: "Rejected" },
];

function roleLabel(role: string) {
  if (role === "HOME_TUTOR") return "Home tutor";
  if (role === "OFFLINE_TUTOR") return "Offline tutor";
  return role;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export function TutorsManager() {
  const [activeTab, setActiveTab] = useState<TutorTab>("PENDING");
  const [tutors, setTutors] = useState<TutorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [approveTarget, setApproveTarget] = useState<TutorCard | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TutorCard | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadTutors = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const { data } = await api.get<TutorCard[]>("/tutors", {
        params: { status: activeTab },
      });
      setTutors(data);
    } catch (error) {
      setTutors([]);
      setListError(
        error instanceof ApiError
          ? error.message
          : "Could not load tutors. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setSuccess(null);
    setApproveTarget(null);
    setRejectTarget(null);
    setRejectReason("");
    void loadTutors();
  }, [loadTutors]);

  const emptyCopy = useMemo(() => {
    if (activeTab === "PENDING") {
      return {
        title: "No pending tutors",
        description:
          "When tutors register, they will appear here for your approval.",
      };
    }
    if (activeTab === "APPROVED") {
      return {
        title: "No approved tutors yet",
        description: "Approved tutors will be listed here.",
      };
    }
    return {
      title: "No rejected tutors",
      description: "Rejected registrations will appear in this list.",
    };
  }, [activeTab]);

  async function confirmApprove() {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      await api.patch(`/tutors/${approveTarget.id}/approve`);
      setSuccess(`Approved ${approveTarget.fullName}. They can sign in now.`);
      setApproveTarget(null);
      await loadTutors();
    } catch (error) {
      setListError(
        error instanceof ApiError
          ? error.message
          : "Could not approve this tutor.",
      );
      setApproveTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await api.patch(`/tutors/${rejectTarget.id}/reject`, {
        reason: rejectReason.trim() || undefined,
      });
      setSuccess(`Rejected ${rejectTarget.fullName}.`);
      setRejectTarget(null);
      setRejectReason("");
      await loadTutors();
    } catch (error) {
      setListError(
        error instanceof ApiError
          ? error.message
          : "Could not reject this tutor.",
      );
      setRejectTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutor approvals"
        description="Review tutor registrations. Only approved tutors can sign in with their phone number and password."
        action={
          <Button variant="secondary" size="sm" onClick={() => void loadTutors()}>
            Refresh
          </Button>
        }
      />

      <Tabs
        label="Tutor status"
        items={tabItems}
        value={activeTab}
        onChange={setActiveTab}
      />

      {success ? <Alert variant="success">{success}</Alert> : null}

      <Card padding="sm">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-text">
            {tabItems.find((tab) => tab.id === activeTab)?.label} tutors
          </h3>
          <p className="text-xs text-text-secondary">
            {loading
              ? "Loading…"
              : `${tutors.length} tutor${tutors.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="p-3 sm:p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="h-36 animate-pulse rounded-2xl bg-surface-muted"
                />
              ))}
            </div>
          ) : listError ? (
            <Alert variant="error">{listError}</Alert>
          ) : tutors.length === 0 ? (
            <EmptyState
              title={emptyCopy.title}
              description={emptyCopy.description}
            />
          ) : (
            <ul className="space-y-3">
              {tutors.map((tutor) => (
                <li
                  key={tutor.id}
                  className="rounded-2xl border border-border bg-surface-muted/40 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold text-text">
                            {tutor.fullName}
                          </h4>
                          <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-primary">
                            {roleLabel(tutor.role)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">
                          Applied {formatDate(tutor.createdAt)}
                        </p>
                      </div>

                      <dl className="grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-text-secondary">Phone</dt>
                          <dd className="font-medium text-text">
                            {tutor.phone || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-text-secondary">Email</dt>
                          <dd className="break-all font-medium text-text">
                            {tutor.email}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-text-secondary">
                            Date of birth
                          </dt>
                          <dd className="font-medium text-text">
                            {formatDate(tutor.dob)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-text-secondary">
                            Documents
                          </dt>
                          <dd className="font-medium text-text">
                            {tutor.documentsNote || "None shared"}
                          </dd>
                        </div>
                      </dl>

                      <div className="flex flex-wrap gap-2">
                        {tutor.subjects.map((subject) => (
                          <span
                            key={`${tutor.id}-s-${subject}`}
                            className="rounded-lg bg-surface px-2.5 py-1 text-xs font-medium text-text"
                          >
                            {subject}
                          </span>
                        ))}
                        {tutor.classes.map((className) => (
                          <span
                            key={`${tutor.id}-c-${className}`}
                            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary"
                          >
                            {className}
                          </span>
                        ))}
                      </div>

                      {tutor.status === "REJECTED" && tutor.rejectionReason ? (
                        <Alert variant="error">
                          Reason: {tutor.rejectionReason}
                        </Alert>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                      {activeTab === "PENDING" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSuccess(null);
                              setApproveTarget(tutor);
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="dangerOutline"
                            onClick={() => {
                              setSuccess(null);
                              setRejectReason("");
                              setRejectTarget(tutor);
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}

                      {activeTab === "APPROVED" ? (
                        <Button
                          size="sm"
                          variant="dangerOutline"
                          onClick={() => {
                            setSuccess(null);
                            setRejectReason("");
                            setRejectTarget(tutor);
                          }}
                        >
                          Revoke access
                        </Button>
                      ) : null}

                      {activeTab === "REJECTED" ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSuccess(null);
                            setApproveTarget(tutor);
                          }}
                        >
                          Approve now
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(approveTarget)}
        title="Approve this tutor?"
        description={
          approveTarget
            ? `${approveTarget.fullName} will be able to sign in with phone ${approveTarget.phone || "number"} and start using the tutor app.`
            : ""
        }
        confirmLabel="Approve"
        isLoading={actionLoading}
        onClose={() => {
          if (!actionLoading) setApproveTarget(null);
        }}
        onConfirm={() => void confirmApprove()}
      />

      {rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close dialog"
            onClick={() => {
              if (!actionLoading) {
                setRejectTarget(null);
                setRejectReason("");
              }
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-dialog-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
          >
            <h3
              id="reject-dialog-title"
              className="text-lg font-semibold text-text"
            >
              Reject this tutor?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {rejectTarget.fullName} will not be able to sign in until you
              approve them later.
            </p>
            <div className="mt-4">
              <TextField
                name="rejectReason"
                label="Reason (optional)"
                placeholder="e.g. Incomplete documents"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
              />
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={actionLoading}
                onClick={() => void confirmReject()}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
