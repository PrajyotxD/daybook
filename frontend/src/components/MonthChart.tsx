import { useMemo, useState } from "react";
import type { MonthlyPoint } from "../lib/types";
import { formatCompactMoney, formatMoney, formatMonth } from "../lib/format";
import { cn } from "../lib/utils";

export function MonthChart({ data, currency = "USD" }: { data: MonthlyPoint[]; currency?: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = useMemo(() => Math.max(1, ...data.map((point) => point.count)), [data]);
  const total = data.reduce((sum, point) => sum + point.count, 0);
  const amount = data.reduce((sum, point) => sum + point.amount, 0);
  const lastIndex = data.length - 1;

  return (
    <div className="panel p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="label">Volume</p>
          <h3 className="mt-1.5 font-display text-[22px] leading-none text-paper">Entries per month</h3>
        </div>
        <div className="text-right">
          <p className="num text-[13px] text-paper">{total} entries</p>
          <p className="num mt-1 text-[11px] text-faint">{formatCompactMoney(amount, currency)} logged</p>
        </div>
      </div>

      <div className="relative mt-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[168px] flex-col justify-between">
          {[0, 1, 2, 3].map((line) => (
            <div key={line} className="h-px w-full bg-white/[0.05]" />
          ))}
        </div>

        <div className="relative flex h-[168px] items-end gap-2.5">
          {data.map((point, index) => {
            const height = Math.max(3, Math.round((point.count / max) * 100));
            const isCurrent = index === lastIndex;
            return (
              <div
                key={point.month}
                className="group relative flex h-full flex-1 cursor-default flex-col justify-end"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="relative w-full overflow-hidden rounded-[3px] bg-white/[0.035]" style={{ height: "100%" }}>
                  <div
                    className={cn(
                      "absolute inset-x-0 bottom-0 rounded-[3px] transition-all duration-300 ease-out",
                      isCurrent ? "bg-lime" : "bg-lime/35",
                      hovered === index && !isCurrent && "bg-lime/60",
                    )}
                    style={{ height: `${height}%` }}
                  />
                </div>

                <div
                  className={cn(
                    "pointer-events-none absolute -top-1 left-1/2 z-10 w-max -translate-x-1/2 -translate-y-full rounded-md border border-white/10 bg-ink-800 px-2.5 py-1.5 opacity-0 shadow-lg transition-opacity duration-150",
                    hovered === index && "opacity-100",
                  )}
                >
                  <p className="num text-[11px] text-paper">{point.count} entries</p>
                  <p className="num text-[10px] text-faint">{formatMoney(point.amount, currency)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2.5 border-t border-white/[0.06] pt-3">
          {data.map((point, index) => (
            <div key={point.month} className="flex-1 text-center">
              <span
                className={cn(
                  "font-mono text-[9.5px] uppercase tracking-[0.1em]",
                  index === lastIndex ? "text-paper" : "text-faint",
                )}
              >
                {formatMonth(point.month)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
