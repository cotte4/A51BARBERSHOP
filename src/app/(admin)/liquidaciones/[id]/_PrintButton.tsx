"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden min-h-[44px] px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition-colors"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
