import { useLocation } from "react-router-dom";
import { Plus, Search } from "lucide-react";

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/entries": "Entries",
};

export function Topbar({
  onNewEntry,
  onOpenPalette,
}: {
  onNewEntry: () => void;
  onOpenPalette: () => void;
}) {
  const location = useLocation();
  const title = TITLES[location.pathname] ?? "Overview";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.07] bg-ink-950/75 px-5 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint lg:hidden">
          Daybook
        </span>
        <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] lg:flex">
          <span className="text-faint">Workspace</span>
          <span className="text-white/20">/</span>
          <span className="text-paper/80">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenPalette}
          className="group flex h-[34px] items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] pl-2.5 pr-1.5 text-[12.5px] text-faint transition-colors hover:border-white/[0.16] hover:text-muted"
        >
          <Search size={13} strokeWidth={1.9} />
          <span className="hidden sm:inline">Search or jump to…</span>
          <span className="ml-1 hidden items-center gap-0.5 sm:flex">
            <kbd className="kbd">⌘</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </button>

        <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

        <button onClick={onNewEntry} className="btn-primary h-[34px] px-3">
          <Plus size={14} strokeWidth={2.4} />
          <span className="hidden sm:inline">New entry</span>
        </button>
      </div>
    </header>
  );
}
