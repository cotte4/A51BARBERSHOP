"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden min-h-[44px] px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 text-sm font-medium transition-colors"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
