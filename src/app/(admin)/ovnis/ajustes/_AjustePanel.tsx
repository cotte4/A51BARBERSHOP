"use client";

import { useState, useCallback } from "react";
import { searchClientAction, ajustarBalanceAction } from "./actions";

function formatOvnis(n: number) {
  return `${n.toLocaleString("es-AR")} OVNIS`;
}

type ClientResult = { id: string; name: string; balance: number };

export default function AjustePanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientResult[]>([]);
  const [selected, setSelected] = useState<ClientResult | null>(null);
  const [delta, setDelta] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "searching" | "saving" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;
    setStatus("searching");
    const res = await searchClientAction(query);
    setResults(res);
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setStatus("saving");
    setErrorMsg("");
    const result = await ajustarBalanceAction(selected.id, delta, reason);
    if (result.success) {
      setStatus("ok");
      setSelected((prev) => prev ? { ...prev, balance: prev.balance + delta } : null);
      setDelta(0);
      setReason("");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="space-y-5">
      {/* Search */}
      <div>
        <label className="text-sm font-medium text-zinc-300">Buscar cliente</label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Nombre del cliente..."
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={status === "searching"}
            className="ghost-button rounded-[16px] px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {status === "searching" ? "..." : "Buscar"}
          </button>
        </div>

        {results.length > 0 && !selected && (
          <div className="mt-2 divide-y divide-zinc-800 rounded-2xl border border-zinc-700 bg-zinc-900">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setSelected(r); setResults([]); }}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/4"
              >
                <span className="font-medium text-white">{r.name}</span>
                <span className="text-sm font-semibold text-[#8cff59]">{formatOvnis(r.balance)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected client + form */}
      {selected && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3">
            <div>
              <p className="font-semibold text-white">{selected.name}</p>
              <p className="text-sm text-zinc-400">
                Balance: <span className="font-semibold text-[#8cff59]">{formatOvnis(selected.balance)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              Cambiar
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-zinc-300">
                Delta <span className="text-zinc-500">(positivo suma, negativo resta)</span>
              </label>
              <input
                type="number"
                step={1}
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value))}
                required
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-[#8cff59]/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">Motivo</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo del ajuste..."
                required
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={status === "saving" || delta === 0}
              className="neon-button rounded-[20px] px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {status === "saving" ? "Guardando..." : "Aplicar ajuste"}
            </button>
            {status === "ok" && (
              <span className="text-sm font-medium text-[#8cff59]">Ajuste aplicado</span>
            )}
            {status === "error" && (
              <span className="text-sm font-medium text-red-300">{errorMsg}</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
