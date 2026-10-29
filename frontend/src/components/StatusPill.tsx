import type { EntryStatus } from "../lib/types";
import { STATUS_META } from "../lib/format";
import { cn } from "../lib/utils";

export function StatusPill({
  status,
  label,
  className,
}: {
  status: EntryStatus;
  label?: string;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[10.5px] font-medium uppercase tracking-[0.08em]",
        meta.bg,
        meta.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {label ?? meta.label}
    </span>
  );
}
