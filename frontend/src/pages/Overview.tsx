import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { api } from "../lib/api";
import { CATEGORY_ACCENT, formatCompactMoney, formatDate, formatMoney, initials, relativeTime } from "../lib/format";
import { useShell } from "../lib/shell";
import { cn } from "../lib/utils";
import { MonthChart } from "../components/MonthChart";
import { StatusPill } from "../components/StatusPill";

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="px-5 py-5 first:pl-6 last:pr-6">
      <p className="label">{label}</p>
      <p
        className={cn(
          "mt-2.5 font-display text-[30px] leading-none tracking-tight",
          accent ? "text-lime" : "text-paper",
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-[11.5px] leading-snug text-faint">{hint}</p>
    </div>
  );
}

export function Overview() {
  const { openNewEntry, openEntry } = useShell();
  const statsQuery = useQuery({ queryKey: ["stats"], queryFn: api.getStats });
  const recentQuery = useQuery({
    queryKey: ["entries", { page: 0, size: 6, sortBy: "createdAt", direction: "desc" }],
    queryFn: () => api.listEntries({ page: 0, size: 6, sortBy: "createdAt", direction: "desc" }),
  });

  const stats = statsQuery.data;
  const recent = recentQuery.data?.content ?? [];
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 pb-28 pt-8 md:px-8 md:pt-10 lg:pb-20">
      <div className="animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" />
              Live ledger · {today}
            </p>
            <h1 className="mt-4 font-display text-[44px] leading-[0.92] tracking-[-0.01em] text-paper md:text-[58px]">
              Every entry,
              <br />
              <span className="italic text-lime/90">accounted for.</span>
            </h1>
            <p className="mt-4 max-w-[430px] text-[13.5px] leading-relaxed text-muted">
              Log spend, decisions and deliverables in one ledger. Filter it, total it, and
              always know where the quarter stands.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/entries" className="btn-outline h-10 gap-1.5">
              Browse entries
              <ArrowRight size={14} />
            </Link>
            <button onClick={openNewEntry} className="btn-primary h-10">
              <Plus size={15} strokeWidth={2.4} />
              New entry
            </button>
          </div>
        </div>

        <div className="panel mt-9 grid grid-cols-2 divide-x divide-white/[0.06] overflow-hidden md:grid-cols-4">
          {statsQuery.isLoading || !stats ? (
            [0, 1, 2, 3].map((index) => (
              <div key={index} className="px-6 py-5">
                <div className="skeleton h-2.5 w-20" />
                <div className="skeleton mt-4 h-7 w-24" />
                <div className="skeleton mt-3 h-2.5 w-28" />
              </div>
            ))
          ) : (
            <>
              <Kpi
                label="Total volume"
                value={formatCompactMoney(stats.totalAmount)}
                hint={`Across ${stats.totalEntries} entries · avg ${formatMoney(stats.averageAmount)}`}
                accent
              />
              <Kpi
                label="Entries logged"
                value={String(stats.totalEntries)}
                hint={`${stats.last30Days} added in the last 30 days`}
              />
              <Kpi
                label="Active now"
                value={String(stats.activeCount)}
                hint={`${stats.draftCount} drafts · ${stats.settledCount} settled`}
              />
              <Kpi
                label="Needs attention"
                value={String(stats.draftCount)}
                hint={stats.draftCount === 1 ? "Draft awaiting review" : "Drafts awaiting review"}
              />
            </>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="animate-fade-up animate-delay-1 lg:col-span-2">
          {stats ? (
            <MonthChart data={stats.monthly} />
          ) : (
            <div className="panel h-[306px] p-6">
              <div className="skeleton h-2.5 w-16" />
              <div className="skeleton mt-3 h-5 w-40" />
              <div className="skeleton mt-8 h-[168px] w-full" />
            </div>
          )}
        </div>

        <div className="panel animate-fade-up animate-delay-2 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="label">Distribution</p>
              <h3 className="mt-1.5 font-display text-[22px] leading-none text-paper">By category</h3>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">count</span>
          </div>

          <div className="mt-6 space-y-4">
            {stats
              ? stats.byCategory.slice(0, 6).map((item) => {
                  const width = Math.max(4, Math.round((item.count / Math.max(1, stats.byCategory[0]?.count ?? 1)) * 100));
                  return (
                    <div key={item.category}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[12.5px] text-paper/90">{item.label}</span>
                        <span className="num text-[11px] text-faint">
                          {item.count} · {formatCompactMoney(item.amount)}
                        </span>
                      </div>
                      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", CATEGORY_ACCENT[item.category])}
                          style={{ width: `${width}%`, opacity: item.count === 0 ? 0.2 : 0.85 }}
                        />
                      </div>
                    </div>
                  );
                })
              : [0, 1, 2, 3, 4].map((index) => (
                  <div key={index}>
                    <div className="skeleton h-2.5 w-24" />
                    <div className="skeleton mt-2.5 h-[3px] w-full" />
                  </div>
                ))}
          </div>
        </div>
      </div>

      <div className="panel animate-fade-up animate-delay-3 mt-5 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="label">Latest</p>
            <h3 className="mt-1.5 font-display text-[22px] leading-none text-paper">Recent activity</h3>
          </div>
          <Link
            to="/entries"
            className="group inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-paper"
          >
            View all
            <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="border-t border-white/[0.06]">
          {recentQuery.isLoading &&
            [0, 1, 2, 3].map((index) => (
              <div key={index} className="flex items-center gap-4 border-b border-white/[0.05] px-6 py-3.5">
                <div className="skeleton h-7 w-7 rounded-full" />
                <div className="skeleton h-3 flex-1" />
                <div className="skeleton h-3 w-16" />
              </div>
            ))}

          {recent.map((entry) => (
            <button
              key={entry.id}
              onClick={() => openEntry(entry)}
              className="group flex w-full items-center gap-4 border-b border-white/[0.05] px-6 py-3.5 text-left transition-colors last:border-0 hover:bg-white/[0.025]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] font-mono text-[9px] text-muted">
                {initials(entry.owner)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-paper/95">{entry.title}</span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
                  {entry.reference} · {entry.categoryLabel}
                </span>
              </span>
              <StatusPill status={entry.status} />
              <span className="num hidden w-24 text-right text-[12px] text-paper/80 sm:block">
                {formatMoney(entry.amount, entry.currency)}
              </span>
              <span className="num hidden w-24 text-right text-[11px] text-faint md:block">
                {relativeTime(entry.updatedAt)}
              </span>
              <span className="num w-16 text-right text-[11px] text-faint">
                {formatDate(entry.entryDate, { year: false })}
              </span>
            </button>
          ))}

          {!recentQuery.isLoading && recent.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="font-display text-[20px] text-paper">The ledger is empty.</p>
              <p className="mt-1 text-[12.5px] text-faint">Create your first entry to see it here.</p>
              <button onClick={openNewEntry} className="btn-outline mt-4">
                <Plus size={14} /> New entry
              </button>
            </div>
          )}
        </div>
      </div>

      {statsQuery.isError && (
        <div className="mt-5 rounded-lg border border-rose/30 bg-rose/[0.06] px-4 py-3 text-[12.5px] text-rose">
          Could not reach the API. Start the Spring Boot service on port 8080 and refresh.
        </div>
      )}
    </div>
  );
}
