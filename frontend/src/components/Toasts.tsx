import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Check, Info, X, TriangleAlert } from "lucide-react";
import { cn } from "../lib/utils";

type Tone = "success" | "error" | "info";

interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
}

interface ToastContextValue {
  push: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[340px] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-fade-up overflow-hidden rounded-xl border border-white/10 bg-ink-800/95 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur"
          >
            <div className="flex items-start gap-3 p-3.5">
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  toast.tone === "success" && "bg-lime/15 text-lime",
                  toast.tone === "error" && "bg-rose/15 text-rose",
                  toast.tone === "info" && "bg-white/10 text-paper",
                )}
              >
                {toast.tone === "success" && <Check size={13} strokeWidth={2.5} />}
                {toast.tone === "error" && <TriangleAlert size={13} strokeWidth={2.2} />}
                {toast.tone === "info" && <Info size={13} strokeWidth={2.2} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-tight text-paper">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-[12px] leading-snug text-muted">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="text-faint transition-colors hover:text-paper"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
            <div
              className={cn(
                "h-px w-full",
                toast.tone === "success" && "bg-lime/40",
                toast.tone === "error" && "bg-rose/40",
                toast.tone === "info" && "bg-white/20",
              )}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
