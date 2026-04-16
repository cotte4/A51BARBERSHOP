export { formatARS } from "@/lib/format";

export function getFechaHoy(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function formatFechaLarga(fechaISO: string): string {
  const [year, month, day] = fechaISO.split("-").map(Number);
  const fecha = new Date(year, month - 1, day);
  return fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function formatHora(hora: string | null): string {
  if (!hora) return "--:--";
  return hora.slice(0, 5);
}

export function formatHoraDate(date: Date | null | undefined): string {
  if (!date) return "--:--";
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

export function getPaymentAccent(nombre: string | null | undefined) {
  const normalized = (nombre ?? "").toLowerCase();

  if (normalized.includes("efectivo")) {
    return {
      label: "Efectivo",
      className: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25",
    };
  }

  if (normalized.includes("transfer")) {
    return {
      label: nombre ?? "Transferencia",
      className: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/25",
    };
  }

  if (normalized.includes("tarjeta") || normalized.includes("posnet") || normalized.includes("mp")) {
    return {
      label: nombre ?? "Tarjeta",
      className: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25",
    };
  }

  return {
    label: nombre ?? "Medio de pago",
    className: "bg-zinc-800 text-zinc-300 ring-1 ring-zinc-700",
  };
}

export function getAtencionTone(anulada: boolean) {
  if (anulada) {
    return {
      wrapper: "border-red-500/30 bg-red-500/10 text-red-300",
      rail: "bg-red-400",
      badge: "bg-red-500/15 text-red-300 ring-1 ring-red-500/25",
      amount: "text-red-300",
      meta: "text-red-300",
      note: "text-red-300/80",
    };
  }

  return {
    wrapper: "border-zinc-700 bg-zinc-900 hover:-translate-y-0.5",
    rail: "bg-zinc-600",
    badge: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25",
    amount: "text-white",
    meta: "text-white",
    note: "text-zinc-400",
  };
}

export function getProductoEmoji(nombre: string | undefined) {
  const normalized = (nombre ?? "").toLowerCase();
  if (normalized.includes("cafe")) return "CA";
  if (normalized.includes("pomada")) return "PO";
  if (normalized.includes("shampoo")) return "SH";
  if (normalized.includes("gel")) return "GE";
  if (normalized.includes("cera")) return "CE";
  if (normalized.includes("toalla")) return "TO";
  if (normalized.includes("agua")) return "AG";
  return "PR";
}
