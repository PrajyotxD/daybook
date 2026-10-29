import { createContext, useContext } from "react";
import type { Entry } from "./types";

export interface ShellApi {
  openNewEntry: () => void;
  openEntry: (entry: Entry) => void;
  openPalette: () => void;
}

export const ShellContext = createContext<ShellApi | null>(null);

export function useShell(): ShellApi {
  const context = useContext(ShellContext);
  if (!context) throw new Error("useShell must be used inside ShellContext.Provider");
  return context;
}
