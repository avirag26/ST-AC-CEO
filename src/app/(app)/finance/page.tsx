"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth-storage";
import { useClientList } from "@/lib/useClientList";

type Fee = {
  id: string;
  title: string;
  student: { fullName: string };
  amount: number;
  balance: number;
  paid: number;
  currency: string;
  dueAt: string;
  payments: {
    id: string;
    amount: number;
    reference: string;
    createdAt: string;
  }[];
};

type Salary = {
  id: string;
  period: string;
  amount: number;
  currency: string;
  reference: string;
  tutorProfile: { user: { fullName: string } };
};

type Options = {
  students: { id: string; fullName: string }[];
  tutors: { id: string; user: { fullName: string } }[];
};

const selectClass =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary";

function money(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(n / 100);
}

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Could not save. Please try again.";
}

function PaymentForm({ fee, refresh }: { fee: Fee; refresh: () => void }) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [requestId, setRequestId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setRequestId(crypto.randomUUID()), []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/finance/fees/" + fee.id + "/payments", {
        amount: Math.round(Number(amount) * 100),
        reference,
        requestId,
      });
      setRequestId(crypto.randomUUID());
      setAmount("");
      setReference("");
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 space-y-3 border-t border-border pt-4"
    >
      <p className="text-sm text-text-secondary">
        Record a payment already received.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label={`Amount (${fee.currency})`}
          required
          type="number"
          min="0.01"
          step="0.01"
          max={fee.balance / 100}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setRequestId(crypto.randomUUID());
          }}
        />
        <TextField
          label="Receipt / reference"
          required
          maxLength={150}
          value={reference}
          onChange={(e) => {
            setReference(e.target.value);
            setRequestId(crypto.randomUUID());
          }}
        />
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Button type="submit" isLoading={busy} disabled={!requestId}>
        Record payment
      </Button>
    </form>
  );
}

type KindTab = "fees" | "salaries";

export default function FinancePage() {
  const [role, setRole] = useState("");
  const [fees, setFees] = useState<Fee[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [kind, setKind] = useState<KindTab>("fees");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [feeStatusFilter, setFeeStatusFilter] = useState("all");

  const manager = role === "CEO" || role === "ADMIN";
  const tutor =
    role === "HOME_TUTOR" || role === "OFFLINE_TUTOR";
  const parent = role === "PARENT";

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      window.location.replace("/login");
      return;
    }
    setRole(user.role);
    const isTutor =
      user.role === "HOME_TUTOR" || user.role === "OFFLINE_TUTOR";
    if (isTutor) setKind("salaries");
    const manage = user.role === "CEO" || user.role === "ADMIN";
    setLoading(true);
    setError("");
    const jobs: Promise<unknown>[] = [];
    if (!isTutor) {
      jobs.push(
        api.get<Fee[]>("/finance/fees").then((r) => setFees(r.data)),
      );
    }
    if (user.role !== "PARENT") {
      jobs.push(
        api.get<Salary[]>("/finance/salaries").then((r) => setSalaries(r.data)),
      );
    }
    if (manage) {
      jobs.push(
        api.get<Options>("/exams/options").then((r) => setOptions(r.data)),
      );
    }
    Promise.all(jobs)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [revision]);

  const refresh = () => setRevision((v) => v + 1);

  const feeMatches = useCallback(
    (fee: Fee) => {
      if (feeStatusFilter === "all") return true;
      if (feeStatusFilter === "paid") return fee.balance === 0;
      return fee.balance > 0;
    },
    [feeStatusFilter],
  );

  const feeList = useClientList({
    items: fees,
    getSearchText: (fee) =>
      [fee.title, fee.student.fullName].join(" "),
    matchesFilters: feeMatches,
    filterKey: feeStatusFilter,
    pageSize: 10,
  });

  const salaryList = useClientList({
    items: salaries,
    getSearchText: (s) =>
      [s.tutorProfile.user.fullName, s.reference, s.period].join(" "),
    pageSize: 10,
  });

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError("");
    setSuccess("");
    const amount = Math.round(Number(fields.get("amount")) * 100);
    const currency = String(fields.get("currency"));
    try {
      const payload =
        kind === "fees"
          ? {
              studentId: fields.get("person"),
              title: fields.get("title"),
              dueAt: new Date(String(fields.get("date"))).toISOString(),
              amount,
              currency,
            }
          : {
              tutorProfileId: fields.get("person"),
              period: fields.get("date"),
              reference: fields.get("title"),
              amount,
              currency,
            };
      await api.post("/finance/" + kind, payload);
      form.reset();
      setCreateOpen(false);
      setSuccess(kind === "fees" ? "Fee added." : "Salary recorded.");
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const pageTitle = parent
    ? "Fees"
    : manager
      ? "Finance"
      : "Salaries";

  const pageDescription = parent
    ? "Fee balances and payment history."
    : manager
      ? "Student fees and tutor salaries."
      : "Your salary payment history.";

  const showFees = !tutor && (manager ? kind === "fees" : true);
  const activeList = showFees ? feeList : salaryList;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        action={
          manager ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              {kind === "fees" ? "Add fee" : "Record salary"}
            </Button>
          ) : null
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      {manager ? (
        <Tabs
          label="Record type"
          value={kind}
          onChange={setKind}
          items={[
            { id: "fees", label: "Student fees" },
            { id: "salaries", label: "Tutor salaries" },
          ]}
        />
      ) : null}

      <ListToolbar
        search={activeList.query}
        onSearchChange={activeList.setQuery}
        searchPlaceholder={
          showFees ? "Search fees…" : "Search salaries…"
        }
        filters={
          showFees && !tutor
            ? [
                {
                  id: "status",
                  label: "Balance",
                  value: feeStatusFilter,
                  onChange: setFeeStatusFilter,
                  options: [
                    { value: "all", label: "All" },
                    { value: "due", label: "Balance due" },
                    { value: "paid", label: "Paid" },
                  ],
                },
              ]
            : []
        }
        resultLabel={
          loading
            ? "Loading…"
            : `${activeList.filteredCount} of ${activeList.totalCount} records`
        }
        actions={
          <Button
            variant="secondary"
            isLoading={loading}
            onClick={refresh}
          >
            Refresh
          </Button>
        }
      />

      {loading ? (
        <Card>
          <p role="status" className="text-sm text-text-secondary">
            Loading…
          </p>
        </Card>
      ) : showFees ? (
        feeList.pageItems.length === 0 ? (
          <EmptyState title="No fees" />
        ) : (
          <div className="space-y-4">
            {feeList.pageItems.map((fee) => (
              <Card key={fee.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-text-secondary">
                      {fee.student.fullName}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-text">
                      {fee.title}
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      Due {new Date(fee.dueAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs font-medium " +
                        (fee.balance === 0
                          ? "bg-green-50 text-success"
                          : "bg-amber-50 text-warning")
                      }
                    >
                      {fee.balance === 0 ? "Paid" : "Balance due"}
                    </span>
                    <p className="mt-3 text-2xl font-semibold tabular-nums text-text">
                      {money(fee.balance, fee.currency)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-text-secondary">
                  Total {money(fee.amount, fee.currency)} · Received{" "}
                  {money(fee.paid, fee.currency)}
                </p>
                {fee.payments.length > 0 ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-primary">
                      Payments ({fee.payments.length})
                    </summary>
                    <ul className="mt-3 divide-y divide-border">
                      {fee.payments.map((p) => (
                        <li className="break-words py-3 text-sm" key={p.id}>
                          <strong>{money(p.amount, fee.currency)}</strong> ·{" "}
                          {new Date(p.createdAt).toLocaleDateString()}
                          <p className="text-text-secondary">{p.reference}</p>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                {manager && fee.balance > 0 ? (
                  <PaymentForm fee={fee} refresh={refresh} />
                ) : null}
              </Card>
            ))}
            <Pagination
              page={feeList.page}
              totalPages={feeList.totalPages}
              totalItems={feeList.filteredCount}
              pageSize={feeList.pageSize}
              onPageChange={feeList.setPage}
            />
          </div>
        )
      ) : salaryList.pageItems.length === 0 ? (
        <EmptyState title="No salary records" />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {salaryList.pageItems.map((s) => (
              <Card key={s.id}>
                <p className="text-xs font-medium text-text-secondary">
                  {s.period}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-text">
                  {s.tutorProfile.user.fullName}
                </h2>
                <p className="mt-3 text-2xl font-semibold tabular-nums text-text">
                  {money(s.amount, s.currency)}
                </p>
                <p className="mt-3 break-words text-sm text-text-secondary">
                  Reference: {s.reference}
                </p>
              </Card>
            ))}
          </div>
          <Pagination
            page={salaryList.page}
            totalPages={salaryList.totalPages}
            totalItems={salaryList.filteredCount}
            pageSize={salaryList.pageSize}
            onPageChange={salaryList.setPage}
          />
        </div>
      )}

      {manager && options ? (
        <Modal
          open={createOpen}
          onClose={() => {
            if (!busy) setCreateOpen(false);
          }}
          title={kind === "fees" ? "Add student fee" : "Record salary paid"}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="finance-create-form"
                isLoading={busy}
              >
                {kind === "fees" ? "Add fee" : "Save salary"}
              </Button>
            </div>
          }
        >
          <form
            id="finance-create-form"
            onSubmit={create}
            className="space-y-4"
            key={kind}
          >
            <label className="block text-sm font-medium text-text">
              {kind === "fees" ? "Student" : "Tutor"}
              <select name="person" required className={selectClass + " mt-1.5"}>
                <option value="">Choose</option>
                {kind === "fees"
                  ? options.students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                      </option>
                    ))
                  : options.tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.user.fullName}
                      </option>
                    ))}
              </select>
            </label>
            <TextField
              name="title"
              label={kind === "fees" ? "Fee description" : "Payment reference"}
              required
              minLength={2}
              maxLength={150}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                name="amount"
                label="Amount (INR)"
                required
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
              />
              <TextField
                name="currency"
                label="Currency"
                defaultValue="INR"
                readOnly
              />
              <TextField
                name="date"
                label={kind === "fees" ? "Due date" : "Salary month"}
                required
                type={kind === "fees" ? "date" : "month"}
              />
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
