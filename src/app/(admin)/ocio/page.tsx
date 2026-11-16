import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listarTemas, puedeEntrarAlEstudio } from "@/lib/estudio";
import { getTorneoVigente } from "@/lib/torneo-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ocio · A51" };

// La puerta de entrada de los admin: lo que se usa por gusto (temas, música, torneo).
// Lo de trabajo queda a un toque, en "Trabajo" de la barra de abajo.
export default async function OcioPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role === "asesor") redirect("/dashboard");
  if (role !== "admin") redirect("/hoy");

  const conEstudio = puedeEntrarAlEstudio(session?.user?.email);
  const [temas, torneo] = await Promise.all([
    conEstudio ? listarTemas() : Promise.resolve(null),
    getTorneoVigente(),
  ]);

  const nombre = session?.user?.name?.split(" ")[0];

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-32">
      <div className="mx-auto flex max-w-xl flex-col gap-4 lg:max-w-3xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
          {nombre ? `¿Qué hacemos, ${nombre}?` : "¿Qué hacemos?"}
        </h1>

        {temas ? (
          <Link
            href="/estudio"
            className="group relative overflow-hidden rounded-[28px] border border-[#8cff59]/30 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(140,255,89,0.22),rgba(9,9,11,0.95)_60%)] p-6 transition active:scale-[0.99] hover:border-[#8cff59]/60"
          >
            <IconoAuriculares />
            <p className="mt-6 font-display text-3xl font-semibold text-white">Estudio</p>
            <p className="mt-1 text-sm text-zinc-300">
              {temas.length === 1 ? "1 tema" : `${temas.length} temas`} · tocá y suena
            </p>
            <span aria-hidden="true" className="absolute right-6 top-6 text-2xl text-[#8cff59] transition group-hover:translate-x-1">
              ›
            </span>
          </Link>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <Tarjeta href="/musica/jukebox" titulo="Música" detalle="Lo que suena en el local" icono={<IconoVinilo />} />
          <Tarjeta
            href="/torneo-admin"
            titulo="Torneo"
            detalle={torneo ? torneo.nombre : "Armar uno"}
            icono={<IconoPelota />}
          />
        </div>
      </div>
    </main>
  );
}

function Tarjeta({
  href,
  titulo,
  detalle,
  icono,
}: {
  href: string;
  titulo: string;
  detalle: string;
  icono: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="panel-card flex min-h-[150px] flex-col justify-between rounded-[28px] p-5 transition active:scale-[0.98] hover:border-[#8cff59]/40"
    >
      <span className="text-[#8cff59]">{icono}</span>
      <span>
        <span className="block font-display text-xl font-semibold text-white">{titulo}</span>
        <span className="mt-0.5 block truncate text-sm text-zinc-400">{detalle}</span>
      </span>
    </Link>
  );
}

function IconoAuriculares() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10 text-[#8cff59]" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" strokeLinecap="round" />
      <rect x="3" y="14" width="4.5" height="7" rx="1.8" />
      <rect x="16.5" y="14" width="4.5" height="7" rx="1.8" />
    </svg>
  );
}

function IconoVinilo() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5" strokeLinecap="round" />
    </svg>
  );
}

function IconoPelota() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7.5 4 2.9-1.5 4.7h-5L8 10.4 12 7.5Z" strokeLinejoin="round" />
      <path d="M12 3v4.5M16 10.4l4.3-1.4M14.5 15.1l2.7 3.7M9.5 15.1l-2.7 3.7M8 10.4 3.7 9" strokeLinecap="round" />
    </svg>
  );
}
