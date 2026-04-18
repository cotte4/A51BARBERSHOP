import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { marcianoCutsConfig } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getDefaultCuts } from "@/lib/marciano-style";
import type { FaceShape } from "@/lib/types";
import { saveCutsConfigAction } from "./actions";

const FACE_SHAPES: { shape: FaceShape; label: string; description: string }[] = [
  { shape: "oval", label: "Ovalado", description: "Cara más larga que ancha, versátil" },
  { shape: "cuadrado", label: "Cuadrado", description: "Mandíbula fuerte, frente ancha" },
  { shape: "redondo", label: "Redondo", description: "Ancho similar al largo, suave" },
  { shape: "corazon", label: "Corazón", description: "Frente ancha, mentón angosto" },
  { shape: "diamante", label: "Diamante", description: "Pómulos anchos, frente y mentón angostos" },
  { shape: "alien", label: "Alien", description: "Inclasificable — todos los cortes aplican" },
];

const DUMMY_ANSWERS = {
  lifestyle: "minimal" as const,
  morningMinutes: 5 as const,
  perfectCut: "lo-siento" as const,
  feedbackTolerance: "pregunto" as const,
};

export default async function EstiloConfigPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/hoy");
  }

  const configRows = await db.select().from(marcianoCutsConfig);
  const configMap = new Map(configRows.map((row) => [row.faceShape, row.cuts]));

  return (
    <div className="app-shell min-h-screen px-4 py-5 pb-28">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-[28px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,rgba(140,255,89,0.08),transparent_30%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-5">
          <Link
            href="/negocio"
            className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
          >
            &larr; Negocio
          </Link>
          <div className="mt-3">
            <p className="eyebrow text-xs font-semibold text-[#8cff59]">Marciano</p>
            <h1 className="font-display mt-2 text-2xl font-semibold text-white sm:text-3xl">
              Config de cortes por forma de cara
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Si dejás vacío, el sistema usa los cortes calculados automáticamente según forma + estilo de vida del cliente.
              Si cargás cortes acá, estos tienen prioridad.
            </p>
          </div>
        </section>

        <div className="space-y-3">
          {FACE_SHAPES.map(({ shape, label, description }) => {
            const configured = configMap.get(shape);
            const defaults = getDefaultCuts(shape, DUMMY_ANSWERS);
            const saveAction = saveCutsConfigAction.bind(null, shape);

            return (
              <section
                key={shape}
                className="panel-card rounded-[28px] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      {label}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">{description}</p>
                  </div>
                  {configured ? (
                    <span className="rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#8cff59]">
                      Personalizado
                    </span>
                  ) : (
                    <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-500">
                      Default del sistema
                    </span>
                  )}
                </div>

                {configured ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {configured.map((cut) => (
                      <span
                        key={cut}
                        className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/8 px-3 py-1 text-sm text-zinc-100"
                      >
                        {cut}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-xs text-zinc-600 mb-2">Defaults actuales (ejemplo con estilo minimal, 5 min):</p>
                    <div className="flex flex-wrap gap-2">
                      {defaults.map((cut) => (
                        <span
                          key={cut}
                          className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm text-zinc-400"
                        >
                          {cut}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <form action={saveAction} className="mt-4 space-y-3">
                  <div>
                    <label
                      htmlFor={`cuts-${shape}`}
                      className="block text-sm font-medium text-zinc-400 mb-1"
                    >
                      Cortes para {label} <span className="text-zinc-600">(separados por coma)</span>
                    </label>
                    <input
                      id={`cuts-${shape}`}
                      name="cutsRaw"
                      type="text"
                      defaultValue={configured?.join(", ") ?? ""}
                      placeholder={`Ej: ${defaults.join(", ")}`}
                      className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-[#8cff59]/60"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="neon-button rounded-[18px] px-5 py-2.5 text-sm font-semibold text-[#07130a]"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
