import Link from "next/link";
import { redirect } from "next/navigation";
import ClientCreateForm from "@/components/clientes/ClientCreateForm";
import { getClientActorContext } from "@/lib/client-access";

export default async function NuevoClientePage() {
  const actor = await getClientActorContext();
  if (!actor) {
    redirect("/login");
  }

  const flowSteps = [
    {
      title: "1. Identidad",
      description: "Nombre, telefono y foto para reconocerlo rapido.",
    },
    {
      title: "2. Contexto",
      description: "Tags, alergias y notas para el proximo corte.",
    },
    {
      title: "3. Acceso",
      description: actor.isAdmin ? "Email y estado Marciano si corresponde." : "Datos compartidos del perfil.",
    },
  ];

  const captureNotes = actor.isAdmin
    ? [
        "Nombre, telefono y avatar quedan listos para toda la operacion.",
        "Email marciano y estado activo se pueden definir desde esta misma carga.",
        "Tags y preferencias ayudan a evitar preguntas repetidas en la silla.",
      ]
    : [
        "Nombre, telefono y avatar quedan listos para toda la operacion.",
        "Tags y preferencias ayudan a evitar preguntas repetidas en la silla.",
        "Las notas quedan visibles en la ficha del cliente.",
      ];

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="panel-card rounded-[32px] p-6 lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-4">
            <span className="public-badge inline-flex rounded-full px-3 py-1 text-[11px] font-semibold">
              Alta guiada
            </span>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-white lg:text-4xl">
                Nuevo cliente
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-zinc-400 lg:text-base">
                Cargamos lo minimo necesario para reconocerlo rapido, evitar duplicados y dejar la
                ficha lista para el proximo corte.
              </p>
            </div>
          </div>

          <Link
            href="/clientes"
            className="ghost-button inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 text-sm font-semibold"
          >
            Volver a clientes
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {flowSteps.map((step) => (
            <div key={step.title} className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="eyebrow text-[11px] font-semibold">{step.title}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[28px] border border-[#8cff59]/20 bg-[#8cff59]/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8cff59]">
            Lo que queda listo
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-200">
            {captureNotes.map((note) => (
              <li key={note} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#8cff59]" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <div className="panel-soft rounded-[28px] p-5 lg:p-6">
          <p className="eyebrow text-[11px] font-semibold">Antes de guardar</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-sm font-medium text-white">Evita duplicados</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Si el nombre ya existe, el formulario te muestra coincidencias antes de crear el
                perfil.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-sm font-medium text-white">Guarda contexto</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Tags, alergias y preferencias ayudan a que el siguiente corte arranque con
                memoria.
              </p>
            </div>
          </div>
        </div>

        <ClientCreateForm isAdmin={actor.isAdmin} />
      </section>
    </div>
  );
}
