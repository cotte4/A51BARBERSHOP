"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export default function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const router = useRouter();
  const close = onClose ?? (() => router.back());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center"
      onClick={close}
    >
      <div
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-zinc-800 bg-zinc-950 shadow-[0_-8px_60px_rgba(0,0,0,0.6)] sm:max-w-2xl sm:rounded-[28px] sm:shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-zinc-700" />
        </div>

        {/* Close button */}
        <div className="flex justify-end px-5 pt-3 pb-1">
          <button
            onClick={close}
            className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
          >
            <X size={14} />
            Cerrar
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-5 pb-8">{children}</div>
      </div>
    </div>
  );
}
