import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ConfNavBar from "@/components/configuracion/ConfNavBar";
import { auth } from "@/lib/auth";

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin") {
    redirect("/caja");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/dashboard"
            className="mb-2 block text-sm text-gray-400 hover:text-gray-600"
          >
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
        </div>
      </header>

      <ConfNavBar />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
