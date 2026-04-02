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
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/dashboard"
            className="mb-2 block text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-white">Configuración</h1>
        </div>
      </header>

      <ConfNavBar />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
