// src/app/(barbero)/layout.tsx
// Server Component — lee la sesión para mostrar nombre del usuario y links de admin

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default async function BarberoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userName = session?.user?.name ?? "Usuario";
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
                ← Dashboard
              </Link>
            )}
            <span className="text-base font-semibold text-gray-900">💈 Caja</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{userName}</span>
            {isAdmin && (
              <Link
                href="/configuracion"
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Config
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-5">{children}</main>
    </div>
  );
}
