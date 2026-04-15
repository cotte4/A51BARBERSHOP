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

  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl space-y-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm text-zinc-400 transition hover:text-[#8cff59]"
            >
              ← Dashboard
            </Link>
            <div>
              <p className="eyebrow">Configuracion segura</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Ajustes del sistema
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Barberos, musica, pagos y reglas sensibles del negocio en un solo lugar, con
                lectura clara y acciones controladas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d8ffc7]">
              Solo admin
            </span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Cambios sensibles
            </span>
          </div>
        </div>
      </header>

      <ConfNavBar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
