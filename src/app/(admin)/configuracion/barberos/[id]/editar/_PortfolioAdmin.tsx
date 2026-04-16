"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { subirFotoPortfolioAction, eliminarFotoPortfolioAction } from "./actions";

type PortfolioItem = {
  id: string;
  fotoUrl: string;
  caption: string | null;
  orden: number;
};

type Props = {
  barberoId: string;
  items: PortfolioItem[];
};

const MAX_FOTOS = 12;

export default function PortfolioAdmin({ barberoId, items: initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const remaining = MAX_FOTOS - items.length;
  const atLimit = remaining <= 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await subirFotoPortfolioAction(data);
        formRef.current?.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir las fotos");
      }
    });
  }

  function handleDelete(itemId: string) {
    setDeletingId(itemId);
    startTransition(async () => {
      try {
        await eliminarFotoPortfolioAction(itemId, barberoId);
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      } catch {
        setError("No se pudo eliminar la foto");
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="panel-card rounded-[28px] p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-xs font-semibold">Portfolio</p>
          <h3 className="font-display mt-1 text-lg font-semibold text-white">
            Fotos del barbero
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Se muestran en la landing pública antes del form de reserva.
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            atLimit
              ? "border-amber-400/35 bg-amber-400/10 text-amber-300"
              : "border-white/10 bg-white/6 text-zinc-300"
          }`}
        >
          {items.length} / {MAX_FOTOS}
        </span>
      </div>

      {/* Grid de fotos existentes */}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-2xl border border-zinc-700">
              <div className="relative h-36 w-full">
                <Image
                  src={item.fotoUrl}
                  alt={item.caption ?? "Foto portfolio"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              </div>
              {item.caption && (
                <p className="px-2 py-1.5 text-xs text-zinc-400 truncate">{item.caption}</p>
              )}
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={isPending}
                className="absolute right-2 top-2 rounded-full border border-red-500/40 bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/35 disabled:cursor-not-allowed"
              >
                {deletingId === item.id ? "..." : "Eliminar"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Todavía no hay fotos de portfolio.</p>
      )}

      {/* Form upload */}
      {!atLimit && (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 border-t border-zinc-800 pt-5">
          <input type="hidden" name="barberoId" value={barberoId} />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300" htmlFor="portfolio-fotos">
              Agregar fotos{" "}
              <span className="text-zinc-500">(múltiples, máx 8 MB c/u — quedan {remaining} lugares)</span>
            </label>
            <input
              id="portfolio-fotos"
              name="fotos"
              type="file"
              accept="image/*"
              multiple
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-sm file:text-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300" htmlFor="portfolio-caption">
              Caption <span className="text-zinc-500">(opcional, aplica a todas las fotos subidas)</span>
            </label>
            <input
              id="portfolio-caption"
              name="caption"
              type="text"
              placeholder="Ej: Fade con diseño"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="neon-button rounded-[20px] px-5 py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? "Subiendo..." : "Subir fotos"}
          </button>
        </form>
      )}

      {atLimit && (
        <p className="border-t border-zinc-800 pt-4 text-sm text-amber-300">
          Límite alcanzado. Eliminá alguna foto para agregar nuevas.
        </p>
      )}
    </div>
  );
}
