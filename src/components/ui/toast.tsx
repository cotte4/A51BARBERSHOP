"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Variant styles ────────────────────────────────────────────────────────────

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success:
    "border border-[#8cff59]/25 bg-[#8cff59]/10 text-[#8cff59]",
  error:
    "border border-red-500/35 bg-red-500/10 text-red-300",
  warning:
    "border border-amber-500/35 bg-amber-500/10 text-amber-300",
  info:
    "border border-white/10 bg-white/8 text-stone-200",
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function SuccessIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <SuccessIcon />,
  error: <ErrorIcon />,
  warning: <WarningIcon />,
  info: <InfoIcon />,
};

// ── Single toast item ─────────────────────────────────────────────────────────

function Toast({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm ${VARIANT_CLASSES[item.variant]}`}
      style={{ animation: "a51-fade-up 0.22s ease both" }}
    >
      {VARIANT_ICONS[item.variant]}
      <span className="flex-1 text-sm font-medium leading-snug">
        {item.message}
      </span>
      <button
        onClick={() => onDismiss(item.id)}
        aria-label="Cerrar notificación"
        className="ml-1 shrink-0 opacity-60 hover:opacity-100"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── DOM event type ────────────────────────────────────────────────────────────

interface A51ToastEventDetail {
  tone: ToastVariant;
  message: string;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = `a51-toast-${++counterRef.current}`;

    setToasts((prev) => {
      const next = [...prev, { id, message, variant }];
      // Keep at most 3 visible — drop the oldest when a 4th arrives
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
    navigator.vibrate?.(50); // 50ms haptic pulse on mobile

    // Auto-dismiss after 3500ms
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Listen for DOM event so any client component can fire toasts without
  // importing the hook (useful for components deep in the tree or outside
  // the React subtree that needs the context).
  useEffect(() => {
    function handleEvent(e: Event) {
      const detail = (e as CustomEvent<A51ToastEventDetail>).detail;
      if (detail && typeof detail.message === "string") {
        toast(detail.message, detail.tone ?? "info");
      }
    }

    window.addEventListener("a51:toast", handleEvent);
    return () => window.removeEventListener("a51:toast", handleEvent);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Portal-style overlay — sits above the bottom nav (bottom-24) */}
      <div
        aria-label="Notificaciones"
        className="fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto w-full max-w-sm">
            <Toast item={item} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): (message: string, variant?: ToastVariant) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx.toast;
}
