import type { TemaEstudio } from "@/lib/estudio";
import { META_TEMAS } from "@/lib/estudio-reglas";
import { portadaUrl } from "./_Reproductor";

// La cabecera de la playlist, como en Spotify: el mosaico de portadas, el nombre, la meta del
// disco y los números (temas · minutos · escuchas).

function duracionTotal(temas: TemaEstudio[]): string {
  const minutos = Math.round(temas.reduce((suma, tema) => suma + (tema.duracionSeg ?? 0), 0) / 60);
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}

function Mosaico({ temas }: { temas: TemaEstudio[] }) {
  // Las portadas de los primeros del ranking: 4 en cuadrícula, o la del primero si no alcanzan.
  const portadas = temas.map(portadaUrl).filter((url): url is string => !!url);
  const caja = "h-32 w-32 shrink-0 overflow-hidden rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.55)] sm:h-40 sm:w-40";
  if (portadas.length === 0) {
    return (
      <div className={`${caja} flex items-center justify-center bg-[radial-gradient(circle_at_30%_25%,#8cff59_0%,#1f5a10_45%,#0a0f0b_100%)]`}>
        <span className="font-display text-4xl font-bold text-white/90">51</span>
      </div>
    );
  }
  const usadas = portadas.length >= 4 ? portadas.slice(0, 4) : portadas.slice(0, 1);
  return (
    <div className={`${caja} grid ${usadas.length === 4 ? "grid-cols-2" : "grid-cols-1"} bg-zinc-800`}>
      {usadas.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element -- link firmado privado, no pasa por next/image
        <img key={url} src={url} alt="" className="h-full w-full object-cover" />
      ))}
    </div>
  );
}

export default function Cabecera({ temas, escuchas }: { temas: TemaEstudio[]; escuchas: number }) {
  const progreso = Math.min(100, (temas.length / META_TEMAS) * 100);
  return (
    <section className="relative z-10 -mx-4 -mt-6 bg-linear-to-b from-[#8cff59]/22 via-[#8cff59]/6 to-transparent px-4 pb-2 pt-6">
      <div className="flex items-end gap-4">
        <Mosaico temas={temas} />
        <div className="min-w-0 pb-1">
          <p className="eyebrow text-[11px] font-semibold">Playlist privada</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl">Estudio</h1>
          <p className="mt-1 text-sm text-zinc-300">
            <span className="font-semibold text-white">Was &amp; Pinky</span>
          </p>
          <p className="text-sm text-zinc-400">
            {temas.length} {temas.length === 1 ? "tema" : "temas"} · {duracionTotal(temas)} · {escuchas} {escuchas === 1 ? "escucha" : "escuchas"}
          </p>
        </div>
      </div>
      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-zinc-400">Camino al disco</span>
          <span className="font-display font-bold tabular-nums text-white">
            {temas.length}
            <span className="text-zinc-500">/{META_TEMAS}</span>
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-[#8cff59]" style={{ width: `${progreso}%` }} />
        </div>
      </div>
    </section>
  );
}
