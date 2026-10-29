import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { Topbar } from "./components/Topbar";
import { EntrySheet } from "./components/EntrySheet";
import { CommandPalette } from "./components/CommandPalette";
import { Overview } from "./pages/Overview";
import { Entries } from "./pages/Entries";
import { api } from "./lib/api";
import type { Entry } from "./lib/types";
import { ShellContext, type ShellApi } from "./lib/shell";

export default function App() {
  const [sheet, setSheet] = useState<{ open: boolean; entry: Entry | null }>({
    open: false,
    entry: null,
  });
  const [paletteOpen, setPaletteOpen] = useState(false);

  const metaQuery = useQuery({ queryKey: ["meta"], queryFn: api.getMeta, staleTime: 300_000 });

  const shell = useMemo<ShellApi>(
    () => ({
      openNewEntry: () => setSheet({ open: true, entry: null }),
      openEntry: (entry: Entry) => setSheet({ open: true, entry }),
      openPalette: () => setPaletteOpen(true),
    }),
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (!typing && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setSheet({ open: true, entry: null });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <ShellContext.Provider value={shell}>
      <div className="min-h-screen">
        <Sidebar />
        <div className="lg:pl-[248px]">
          <Topbar onNewEntry={shell.openNewEntry} onOpenPalette={shell.openPalette} />
          <main>
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/entries" element={<Entries />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {sheet.open && (
          <EntrySheet
            entry={sheet.entry}
            meta={metaQuery.data}
            onClose={() => setSheet({ open: false, entry: null })}
          />
        )}

        <MobileNav />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </ShellContext.Provider>
  );
}
