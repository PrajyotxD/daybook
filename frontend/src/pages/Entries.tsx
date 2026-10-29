import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { EntryCategory, EntryQuery, EntryStatus } from "../lib/types";
import { formatDate, formatMoney, initials } from "../lib/format";
import { useShell } from "../lib/shell";
import { cn } from "../lib/utils";
import { StatusPill } from "../components/StatusPill";
import { useToast } from "../components/Toasts";

const STATUS_TABS: { value: EntryStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "SETTLED", label: "Settled" },
  { value: "ARCHIVED", label: "Archived" },
];

const SORTS = [
  { value: "entryDate:desc", label: "Newest first" },
  { value: "entryDate:asc", label: "Oldest first" },
  { value: "amount:desc", label: "Amount · high to low" },
  { value: "amount:asc", label: "Amount · low to high" },
  { value: "title:asc", label: "Title · A to Z" },
  { value: "createdAt:desc", label: "Recently added" },
];

export function Entries() {
  const { openNewEntry, openEntry } = useShell();
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const q = params.get("q") ?? "";
  const status = (params.get("status") ?? "") as EntryStatus | "";
  const category = (params.get("category") ?? "") as EntryCategory | "";
  const page = Number(params.get("page") ?? 0);
  const sortBy = params.get("sortBy") ?? "entryDate";
  const direction = (params.get("direction") ?? "desc") as "asc" | "desc";
  const size = 20;

  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);

  const update = (patch: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === null) next.delete(key);
      else next.set(key, String(value));
    });
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (draft === q) return;
    const timer = window.setTimeout(() => update({ q: draft, page: 0 }), 320);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        document.getElementById("entry-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const query: EntryQuery = {
    q,
    status,
    category,
    page,
    size,
    sortBy,
    direction,
  };

  const entriesQuery = useQuery({
    queryKey: ["entries", query],
    queryFn: () => api.listEntries(query),
    placeholderData: (previous) => previous,
  });

  const metaQuery = useQuery({ queryKey: ["meta"], queryFn: api.getMeta, staleTime: 300_000 });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      push({ tone: "success", title: "Entry deleted" });
      setConfirmId(null);
    },
    onError: (error) =>
      push({
        tone: "error",
        title: "Could not delete entry",
        description: error instanceof ApiError ? error.message : "Unexpected error",
      }),
  });

  const data = entriesQuery.data;
  const rows = data?.content ?? [];
  const filtersActive = Boolean(q || status || category);

  const range = useMemo(() => {
    if (!data || data.totalElements === 0) return "0";
    const start = data.page * data.size + 1;
    const end = Math.min(data.totalElements, start + data.content.length - 1);
    return `${start}–${end}`;
  }, [data]);

  const toggleSort = (field: "entryDate" | "amount") => {
    const nextDirection = sortBy === field && direction === "desc" ? "asc" : "desc";
    update({ sortBy: field, direction: nextDirection, page: 0 });
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const header = ["Reference", "Title", "Category", "Status", "Date", "Amount", "Currency", "Owner", "Notes"];
    const lines = rows.map((entry) =>
      [
        entry.reference,
        entry.title,
        entry.categoryLabel,
        entry.statusLabel,
        entry.entryDate,
        entry.amount ?? "",
        entry.currency,
        entry.owner ?? "",
        (entry.notes ?? "").replace(/\s+/g, " "),
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `entries-page-${(data?.page ?? 0) + 1}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    push({ tone: "info", title: "CSV exported", description: `${rows.length} rows` });
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 pb-28 pt-8 md:px-8 md:pt-10 lg:pb-20">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="label">Ledger</p>
          <div className="mt-3 flex items-baseline gap-3">
            <h1 className="font-display text-[42px] leading-none text-paper md:text-[50px]">Entries</h1>
            <span className="num text-[12px] text-faint">
              {data ? `${data.totalElements} total` : "—"}
            </span>
          </div>
          <p className="mt-3 max-w-[440px] text-[13px] leading-relaxed text-muted">
            Search, filter and settle every record. Changes are written straight to the ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="btn-outline h-10" disabled={!rows.length}>
            <Download size={14} />
            Export
          </button>
          <button onClick={openNewEntry} className="btn-primary h-10">
            <Plus size={15} strokeWidth={2.4} />
            New entry
          </button>
        </div>
      </div>

      <div className="panel animate-fade-up animate-delay-1 mt-8">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              id="entry-search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search title, owner, notes or reference…"
              className="input pl-9 pr-9"
            />
            {draft ? (
              <button
                onClick={() => setDraft("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-paper"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="kbd absolute right-2.5 top-1/2 -translate-y-1/2">/</kbd>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="scroll-thin flex overflow-x-auto rounded-lg border border-white/[0.08] bg-ink-900/70 p-[3px]">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => update({ status: tab.value, page: 0 })}
                  className={cn(
                    "shrink-0 rounded-[6px] px-2.5 py-1.5 text-[11.5px] transition-colors",
                    status === tab.value
                      ? "bg-white/[0.09] text-paper"
                      : "text-faint hover:text-muted",
                    tab.value === "ARCHIVED" && "hidden xl:block",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={category}
                onChange={(event) => update({ category: event.target.value, page: 0 })}
                className="select min-w-0 flex-1 sm:w-[150px] sm:flex-none"
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {(metaQuery.data?.categories ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={`${sortBy}:${direction}`}
                onChange={(event) => {
                  const [nextSortBy, nextDirection] = event.target.value.split(":");
                  update({ sortBy: nextSortBy, direction: nextDirection, page: 0 });
                }}
                className="select min-w-0 flex-1 sm:w-[176px] sm:flex-none"
                aria-label="Sort entries"
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {filtersActive && (
                <button
                  onClick={() => {
                    setDraft("");
                    setParams(new URLSearchParams(), { replace: true });
                  }}
                  className="btn-ghost h-10 shrink-0 px-2.5 text-[12px]"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: stacked rows keep the ledger readable without horizontal scrolling. */}
        <div className="divide-y divide-white/[0.06] md:hidden">
          {entriesQuery.isLoading &&
            [0, 1, 2, 3].map((index) => (
              <div key={index} className="px-4 py-4">
                <div className="skeleton h-3 w-40" />
                <div className="skeleton mt-3 h-2.5 w-24" />
              </div>
            ))}
          {rows.map((entry) => (
            <button
              key={entry.id}
              onClick={() => openEntry(entry)}
              className="flex w-full flex-col gap-2.5 px-4 py-3.5 text-left transition-colors active:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium leading-snug text-paper/95">{entry.title}</p>
                <span className="num shrink-0 text-[12.5px] text-paper/90">
                  {formatMoney(entry.amount, entry.currency)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={entry.status} />
                <span className="truncate font-mono text-[9px] uppercase tracking-[0.08em] text-faint">
                  {entry.reference}
                </span>
                <span className="num ml-auto shrink-0 text-[10.5px] text-faint">
                  {formatDate(entry.entryDate, { year: false })}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="text-faint">
                <th className="label px-6 py-3 font-normal">Entry</th>
                <th className="label px-4 py-3 font-normal">Category</th>
                <th className="label px-4 py-3 font-normal">Status</th>
                <th className="label px-4 py-3 font-normal">
                  <button
                    onClick={() => toggleSort("entryDate")}
                    className="inline-flex items-center gap-1 transition-colors hover:text-paper"
                  >
                    Date
                    {sortBy === "entryDate" &&
                      (direction === "desc" ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                  </button>
                </th>
                <th className="label px-4 py-3 text-right font-normal">
                  <button
                    onClick={() => toggleSort("amount")}
                    className="inline-flex items-center gap-1 transition-colors hover:text-paper"
                  >
                    Amount
                    {sortBy === "amount" &&
                      (direction === "desc" ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                  </button>
                </th>
                <th className="w-[92px] px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {entriesQuery.isLoading &&
                [0, 1, 2, 3, 4, 5].map((index) => (
                  <tr key={index} className="border-t border-white/[0.06]">
                    <td className="px-6 py-4">
                      <div className="skeleton h-3 w-56" />
                      <div className="skeleton mt-2 h-2.5 w-32" />
                    </td>
                    <td className="px-4 py-4"><div className="skeleton h-3 w-20" /></td>
                    <td className="px-4 py-4"><div className="skeleton h-4 w-16 rounded-full" /></td>
                    <td className="px-4 py-4"><div className="skeleton h-3 w-20" /></td>
                    <td className="px-4 py-4"><div className="skeleton ml-auto h-3 w-20" /></td>
                    <td />
                  </tr>
                ))}

              {rows.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => openEntry(entry)}
                  className="row group cursor-pointer"
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] font-mono text-[9px] text-muted">
                        {initials(entry.owner)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-paper/95">{entry.title}</p>
                        <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-faint">
                          {entry.reference}
                          {entry.owner ? ` · ${entry.owner}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-muted">{entry.categoryLabel}</td>
                  <td className="px-4 py-3.5">
                    <StatusPill status={entry.status} />
                  </td>
                  <td className="num px-4 py-3.5 text-[11.5px] text-muted">{formatDate(entry.entryDate)}</td>
                  <td className="num px-4 py-3.5 text-right text-[12.5px] text-paper/90">
                    {formatMoney(entry.amount, entry.currency)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div
                      className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {confirmId === entry.id ? (
                        <div className="flex items-center gap-1 rounded-md border border-rose/30 bg-rose/[0.08] px-1.5 py-1">
                          <button
                            onClick={() => deleteMutation.mutate(entry.id)}
                            className="text-[10.5px] font-medium text-rose hover:underline"
                          >
                            Delete
                          </button>
                          <span className="text-white/15">|</span>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-[10.5px] text-faint hover:text-paper"
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(entry.id)}
                          className="btn-icon h-7 w-7 hover:text-rose"
                          aria-label={`Delete ${entry.title}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!entriesQuery.isLoading && rows.length === 0 && (
          <div className="px-6 py-20 text-center">
            <p className="font-display text-[26px] text-paper">
              {filtersActive ? "Nothing matches those filters." : "No entries yet."}
            </p>
            <p className="mx-auto mt-2 max-w-[360px] text-[12.5px] leading-relaxed text-faint">
              {filtersActive
                ? "Try a broader search, or clear the filters to see the full ledger."
                : "Entries you create are stored in PostgreSQL and appear here instantly."}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              {filtersActive ? (
                <button
                  onClick={() => {
                    setDraft("");
                    setParams(new URLSearchParams(), { replace: true });
                  }}
                  className="btn-outline"
                >
                  Clear filters
                </button>
              ) : (
                <button onClick={openNewEntry} className="btn-primary">
                  <Plus size={14} /> New entry
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-3.5">
          <p className="num text-[11px] text-faint">
            {data && data.totalElements > 0
              ? `Showing ${range} of ${data.totalElements}`
              : "No records"}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => update({ page: Math.max(0, page - 1) })}
              disabled={!data || data.first}
              className="btn-outline h-8 w-8 p-0 disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="num px-2 text-[11px] text-muted">
              {data ? `${data.page + 1} / ${Math.max(1, data.totalPages)}` : "1 / 1"}
            </span>
            <button
              onClick={() => update({ page: page + 1 })}
              disabled={!data || data.last}
              className="btn-outline h-8 w-8 p-0 disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {entriesQuery.isError && (
        <div className="mt-4 rounded-lg border border-rose/30 bg-rose/[0.06] px-4 py-3 text-[12.5px] text-rose">
          Could not load entries. Check that the API is running on port 8080.
        </div>
      )}
    </div>
  );
}
