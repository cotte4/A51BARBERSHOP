"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

type SupportFormType = "bug_report" | "feature_request" | "implementation_idea" | null;

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  bullets?: string[];
  deepLinks?: Array<{ label: string; href: string }>;
};

export default function InternalSupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeFormType, setActiveFormType] = useState<SupportFormType>(null);
  const [reporting, setReporting] = useState(false);
  const [reportSummary, setReportSummary] = useState("");
  const [reportExpected, setReportExpected] = useState("");
  const [reportActual, setReportActual] = useState("");
  const [reportSeverity, setReportSeverity] = useState<"low" | "medium" | "high" | "critical">(
    "medium"
  );
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalProblem, setProposalProblem] = useState("");
  const [proposalIdea, setProposalIdea] = useState("");
  const [proposalImpact, setProposalImpact] = useState("");
  const [proposalUrgency, setProposalUrgency] = useState<"baja" | "media" | "alta" | "critica">(
    "media"
  );
  const [copilotModeLabel, setCopilotModeLabel] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "assistant",
      content: "Soy soporte interno. Preguntame como usar esta pantalla o decime si algo no funciono.",
    },
  ]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/internal-support/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          pathname,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        reply?: string;
        bullets?: string[];
        deepLinks?: Array<{ label: string; href: string }>;
        formType?: SupportFormType;
        copilotModeLabel?: string;
      };

      if (!response.ok || !payload.reply) {
        setTurns((prev) => [
          ...prev,
          {
            role: "assistant",
            content: payload.error ?? "No pude procesar tu consulta. Intenta de nuevo.",
          },
        ]);
        return;
      }

      const assistantReply = payload.reply ?? "No pude procesar tu consulta. Intenta de nuevo.";

      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantReply,
          bullets: payload.bullets,
          deepLinks: payload.deepLinks,
        },
      ]);
      setActiveFormType(payload.formType ?? null);
      if (payload.copilotModeLabel) {
        setCopilotModeLabel(payload.copilotModeLabel);
      }
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "No pude conectarme al soporte interno. Reintenta en unos segundos.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitBugReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reporting) return;
    setReporting(true);

    try {
      const response = await fetch("/api/internal-support/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: reportSummary,
          expectedBehavior: reportExpected,
          actualBehavior: reportActual,
          severity: reportSeverity,
          pathname,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setTurns((prev) => [
          ...prev,
          { role: "assistant", content: payload.error ?? "No pude registrar el bug." },
        ]);
        return;
      }

      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Reporte registrado. Lo vas a ver en Negocio > Soporte para triage.",
        },
      ]);

      setReportSummary("");
      setReportExpected("");
      setReportActual("");
      setReportSeverity("medium");
    } catch {
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: "Error de red al registrar el bug." },
      ]);
    } finally {
      setReporting(false);
    }
  }

  async function onSubmitProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reporting || !activeFormType || activeFormType === "bug_report") return;
    setReporting(true);

    try {
      const response = await fetch("/api/internal-support/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeType: activeFormType,
          title: proposalTitle,
          problem: proposalProblem,
          proposal: proposalIdea,
          impact: proposalImpact,
          urgency: proposalUrgency,
          pathname,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setTurns((prev) => [
          ...prev,
          { role: "assistant", content: payload.error ?? "No pude registrar la propuesta." },
        ]);
        return;
      }

      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Propuesta registrada en soporte interno. Queda disponible para priorizacion y seguimiento.",
        },
      ]);
      setProposalTitle("");
      setProposalProblem("");
      setProposalIdea("");
      setProposalImpact("");
      setProposalUrgency("media");
    } catch {
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: "Error de red al registrar la propuesta." },
      ]);
    } finally {
      setReporting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-24 right-4 z-50 rounded-full border border-[#8cff59]/35 bg-[#8cff59]/15 px-4 py-2 text-xs font-semibold text-[#b6ff84] backdrop-blur transition hover:bg-[#8cff59]/25 md:bottom-28"
      >
        {open ? "Cerrar ayuda" : "Soporte"}
      </button>

      {open ? (
        <section className="fixed bottom-40 right-4 z-50 flex w-[min(92vw,380px)] flex-col gap-3 rounded-2xl border border-zinc-700 bg-zinc-950/95 p-4 shadow-2xl">
          <div>
            <p className="eyebrow text-[10px]">Asistente interno</p>
            <p className="mt-1 text-xs text-zinc-400">Ruta actual: {pathname}</p>
            {copilotModeLabel ? (
              <p className="mt-0.5 text-[10px] text-zinc-500">
                Modo:{" "}
                <span className="font-semibold text-[#8cff59]/90">{copilotModeLabel}</span>
              </p>
            ) : null}
          </div>

          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            {turns.map((turn, index) => (
              <div
                key={`${turn.role}-${index}`}
                className={`rounded-xl px-3 py-2 text-sm ${
                  turn.role === "assistant"
                    ? "border border-zinc-700 bg-zinc-900 text-zinc-200"
                    : "border border-[#8cff59]/30 bg-[#8cff59]/10 text-[#d7ffc0]"
                }`}
              >
                <p>{turn.content}</p>
                {turn.bullets && turn.bullets.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                    {turn.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {turn.deepLinks && turn.deepLinks.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {turn.deepLinks.map((deepLink) => (
                      <Link
                        key={`${deepLink.href}-${deepLink.label}`}
                        href={deepLink.href}
                        className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-[#8cff59]/35 hover:text-[#8cff59]"
                      >
                        {deepLink.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ej: como completo un turno, o no funciono cobrar..."
              className="min-h-[72px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="neon-button rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </form>

          {activeFormType === "bug_report" ? (
            <form onSubmit={onSubmitBugReport} className="mt-2 flex flex-col gap-2 border-t border-zinc-800 pt-3">
              <p className="text-xs font-medium text-zinc-300">Formulario de bug</p>
              <input
                value={reportSummary}
                onChange={(event) => setReportSummary(event.target.value)}
                placeholder="Resumen corto"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <input
                value={reportExpected}
                onChange={(event) => setReportExpected(event.target.value)}
                placeholder="Que esperabas"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <input
                value={reportActual}
                onChange={(event) => setReportActual(event.target.value)}
                placeholder="Que paso realmente"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <select
                value={reportSeverity}
                onChange={(event) =>
                  setReportSeverity(event.target.value as "low" | "medium" | "high" | "critical")
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-[#8cff59]/60 focus:outline-none"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
              <button
                type="submit"
                disabled={reporting}
                className="ghost-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                {reporting ? "Registrando..." : "Registrar bug"}
              </button>
            </form>
          ) : null}

          {activeFormType === "feature_request" || activeFormType === "implementation_idea" ? (
            <form onSubmit={onSubmitProposal} className="mt-2 flex flex-col gap-2 border-t border-zinc-800 pt-3">
              <p className="text-xs font-medium text-zinc-300">
                {activeFormType === "feature_request" ? "Formulario de feature" : "Formulario de implementacion"}
              </p>
              <input
                value={proposalTitle}
                onChange={(event) => setProposalTitle(event.target.value)}
                placeholder="Titulo corto"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <textarea
                value={proposalProblem}
                onChange={(event) => setProposalProblem(event.target.value)}
                placeholder="Problema que queres resolver"
                className="min-h-[56px] w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <textarea
                value={proposalIdea}
                onChange={(event) => setProposalIdea(event.target.value)}
                placeholder="Propuesta concreta"
                className="min-h-[56px] w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <input
                value={proposalImpact}
                onChange={(event) => setProposalImpact(event.target.value)}
                placeholder="Impacto esperado (tiempo, plata, calidad)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <select
                value={proposalUrgency}
                onChange={(event) =>
                  setProposalUrgency(event.target.value as "baja" | "media" | "alta" | "critica")
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-[#8cff59]/60 focus:outline-none"
              >
                <option value="baja">baja</option>
                <option value="media">media</option>
                <option value="alta">alta</option>
                <option value="critica">critica</option>
              </select>
              <button
                type="submit"
                disabled={reporting}
                className="ghost-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                {reporting ? "Registrando..." : "Registrar propuesta"}
              </button>
            </form>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
