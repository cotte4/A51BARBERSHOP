"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  FOTO_POS_DEFAULT,
  FOTO_ZOOM_DEFAULT,
  FOTO_ZOOM_MAX,
  FOTO_ZOOM_MIN,
  getFotoCropStyle,
  normalizeFotoPos,
  normalizeFotoZoom,
  type PresupuestoScope,
} from "@/lib/presupuesto";
import { guardarFotoPosAction } from "./presupuesto-actions";

function parsePos(value: string): { x: number; y: number } {
  const [x, y] = normalizeFotoPos(value)
    .split(" ")
    .map((part) => Number(part.replace("%", "")));
  return { x, y };
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

export default function AjustarFotoModal({
  scope,
  lineaId,
  nombre,
  fotoUrl,
  fotoPos,
  fotoZoom,
  onClose,
}: {
  scope: PresupuestoScope;
  lineaId: string;
  nombre: string;
  fotoUrl: string;
  fotoPos: string | null;
  fotoZoom: string | null;
  onClose: () => void;
}) {
  const [pos, setPos] = useState(() => parsePos(fotoPos ?? FOTO_POS_DEFAULT));
  const [zoom, setZoom] = useState(() => normalizeFotoZoom(fotoZoom));
  const [isPending, startTransition] = useTransition();
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  // Cerrar con Escape, como cualquier modal.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, posX: pos.x, posY: pos.y };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame) return;

    const rect = frame.getBoundingClientRect();
    // Arrastrar la imagen "hacia" el cursor: mover a la derecha muestra lo que
    // esta a la izquierda, por eso el delta va restado.
    const deltaX = ((event.clientX - drag.x) / rect.width) * 100;
    const deltaY = ((event.clientY - drag.y) / rect.height) * 100;

    setPos({ x: clamp(drag.posX - deltaX), y: clamp(drag.posY - deltaY) });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  }

  function handleGuardar() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("scope", scope);
      formData.set("lineaId", lineaId);
      formData.set("fotoPos", `${Math.round(pos.x)}% ${Math.round(pos.y)}%`);
      formData.set("fotoZoom", String(zoom));
      await guardarFotoPosAction(formData);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[30px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,0.99))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow text-xs font-semibold">Ajustar foto</p>
            <h2 className="font-display mt-1 truncate text-xl font-semibold text-white">
              {nombre}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
          >
            Cerrar
          </button>
        </div>

        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Arrastra la imagen para mover el encuadre y usa el zoom para recortar mas
          cerca. Se guardan los dos; el archivo original queda intacto, asi que
          podes reajustarlo cuando quieras.
        </p>

        <div
          ref={frameRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative mt-4 h-64 w-full cursor-grab touch-none select-none overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-900 active:cursor-grabbing"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotoUrl}
            alt={nombre}
            draggable={false}
            className="h-full w-full object-cover"
            style={getFotoCropStyle(`${pos.x}% ${pos.y}%`, zoom)}
          />
          <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-white/10" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Recorte
          </span>
          <input
            type="range"
            min={FOTO_ZOOM_MIN}
            max={FOTO_ZOOM_MAX}
            step="0.05"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="flex-1 accent-[#8cff59]"
          />
          <span className="w-10 text-right text-xs text-zinc-400">{zoom.toFixed(1)}x</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Vista
            </span>
            <div className="relative h-14 w-14 overflow-hidden rounded-[18px] border border-zinc-800 bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoUrl}
                alt="Previsualizacion"
                className="h-full w-full object-cover"
                style={getFotoCropStyle(`${pos.x}% ${pos.y}%`, zoom)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPos(parsePos(FOTO_POS_DEFAULT));
              setZoom(FOTO_ZOOM_DEFAULT);
            }}
            className="rounded-full border border-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
          >
            Centrar
          </button>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="ghost-button inline-flex min-h-[42px] items-center rounded-[16px] px-4 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={isPending}
            className="neon-button inline-flex min-h-[42px] items-center rounded-[16px] px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Guardar encuadre"}
          </button>
        </div>
      </div>
    </div>
  );
}
