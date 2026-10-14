"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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

export type CatalogItem = {
  id: string;
  name: string;
  isActive: boolean;
};

type BatchListItem = {
  id: string;
  name: string;
  isActive: boolean;
  studentCount: number;
  classGrade: { id: string; name: string };
  tutor: { fullName: string } | null;
};

type CatalogTab = "classes" | "subjects";

const tabItems = [
  { id: "classes" as const, label: "Classes" },
  { id: "subjects" as const, label: "Subjects" },
];

const tabMeta: Record<
  CatalogTab,
  { singular: string; placeholder: string }
> = {
  classes: { singular: "class", placeholder: "e.g. Class 10" },
  subjects: { singular: "subject", placeholder: "e.g. Mathematics" },
};

export function CatalogManager() {
  const [activeTab, setActiveTab] = useState<CatalogTab>("classes");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [name, setName] = useState("");
  const [firstBatchName, setFirstBatchName] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [listError, setListError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | undefined>();
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [newBatchName, setNewBatchName] = useState("");
  const [batchError, setBatchError] = useState<string | undefined>();
  const [batchSaving, setBatchSaving] = useState(false);

  const endpoint =
    activeTab === "classes" ? "/catalog/classes" : "/catalog/subjects";
  const meta = tabMeta[activeTab];

  const getSearchText = useCallback((item: CatalogItem) => item.name, []);
  const list = useClientList({
    items,
    getSearchText,
    filterKey: activeTab,
    pageSize: 10,
  });

  const loadBatches = useCallback(async () => {
    try {
      const { data } = await api.get<BatchListItem[]>("/batches");
      setBatches(data);
    } catch {
      setBatches([]);
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const { data } = await api.get<CatalogItem[]>(endpoint);
      setItems(data);
      if (activeTab === "classes") await loadBatches();
    } catch (error) {
      setItems([]);
      setListError(
        error instanceof ApiError
          ? error.message
          : "Could not load the list. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint, activeTab, loadBatches]);

  useEffect(() => {
    setName("");
    setFirstBatchName("");
    setFieldError(undefined);
    setSuccess(null);
    setEditingId(null);
    setCreateOpen(false);
    setExpandedClassId(null);
    void loadItems();
  }, [loadItems]);

  function batchesForClass(classId: string) {
    return batches.filter((b) => b.classGrade.id === classId);
  }

  function openCreate() {
    setName("");
    setFirstBatchName("");
    setFieldError(undefined);
    setSuccess(null);
    setCreateOpen(true);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setFieldError(`Enter a ${meta.singular} name.`);
      return;
    }

    setSaving(true);
    setFieldError(undefined);
    try {
      const { data: created } = await api.post<CatalogItem>(endpoint, {
        name: trimmed,
      });

      const batchTrimmed = firstBatchName.trim();
      if (activeTab === "classes" && batchTrimmed) {
        await api.post("/batches", {
          name: batchTrimmed,
          classGradeId: created.id,
        });
        setSuccess(`“${trimmed}” added with batch “${batchTrimmed}”.`);
      } else {
        setSuccess(`“${trimmed}” added.`);
      }

      setName("");
      setFirstBatchName("");
      setCreateOpen(false);
      await loadItems();
    } catch (error) {
      setFieldError(
        error instanceof ApiError
          ? error.message
          : `Could not add this ${meta.singular}.`,
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: CatalogItem) {
    setSuccess(null);
    setEditingId(item.id);
    setEditName(item.name);
    setEditError(undefined);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditError(undefined);
  }

  async function saveEdit(itemId: string) {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError(`Enter a ${meta.singular} name.`);
      return;
    }
    setEditSaving(true);
    setEditError(undefined);
    try {
      await api.patch(`${endpoint}/${itemId}`, { name: trimmed });
      setSuccess(`Updated to “${trimmed}”.`);
      cancelEdit();
      await loadItems();
    } catch (error) {
      setEditError(
        error instanceof ApiError
          ? error.message
          : `Could not update this ${meta.singular}.`,
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`${endpoint}/${deleteTarget.id}`);
      setSuccess(`“${deleteTarget.name}” deleted.`);
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) cancelEdit();
      await loadItems();
    } catch (error) {
      setListError(
        error instanceof ApiError
          ? error.message
          : `Could not delete this ${meta.singular}.`,
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddBatch(classGradeId: string) {
    const trimmed = newBatchName.trim();
    if (!trimmed) {
      setBatchError("Enter a batch name.");
      return;
    }
    setBatchSaving(true);
    setBatchError(undefined);
    setSuccess(null);
    try {
      await api.post("/batches", { name: trimmed, classGradeId });
      setNewBatchName("");
      setSuccess(`Batch “${trimmed}” added.`);
      await loadBatches();
    } catch (error) {
      setBatchError(
        error instanceof ApiError ? error.message : "Could not create batch.",
      );
    } finally {
      setBatchSaving(false);
    }
  }

  const pageTitle = useMemo(
    () => (activeTab === "classes" ? "Classes" : "Subjects"),
    [activeTab],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & subjects"
        description="Manage catalog items used for tutor signup and student enrollment."
        action={
          <Button onClick={openCreate}>
            Add {meta.singular}
          </Button>
        }
      />

      <Tabs
        label="Catalog type"
        items={tabItems}
        value={activeTab}
        onChange={setActiveTab}
      />

      {success ? <Alert variant="success">{success}</Alert> : null}

      <ListToolbar
        search={list.query}
        onSearchChange={list.setQuery}
        searchPlaceholder={`Search ${activeTab}…`}
        resultLabel={
          loading
            ? "Loading…"
            : `${list.filteredCount} of ${list.totalCount} ${pageTitle.toLowerCase()}`
        }
        actions={
          <Button variant="secondary" onClick={() => void loadItems()}>
            Refresh
          </Button>
        }
      />

      <Card padding="sm">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="h-14 animate-pulse rounded-xl bg-surface-muted"
              />
            ))}
          </div>
        ) : listError ? (
          <div className="p-4">
            <Alert variant="error">{listError}</Alert>
          </div>
        ) : list.filteredCount === 0 ? (
          <EmptyState
            title={items.length === 0 ? `No ${activeTab} yet` : "No matches"}
            description={
              items.length === 0
                ? `Click Add ${meta.singular} to create the first one.`
                : "Try a different search."
            }
          />
        ) : (
          <ul className="space-y-2 p-3 sm:p-4">
            {list.pageItems.map((item) => {
              const isEditing = editingId === item.id;
              const classBatches =
                activeTab === "classes" ? batchesForClass(item.id) : [];
              const expanded = expandedClassId === item.id;

              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-border bg-surface-muted/40 p-3 sm:p-4"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <TextField
                        name={`edit-${item.id}`}
                        label={`Edit ${meta.singular}`}
                        value={editName}
                        onChange={(event) => {
                          setEditName(event.target.value);
                          if (editError) setEditError(undefined);
                        }}
                        error={editError}
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={cancelEdit}
                          disabled={editSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          isLoading={editSaving}
                          onClick={() => void saveEdit(item.id)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-xs text-text-secondary">
                            {activeTab === "classes"
                              ? `${classBatches.length} batch${classBatches.length === 1 ? "" : "es"}`
                              : "Active"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {activeTab === "classes" ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setExpandedClassId(expanded ? null : item.id);
                                setNewBatchName("");
                                setBatchError(undefined);
                              }}
                            >
                              {expanded ? "Hide batches" : "Batches"}
                            </Button>
                          ) : null}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => startEdit(item)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="dangerOutline"
                            size="sm"
                            onClick={() => {
                              setSuccess(null);
                              setDeleteTarget(item);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      {activeTab === "classes" && expanded ? (
                        <div className="mt-4 space-y-3 border-t border-border pt-4">
                          {classBatches.length === 0 ? (
                            <p className="text-sm text-text-secondary">
                              No batches under {item.name} yet.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {classBatches.map((batch) => (
                                <li
                                  key={batch.id}
                                  className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                                >
                                  <p className="font-medium text-text">
                                    {batch.name}
                                  </p>
                                  <p className="text-xs text-text-secondary">
                                    {batch.studentCount} students
                                    {batch.tutor
                                      ? ` · ${batch.tutor.fullName}`
                                      : " · No tutor"}
                                    {batch.isActive ? "" : " · Inactive"}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                            <div className="flex-1">
                              <TextField
                                name={`batch-${item.id}`}
                                label="New batch name"
                                placeholder="e.g. Morning A"
                                value={newBatchName}
                                onChange={(e) => {
                                  setNewBatchName(e.target.value);
                                  if (batchError) setBatchError(undefined);
                                }}
                                error={batchError}
                              />
                            </div>
                            <div className="sm:pt-7">
                              <Button
                                size="sm"
                                isLoading={batchSaving}
                                onClick={() => void handleAddBatch(item.id)}
                              >
                                Add batch
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </li>
              );
            })}
            <Pagination
              page={list.page}
              totalPages={list.totalPages}
              totalItems={list.filteredCount}
              pageSize={list.pageSize}
              onPageChange={list.setPage}
            />
          </ul>
        )}
      </Card>

      <Modal
        open={createOpen}
        onClose={() => {
          if (!saving) setCreateOpen(false);
        }}
        title={`Add ${meta.singular}`}
        description={
          activeTab === "classes"
            ? "Classes appear in student and tutor forms."
            : "Subjects appear in tutor registration."
        }
      >
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          <TextField
            name="catalogName"
            label={`${meta.singular[0].toUpperCase()}${meta.singular.slice(1)} name`}
            placeholder={meta.placeholder}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (fieldError) setFieldError(undefined);
            }}
            error={fieldError}
          />
          {activeTab === "classes" ? (
            <TextField
              name="firstBatchName"
              label="First batch (optional)"
              placeholder="e.g. Morning A"
              value={firstBatchName}
              onChange={(event) => setFirstBatchName(event.target.value)}
            />
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Add {meta.singular}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete this ${meta.singular}?`}
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed. You can add it again later.`
            : ""
        }
        confirmLabel="Delete"
        danger
        isLoading={deleting}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
