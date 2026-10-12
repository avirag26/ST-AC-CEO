"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/TextField";
import { ApiError, api } from "@/lib/api";

export type CatalogItem = {
  id: string;
  name: string;
  isActive: boolean;
};

type CatalogTab = "classes" | "subjects";

const tabItems = [
  { id: "classes" as const, label: "Classes" },
  { id: "subjects" as const, label: "Subjects" },
];

const tabMeta: Record<
  CatalogTab,
  { hint: string; singular: string; placeholder: string }
> = {
  classes: {
    hint: "Shown in tutor registration (for example Class 10).",
    singular: "class",
    placeholder: "e.g. Class 10",
  },
  subjects: {
    hint: "Shown in tutor registration (for example Mathematics).",
    singular: "subject",
    placeholder: "e.g. Mathematics",
  },
};

export function CatalogManager() {
  const [activeTab, setActiveTab] = useState<CatalogTab>("classes");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [listError, setListError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | undefined>();
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const endpoint =
    activeTab === "classes" ? "/catalog/classes" : "/catalog/subjects";
  const meta = tabMeta[activeTab];

  const loadItems = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const { data } = await api.get<CatalogItem[]>(endpoint);
      setItems(data);
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
  }, [endpoint]);

  useEffect(() => {
    setName("");
    setFieldError(undefined);
    setSuccess(null);
    setEditingId(null);
    setEditName("");
    setEditError(undefined);
    setDeleteTarget(null);
    void loadItems();
  }, [loadItems]);

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
      await api.post(endpoint, { name: trimmed });
      setName("");
      setSuccess(`“${trimmed}” was added.`);
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
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`${endpoint}/${deleteTarget.id}`);
      setSuccess(`“${deleteTarget.name}” was deleted.`);
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) {
        cancelEdit();
      }
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & Subjects"
        description="Manage the lists tutors choose when they register. Keep names clear so parents and teachers understand them easily."
      />

      <Tabs
        label="Catalog type"
        items={tabItems}
        value={activeTab}
        onChange={setActiveTab}
      />

      <Card>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-text">
              Add a new {meta.singular}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">{meta.hint}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void loadItems()}>
            Refresh list
          </Button>
        </div>

        <form
          onSubmit={handleCreate}
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start"
          noValidate
        >
          <div className="flex-1">
            <TextField
              name="catalogName"
              label={`${meta.singular[0].toUpperCase()}${meta.singular.slice(1)} name`}
              placeholder={meta.placeholder}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (fieldError) {
                  setFieldError(undefined);
                }
              }}
              error={fieldError}
            />
          </div>
          <div className="sm:pt-7">
            <Button
              type="submit"
              fullWidth
              isLoading={saving}
              className="sm:min-w-36 sm:w-auto"
            >
              Add {meta.singular}
            </Button>
          </div>
        </form>

        {success ? (
          <Alert variant="success" className="mt-4">
            {success}
          </Alert>
        ) : null}
      </Card>

      <Card padding="sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-sm font-semibold text-text">
              Current {activeTab}
            </h3>
            <p className="text-xs text-text-secondary">
              {loading ? "Loading…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="h-14 animate-pulse rounded-xl bg-surface-muted"
                />
              ))}
            </div>
          ) : listError ? (
            <Alert variant="error">{listError}</Alert>
          ) : items.length === 0 ? (
            <EmptyState
              title={`No ${activeTab} yet`}
              description={`Add the first ${meta.singular} using the form above.`}
            />
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const isEditing = editingId === item.id;

                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-border bg-surface-muted/40 p-3 sm:p-4"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <TextField
                          name={`edit-${item.id}`}
                          label={`Edit ${meta.singular}`}
                          value={editName}
                          onChange={(event) => {
                            setEditName(event.target.value);
                            if (editError) {
                              setEditError(undefined);
                            }
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
                            Save changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-xs text-text-secondary">
                            Available for tutor registration
                          </p>
                        </div>
                        <div className="flex gap-2">
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
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete this ${meta.singular}?`}
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed from the registration lists. You can add it again later if needed.`
            : ""
        }
        confirmLabel="Delete"
        danger
        isLoading={deleting}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
