/**
 * Reemplaza los links a Club Marciano mientras el portal de clientes está cerrado.
 * Es NO interactivo a propósito: no es link ni botón, así nadie cae en un redirect a "/".
 */
/** `className` reemplaza el tamaño por defecto (min-h-11 px-5) para no pelear clases de Tailwind. */
export default function MarcianoCerradoPill({
  className = "min-h-11 px-5",
  etiqueta = "Club Marciano",
}: {
  className?: string;
  etiqueta?: string;
}) {
  return (
    <div
      aria-disabled="true"
      className={`inline-flex cursor-default select-none items-center gap-3 rounded-2xl border border-[#8cff59]/15 bg-[#8cff59]/5 opacity-60 ${className}`}
    >
      <span className="text-sm font-semibold text-zinc-100">{etiqueta}</span>
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        Próximamente
      </span>
    </div>
  );
}
