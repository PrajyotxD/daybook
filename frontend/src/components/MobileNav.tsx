import { NavLink } from "react-router-dom";
import { LayoutGrid, Plus, Rows3 } from "lucide-react";
import { cn } from "../lib/utils";
import { useShell } from "../lib/shell";

export function MobileNav() {
  const { openNewEntry } = useShell();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-950/90 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              "flex w-16 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px]",
              isActive ? "text-lime" : "text-faint",
            )
          }
        >
          <LayoutGrid size={17} strokeWidth={1.8} />
          Overview
        </NavLink>

        <button
          onClick={openNewEntry}
          className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-lime text-ink-950 shadow-[0_10px_30px_-10px_rgba(217,255,87,0.7)]"
          aria-label="New entry"
        >
          <Plus size={20} strokeWidth={2.4} />
        </button>

        <NavLink
          to="/entries"
          className={({ isActive }) =>
            cn(
              "flex w-16 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px]",
              isActive ? "text-lime" : "text-faint",
            )
          }
        >
          <Rows3 size={17} strokeWidth={1.8} />
          Entries
        </NavLink>
      </div>
    </nav>
  );
}
