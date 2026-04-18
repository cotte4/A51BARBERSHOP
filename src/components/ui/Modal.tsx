"use client";

import { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose?: () => void;
  title?: string;
}) {
  const router = useRouter();
  const realClose = onClose ?? (() => router.back());
  const titleId = useId();

  // Internal visible state drives exit animation before calling the real close
  const [visible, setVisible] = useState(true);
  function close() { setVisible(false); }

  // Body scroll lock
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, []);

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AnimatePresence onExitComplete={realClose}>
      {visible && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-zinc-800 bg-zinc-950 shadow-[0_-8px_60px_rgba(0,0,0,0.6)] sm:max-w-2xl sm:rounded-[28px] sm:shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle — mobile only */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-zinc-700" />
            </div>

            {/* Header row */}
            <div className="flex items-center justify-between px-5 pt-3 pb-1">
              {title ? (
                <p id={titleId} className="text-sm font-semibold text-white">{title}</p>
              ) : (
                <span />
              )}
              <button
                onClick={close}
                className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
              >
                <XIcon />
                Cerrar
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto px-5 pb-8">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
