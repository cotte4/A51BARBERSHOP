"use client";

import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error: _error, reset }: ErrorProps) {
  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <div className="panel-card rounded-[28px] p-8 max-w-sm w-full flex flex-col items-center gap-5">
        {/* Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/35 bg-red-500/10">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 text-red-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Copy */}
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-semibold text-white">
            Error en panel admin
          </h1>
          <p className="text-sm text-zinc-400">
            Hubo un error cargando esta sección.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            onClick={reset}
            className="neon-button rounded-[20px] px-5 py-3 font-semibold w-full"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-[#8cff59]"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
