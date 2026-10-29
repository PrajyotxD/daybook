import { NavLink } from "react-router-dom";
import { ArrowUpRight, BookOpen, LayoutGrid, Rows3, Settings2 } from "lucide-react";
import { cn } from "../lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/entries", label: "Entries", icon: Rows3, end: false },
];

function BrandMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" fill="#d9ff57" />
      <rect x="14" y="14" width="12" height="12" stroke="#f4f2ec" strokeWidth="1.6" />
      <rect x="17" y="3" width="11" height="11" stroke="rgba(244,242,236,0.28)" strokeWidth="1" />
    </svg>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-white/[0.07] bg-ink-900/50 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-2.5 px-6 pb-6 pt-6">
        <BrandMark />
        <div className="leading-none">
          <p className="text-[13.5px] font-semibold tracking-[0.02em] text-paper">Daybook</p>
          <p className="mt-1 font-mono text-[9.5px] uppercase tracking-label text-faint">CloudBlitz</p>
        </div>
      </div>

      <div className="px-4">
        <button className="group flex w-full items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-white/20 to-white/5 font-mono text-[10px] text-paper">
            CB
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-medium text-paper">CloudBlitz HQ</span>
            <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint">
              Production
            </span>
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-faint">
            <path d="m7 15 5 5 5-5M7 9l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <nav className="mt-7 flex-1 px-4">
        <p className="label mb-2 px-3">Workspace</p>
        <div className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "nav-item",
                  isActive && "bg-white/[0.055] text-paper",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -left-3 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded bg-lime" />
                  )}
                  <item.icon size={15} strokeWidth={isActive ? 2.1 : 1.7} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <p className="label mb-2 mt-7 px-3">Resources</p>
        <div className="flex flex-col gap-0.5">
          <a
            href="/swagger-ui.html"
            target="_blank"
            rel="noreferrer"
            className="nav-item group justify-between"
          >
            <span className="flex items-center gap-3">
              <BookOpen size={15} strokeWidth={1.7} />
              API reference
            </span>
            <ArrowUpRight size={12} className="text-faint transition-colors group-hover:text-paper" />
          </a>
          <a href="/actuator/health" target="_blank" rel="noreferrer" className="nav-item justify-between">
            <span className="flex items-center gap-3">
              <Settings2 size={15} strokeWidth={1.7} />
              Service health
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-teal">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal" />
              live
            </span>
          </a>
        </div>
      </nav>

      <div className="border-t border-white/[0.07] p-4">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-ink-800 text-[11px] font-medium text-paper">
            PR
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-paper">Prajyot</p>
            <p className="truncate text-[11px] text-faint">Workspace owner</p>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-faint">v1.0</span>
        </div>
      </div>
    </aside>
  );
}
