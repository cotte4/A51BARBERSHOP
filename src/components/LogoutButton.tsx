"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => signOut().then(() => router.push("/login"))}
      className="text-xs text-gray-400 hover:text-gray-600"
    >
      Salir
    </button>
  );
}
