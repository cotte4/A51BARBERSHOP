export const HANGAR_ASSET_CATEGORIAS = [
  "Mobiliario",
  "Equipamiento",
  "Iluminación",
  "Herramientas",
  "Tecnología",
  "Otros",
] as const;

export const HANGAR_ASSET_ESTADOS_COMPRA = [
  "planificado",
  "senado",
  "en_cuotas",
  "pagado",
  "cancelado",
] as const;

export const HANGAR_ASSET_PAYMENT_TYPES = [
  "sena",
  "cuota",
  "saldo_final",
  "ajuste",
] as const;

export const CAPITAL_MOVIMIENTO_TYPES = [
  "aporte",
  "retiro",
  "inversion_activo",
] as const;

export type HangarAssetCategoria = (typeof HANGAR_ASSET_CATEGORIAS)[number];
export type HangarAssetEstadoCompra = (typeof HANGAR_ASSET_ESTADOS_COMPRA)[number];
export type HangarAssetPaymentType = (typeof HANGAR_ASSET_PAYMENT_TYPES)[number];
export type CapitalMovimientoTipo = (typeof CAPITAL_MOVIMIENTO_TYPES)[number];

export function toMoneyNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function clampMoney(value: number): number {
  return Math.max(0, Math.round(value * 100) / 100);
}

export function resolveEstadoCompra(params: {
  target: number;
  totalPaid: number;
  paymentCount: number;
  firstPaymentType?: HangarAssetPaymentType | null;
  fallback?: HangarAssetEstadoCompra | null;
}): HangarAssetEstadoCompra {
  const { target, totalPaid, paymentCount, firstPaymentType, fallback } = params;

  if (fallback === "cancelado") {
    return "cancelado";
  }

  if (totalPaid <= 0 || paymentCount <= 0) {
    return fallback === "pagado" && target > 0 ? "pagado" : "planificado";
  }

  if (target > 0 && totalPaid >= target) {
    return "pagado";
  }

  if (paymentCount === 1 && firstPaymentType === "sena") {
    return "senado";
  }

  return "en_cuotas";
}

export function getAssetFinancials(params: {
  precioObjetivo?: string | number | null;
  precioCompra?: string | number | null;
  totalPaid?: number;
  paymentCount?: number;
  estadoCompra?: string | null;
  firstPaymentType?: HangarAssetPaymentType | null;
}) {
  const target = clampMoney(
    toMoneyNumber(params.precioObjetivo) || toMoneyNumber(params.precioCompra)
  );
  const fallbackState = (params.estadoCompra as HangarAssetEstadoCompra | null) ?? null;
  const paid = clampMoney(
    params.paymentCount && params.paymentCount > 0
      ? params.totalPaid ?? 0
      : fallbackState === "planificado" || fallbackState === "cancelado"
        ? 0
        : target
  );
  const pending = clampMoney(Math.max(target - paid, 0));
  const progress = target > 0 ? Math.min(100, Math.round((paid / target) * 100)) : 0;
  const estadoCompra = resolveEstadoCompra({
    target,
    totalPaid: paid,
    paymentCount: params.paymentCount ?? 0,
    firstPaymentType: params.firstPaymentType,
    fallback: fallbackState,
  });

  return {
    target,
    paid,
    pending,
    progress,
    estadoCompra,
  };
}

export function getEstadoCompraLabel(estado: string | null | undefined): string {
  switch (estado) {
    case "planificado":
      return "Planificado";
    case "senado":
      return "Senado";
    case "en_cuotas":
      return "En cuotas";
    case "pagado":
      return "Pagado";
    case "cancelado":
      return "Cancelado";
    default:
      return "Sin estado";
  }
}

export function getPaymentTypeLabel(tipo: string | null | undefined): string {
  switch (tipo) {
    case "sena":
      return "Sena";
    case "cuota":
      return "Cuota";
    case "saldo_final":
      return "Saldo final";
    case "ajuste":
      return "Ajuste";
    default:
      return "Pago";
  }
}

export function getCapitalMovimientoLabel(tipo: string | null | undefined): string {
  switch (tipo) {
    case "aporte":
      return "Aporte";
    case "retiro":
      return "Retiro";
    case "inversion_activo":
      return "Inversion activo";
    default:
      return "Movimiento";
  }
}
