"use client";

import { useState } from "react";

function formatARS(val: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(val);
}

export default function EfectivoChecker({
  totalEfectivoSistema,
}: {
  totalEfectivoSistema: number;
}) {
  const [contado, setContado] = useState("");

  const contadoNum = Number(contado) || 0;
  const diferencia = contadoNum - totalEfectivoSistema;
  const hayDiferencia = contado !== "" && Math.abs(diferencia) > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Verificación de efectivo
      </h3>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Según registros</span>
          <span className="font-medium text-gray-900">
            {formatARS(totalEfectivoSistema)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-500">
            Efectivo contado físicamente
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              $
            </span>
            <input
              type="number"
              min="0"
              value={contado}
              onChange={(e) => setContado(e.target.value)}
              placeholder="0"
              className="min-h-[44px] w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
        {hayDiferencia && (
          <div className="flex justify-between text-sm font-semibold rounded-lg px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200">
            <span>Diferencia</span>
            <span>
              {diferencia > 0 ? "+" : ""}
              {formatARS(diferencia)}
            </span>
          </div>
        )}
        {!hayDiferencia && contado !== "" && (
          <div className="flex justify-between text-sm font-semibold rounded-lg px-3 py-2 bg-green-50 text-green-800 border border-green-200">
            <span>✓ Sin diferencia</span>
            <span>{formatARS(0)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
