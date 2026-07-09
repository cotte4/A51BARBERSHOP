import Link from "next/link";
import { redirect } from "next/navigation";
import ClientCreateForm from "@/components/clientes/ClientCreateForm";
import { getClientActorContext } from "@/lib/client-access";

export default async function NuevoClientePage() {
  const actor = await getClientActorContext();
  if (!actor) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <section className="panel-card rounded-[28px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="public-badge inline-flex rounded-full px-3 py-1 text-[11px] font-semibold">
              Alta guiada
            </span>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
              Nuevo cliente
            </h1>
            <p className="text-sm text-zinc-400">
              Solo el nombre es obligatorio. El resto lo completás cuando quieras.
            </p>
          </div>

          <Link
            href="/clientes"
            className="ghost-button inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 text-sm font-semibold"
          >
            Volver a clientes
          </Link>
        </div>
      </section>

      <ClientCreateForm isAdmin={actor.isAdmin} />
    </div>
  );
}
