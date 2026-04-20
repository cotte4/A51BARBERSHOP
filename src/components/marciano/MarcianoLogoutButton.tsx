"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function MarcianoLogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => signOut().then(() => router.push("/marciano/login"))}
      aria-label="Cerrar sesión"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:border-red-500/40 hover:text-red-400 active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  );
}
