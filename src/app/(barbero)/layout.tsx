import Link from "next/link";
import { headers } from "next/headers";
import LogoutButton from "@/components/LogoutButton";
import { auth } from "@/lib/auth";

export default async function BarberoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userName = session?.user?.name ?? "Usuario";
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
                ← Dashboard
              </Link>
            ) : null}
            <div className="flex items-center gap-4">
              <span className="text-base font-semibold text-gray-900">A51 Barber</span>
              <nav className="flex items-center gap-3 text-sm text-gray-500">
                <Link href="/caja" className="hover:text-gray-900">
                  Caja
                </Link>
                <Link href="/clientes" className="hover:text-gray-900">
                  Clientes
                </Link>
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{userName}</span>
            {isAdmin ? (
              <Link
                href="/configuracion"
                className="text-xs text-gray-500 underline hover:text-gray-700"
              >
                Config
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5">{children}</main>
    </div>
  );
}
