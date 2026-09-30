import type { CalendarioCuotas } from "@/lib/amortizacion";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2027-01" → "ene" (corto), "enero" (mes) o "enero de 2027" (largo). Igual en server y client. */
export function nombreMes(mes: string, formato: "corto" | "mes" | "largo"): string {
  const [y, m] = mes.split("-").map(Number);
  const nombre = MESES[m - 1] ?? mes;
  if (formato === "corto") return nombre.slice(0, 3);
  return formato === "mes" ? nombre : `${nombre} de ${y}`;
}

/** Etiqueta y color de la situación del repago. El color nunca va solo: el texto lleva ✓ / !. */
export const SITUACION_LABEL: Record<CalendarioCuotas["situacion"], string> = {
  adelantado: "✓ Adelantados",
  al_dia: "Al día",
  atrasado: "! Atrasados",
  devuelto: "✓ Préstamo devuelto",
};

export const SITUACION_PILL: Record<CalendarioCuotas["situacion"], string> = {
  adelantado: "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#8cff59]",
  al_dia: "border-white/10 bg-white/8 text-zinc-200",
  atrasado: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  devuelto: "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#8cff59]",
};
