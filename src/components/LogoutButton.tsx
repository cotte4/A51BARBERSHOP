"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => signOut().then(() => router.push("/login"))}
      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-[#8cff59]/30 hover:text-[#8cff59]"
    >
      Salir
    </button>
  );
}
