import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CornerDownLeft,
  LayoutGrid,
  Plus,
  Rows3,
  Search,
} from "lucide-react";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import { useShell } from "../lib/shell";
import { cn } from "../lib/utils";

interface Action {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Plus;
  run: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { openNewEntry, openEntry } = useShell();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTerm("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  const actions: Action[] = useMemo(
    () => [
      {
        id: "new",
        label: "Create a new entry",
        hint: "N",
        icon: Plus,
        run: () => {
          onClose();
          openNewEntry();
        },
      },
      {
        id: "overview",
        label: "Go to Overview",
        icon: LayoutGrid,
        run: () => {
          onClose();
          navigate("/");
        },
      },
      {
        id: "entries",
        label: "Go to Entries",
        icon: Rows3,
        run: () => {
          onClose();
          navigate("/entries");
        },
      },
      {
        id: "docs",
        label: "Open API reference",
        hint: "↗",
        icon: BookOpen,
        run: () => {
          onClose();
          window.open("/swagger-ui.html", "_blank", "noopener");
        },
      },
    ],
    [navigate, onClose, openNewEntry],
  );

  const search = useQuery({
    queryKey: ["palette", term],
    queryFn: () => api.listEntries({ q: term, size: 6, sortBy: "entryDate", direction: "desc" }),
    enabled: open && term.trim().length > 1,
    staleTime: 15_000,
  });

  const entries = term.trim().length > 1 ? search.data?.content ?? [] : [];
  const total = term.trim().length > 1 ? actions.length + entries.length : actions.length;

  const run = (index: number) => {
    if (term.trim().length > 1 && index >= actions.length) {
      const entry = entries[index - actions.length];
      if (entry) {
        onClose();
        openEntry(entry);
      }
      return;
    }
    actions[index]?.run();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((current) => (current + 1) % Math.max(1, total));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((current) => (current - 1 + total) % Math.max(1, total));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        run(active);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-[600px] animate-scale-in overflow-hidden rounded-xl border border-white/[0.12] bg-ink-850/95 shadow-[0_40px_120px_-40px_rgba(0,0,0,1)] backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
          <Search size={15} className="text-faint" />
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setActive(0);
            }}
            placeholder="Search entries or run a command…"
            className="h-[52px] flex-1 bg-transparent text-[13.5px] text-paper outline-none placeholder:text-faint"
          />
          <kbd className="kbd">esc</kbd>
        </div>

        <div className="scroll-thin max-h-[360px] overflow-y-auto p-2">
          {term.trim().length <= 1 ? (
            <>
              <p className="label px-3 py-2">Actions</p>
              {actions.map((action, index) => (
                <button
                  key={action.id}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => run(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors",
                    active === index ? "bg-white/[0.07] text-paper" : "text-muted",
                  )}
                >
                  <action.icon size={15} className="text-faint" />
                  <span className="flex-1">{action.label}</span>
                  {action.hint && <span className="kbd">{action.hint}</span>}
                  {active === index && <CornerDownLeft size={12} className="text-faint" />}
                </button>
              ))}
            </>
          ) : (
            <>
              <p className="label px-3 py-2">Entries</p>
              {search.isFetching && entries.length === 0 && (
                <div className="px-3 py-6 text-center text-[12px] text-faint">Searching…</div>
              )}
              {!search.isFetching && entries.length === 0 && (
                <div className="px-3 py-6 text-center text-[12px] text-faint">
                  No entries match “{term}”.
                </div>
              )}
              {entries.map((entry, index) => {
                const itemIndex = actions.length + index;
                return (
                  <button
                    key={entry.id}
                    onMouseEnter={() => setActive(itemIndex)}
                    onClick={() => run(itemIndex)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      active === itemIndex ? "bg-white/[0.07]" : "",
                    )}
                  >
                    <ArrowRight size={13} className="text-faint" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-paper">{entry.title}</span>
                      <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.08em] text-faint">
                        {entry.reference} · {entry.categoryLabel} · {entry.statusLabel}
                      </span>
                    </span>
                    <span className="num text-[11.5px] text-muted">
                      {formatMoney(entry.amount, entry.currency)}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-2.5">
          <div className="flex items-center gap-3 font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint">
            <span className="flex items-center gap-1"><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
            <span className="flex items-center gap-1"><span className="kbd">↵</span> open</span>
          </div>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint">Daybook</span>
        </div>
      </div>
    </div>
  );
}
