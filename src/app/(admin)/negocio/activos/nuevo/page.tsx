import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import NuevoAssetForm from "./_NuevoAssetForm";

export default async function NuevoAssetPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link
            href="/negocio/activos"
            className="text-sm text-zinc-400 hover:text-[#8cff59] transition"
          >
            ← Hangar
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        <div>
          <p className="eyebrow text-xs font-semibold">Negocio / Hangar</p>
          <h1 className="font-display mt-2 text-2xl font-semibold text-white">
            Crear activo
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Suma una compra nueva o deja planificado lo que todavia falta entrar al local.
          </p>
        </div>

        <NuevoAssetForm />
      </main>
    </div>
  );
}
