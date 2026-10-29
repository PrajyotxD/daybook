import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, X } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { Entry, EntryCategory, EntryInput, EntryStatus, Meta } from "../lib/types";
import { cn } from "../lib/utils";
import { useToast } from "./Toasts";

const FALLBACK_CATEGORIES = [
  { value: "OPERATIONS", label: "Operations" },
  { value: "FINANCE", label: "Finance" },
  { value: "ENGINEERING", label: "Engineering" },
  { value: "PRODUCT", label: "Product" },
  { value: "MARKETING", label: "Marketing" },
  { value: "PEOPLE", label: "People" },
  { value: "OTHER", label: "Other" },
];

const FALLBACK_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "SETTLED", label: "Settled" },
  { value: "ARCHIVED", label: "Archived" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "SGD"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  entry: Entry | null;
  meta: Meta | undefined;
  onClose: () => void;
}

export function EntrySheet({ entry, meta, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <SheetInner key={entry?.id ?? "new"} entry={entry} meta={meta} onClose={onClose} />
    </div>
  );
}

function SheetInner({ entry, meta, onClose }: Props) {
  const isEditing = Boolean(entry);
  const queryClient = useQueryClient();
  const { push } = useToast();

  const categories = meta?.categories?.length ? meta.categories : FALLBACK_CATEGORIES;
  const statuses = meta?.statuses?.length ? meta.statuses : FALLBACK_STATUSES;

  const [title, setTitle] = useState(entry?.title ?? "");
  const [category, setCategory] = useState<EntryCategory>(entry?.category ?? "OPERATIONS");
  const [status, setStatus] = useState<EntryStatus>(entry?.status ?? "ACTIVE");
  const [amount, setAmount] = useState(entry?.amount != null ? String(entry.amount) : "");
  const [currency, setCurrency] = useState(entry?.currency ?? "USD");
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? today());
  const [owner, setOwner] = useState(entry?.owner ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [touched, setTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Give the entry a title.";
    if (!entryDate) next.entryDate = "Pick a date.";
    if (amount !== "" && Number.isNaN(Number(amount))) next.amount = "Use a number.";
    if (amount !== "" && Number(amount) < 0) next.amount = "Amount cannot be negative.";
    return next;
  }, [title, entryDate, amount]);

  const payload: EntryInput = {
    title: title.trim(),
    category,
    status,
    amount: amount === "" ? null : Number(amount),
    currency,
    entryDate,
    owner: owner.trim() || null,
    notes: notes.trim() || null,
  };

  const saveMutation = useMutation({
    mutationFn: () => (entry ? api.updateEntry(entry.id, payload) : api.createEntry(payload)),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      push({
        tone: "success",
        title: isEditing ? "Entry updated" : "Entry created",
        description: saved.reference,
      });
      onClose();
    },
    onError: (error) => {
      push({
        tone: "error",
        title: "Could not save entry",
        description: error instanceof ApiError ? error.message : "Unexpected error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteEntry(entry!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      push({ tone: "success", title: "Entry deleted", description: entry?.reference });
      onClose();
    },
    onError: (error) =>
      push({
        tone: "error",
        title: "Could not delete entry",
        description: error instanceof ApiError ? error.message : "Unexpected error",
      }),
  });

  const submit = () => {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    saveMutation.mutate();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const showError = (field: string) => (touched ? errors[field] : undefined);
  const busy = saveMutation.isPending || deleteMutation.isPending;

  return (
    <section
      className="absolute inset-y-0 right-0 flex w-full max-w-[520px] animate-sheet-in flex-col border-l border-white/10 bg-ink-900 shadow-[-30px_0_80px_-30px_rgba(0,0,0,0.9)]"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Edit entry" : "New entry"}
    >
      <header className="flex items-start justify-between border-b border-white/[0.07] px-6 py-5">
        <div>
          <p className="label">{isEditing ? "Edit entry" : "New entry"}</p>
          <h2 className="mt-1.5 font-display text-[26px] leading-none text-paper">
            {isEditing ? entry!.title : "Record something new"}
          </h2>
          {isEditing && (
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
              {entry!.reference} · updated {new Date(entry!.updatedAt).toLocaleDateString("en-GB")}
            </p>
          )}
        </div>
        <button onClick={onClose} className="btn-icon -mr-1 -mt-1" aria-label="Close">
          <X size={16} />
        </button>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-5">
          <div>
            <label className="field-label" htmlFor="entry-title">
              Title
            </label>
            <input
              id="entry-title"
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Q3 cloud spend reconciliation"
              className="input"
              aria-invalid={Boolean(showError("title"))}
            />
            {showError("title") && <p className="mt-1.5 text-[11.5px] text-rose">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="entry-category">
                Category
              </label>
              <select
                id="entry-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as EntryCategory)}
                className="select"
              >
                {categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="entry-status">
                Status
              </label>
              <select
                id="entry-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as EntryStatus)}
                className="select"
              >
                {statuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_104px] gap-4">
            <div>
              <label className="field-label" htmlFor="entry-amount">
                Amount <span className="text-white/20">· optional</span>
              </label>
              <input
                id="entry-amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className={cn("input num", showError("amount") && "border-rose/60")}
                aria-invalid={Boolean(showError("amount"))}
              />
              {showError("amount") && <p className="mt-1.5 text-[11.5px] text-rose">{errors.amount}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="entry-currency">
                Currency
              </label>
              <select
                id="entry-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="select num"
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="entry-date">
                Entry date
              </label>
              <input
                id="entry-date"
                type="date"
                value={entryDate}
                onChange={(event) => setEntryDate(event.target.value)}
                className="input num"
                aria-invalid={Boolean(showError("entryDate"))}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="entry-owner">
                Owner
              </label>
              <input
                id="entry-owner"
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                placeholder="Who logged it?"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="entry-notes">
              Notes
            </label>
            <textarea
              id="entry-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Context, next steps, or anything worth remembering."
              className="textarea"
              maxLength={4000}
            />
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-faint">
              <span>Markdown not supported</span>
              <span>{notes.length}/4000</span>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.015] px-4 py-3.5">
            <p className="label">On save</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">
              {isEditing
                ? "The row is updated in place. The original reference and creation timestamp stay unchanged."
                : "A reference such as ENT-8F3A21C4 is generated automatically, then the entry is written to PostgreSQL and appears in the ledger immediately."}
            </p>
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-white/[0.07] bg-ink-950/40 px-6 py-4">
        {isEditing ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={busy}
                className="btn h-9 bg-rose/90 px-3 text-[12.5px] font-medium text-ink-950 hover:bg-rose"
              >
                {deleteMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                Confirm delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost h-9 px-2 text-[12.5px]">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-ghost h-9 gap-1.5 px-2 text-[12.5px] hover:text-rose"
            >
              <Trash2 size={13} />
              Delete
            </button>
          )
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
            ⌘ + Enter to save
          </span>
        )}

        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn-outline h-9 px-3 text-[12.5px]">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="btn-primary h-9 px-4">
            {saveMutation.isPending && <Loader2 size={13} className="animate-spin" />}
            {isEditing ? "Save changes" : "Create entry"}
          </button>
        </div>
      </footer>
    </section>
  );
}
