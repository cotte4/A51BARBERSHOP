"use client";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500">Resumen financiero — próximamente en Fase 2</p>
      <button
        className="mt-4 px-4 py-2 bg-gray-800 text-white rounded"
        onClick={() => signOut().then(() => router.push("/login"))}
      >
        Cerrar sesión
      </button>
    </main>
  );
}
