"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/TextField";
import { ApiError, api } from "@/lib/api";
import { useClientList } from "@/lib/useClientList";

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
  const [roleFilter, setRoleFilter] = useState("");

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

  const getSearchText = useCallback(
    (tutor: TutorCard) =>
      [
        tutor.fullName,
        tutor.email,
        tutor.phone,
        tutor.documentsNote,
        ...tutor.subjects,
        ...tutor.classes,
      ]
        .filter(Boolean)
        .join(" "),
    [],
  );

  const matchesFilters = useCallback(
    (tutor: TutorCard) => !roleFilter || tutor.role === roleFilter,
    [roleFilter],
  );

  const list = useClientList({
    items: tutors,
    getSearchText,
    matchesFilters,
    filterKey: `${activeTab}-${roleFilter}`,
    pageSize: 10,
  });

  const emptyCopy = useMemo(() => {
    if (activeTab === "PENDING") {
      return {
        title: "No pending tutors",
        description: "New tutor signups appear here.",
      };
    }
    if (activeTab === "APPROVED") {
      return {
        title: "No approved tutors",
        description: "Approved tutors are listed here.",
      };
    }
    return {
      title: "No rejected tutors",
      description: "Rejected signups are listed here.",
    };
  }, [activeTab]);

  async function confirmApprove() {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      await api.patch(`/tutors/${approveTarget.id}/approve`);
      setSuccess(`Approved ${approveTarget.fullName}.`);
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

  function closeRejectModal() {
    if (actionLoading) return;
    setRejectTarget(null);
    setRejectReason("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutor approvals"
        description="Review signups. Approved tutors can sign in with phone and password."
      />

      <Tabs
        label="Tutor status"
        items={tabItems}
        value={activeTab}
        onChange={setActiveTab}
      />

      {success ? <Alert variant="success">{success}</Alert> : null}

      <ListToolbar
        search={list.query}
        onSearchChange={list.setQuery}
        searchPlaceholder="Search name, phone, email, subjects…"
        filters={[
          {
            id: "role",
            label: "Role",
            value: roleFilter,
            options: [
              { value: "", label: "All roles" },
              { value: "HOME_TUTOR", label: "Home tutor" },
              { value: "OFFLINE_TUTOR", label: "Offline tutor" },
            ],
            onChange: setRoleFilter,
          },
        ]}
        resultLabel={
          loading
            ? "Loading…"
            : `${list.filteredCount} of ${list.totalCount} tutors`
        }
        actions={
          <Button variant="secondary" onClick={() => void loadTutors()}>
            Refresh
          </Button>
        }
      />

      {listError ? <Alert variant="error">{listError}</Alert> : null}

      <Card padding="sm">
        {loading ? (
          <p className="p-4 text-sm text-text-secondary">Loading tutors…</p>
        ) : list.filteredCount === 0 ? (
          <EmptyState
            title={
              tutors.length === 0 ? emptyCopy.title : "No matches"
            }
            description={
              tutors.length === 0
                ? emptyCopy.description
                : "Try a different search or role filter."
            }
          />
        ) : (
          <div className="space-y-3 p-1 sm:p-2">
            <ul className="space-y-3">
              {list.pageItems.map((tutor) => (
                <li
                  key={tutor.id}
                  className="rounded-xl border border-border bg-surface-muted/40 p-4"
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
                            {tutor.documentsNote || "—"}
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
                          Approve
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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

      <ConfirmDialog
        open={Boolean(approveTarget)}
        title="Approve tutor?"
        description={
          approveTarget
            ? `${approveTarget.fullName} can sign in after approval.`
            : ""
        }
        confirmLabel="Approve"
        isLoading={actionLoading}
        onClose={() => {
          if (!actionLoading) setApproveTarget(null);
        }}
        onConfirm={() => void confirmApprove()}
      />

      <Modal
        open={Boolean(rejectTarget)}
        onClose={closeRejectModal}
        title="Reject tutor?"
        description={
          rejectTarget
            ? `${rejectTarget.fullName} cannot sign in until approved again.`
            : undefined
        }
        size="md"
      >
        <div className="space-y-4">
          <TextField
            name="rejectReason"
            label="Reason (optional)"
            placeholder="e.g. Incomplete documents"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={closeRejectModal}
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
      </Modal>
    </div>
  );
}
