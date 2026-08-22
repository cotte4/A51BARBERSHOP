import { clampMoney, toMoneyNumber } from "@/lib/hangar";

/**
 * Categorias de inversion inicial (CAPEX puntual) para el presupuesto Memas.
 *
 * Deliberadamente separadas de HANGAR_ASSET_CATEGORIAS: un presupuesto es una
 * proyeccion, no un activo del negocio. Mezclarlas cambiaria los filtros y el
 * agrupado de los activos reales de A51.
 */
export const PRESUPUESTO_CATEGORIAS = [
  "Inmueble",
  "Obra",
  "Habilitaciones",
  "Equipamiento",
  "Mobiliario",
  "Otros",
] as const;

export const PRESUPUESTO_SCOPES = ["memas", "a51"] as const;

export type PresupuestoCategoria = (typeof PRESUPUESTO_CATEGORIAS)[number];
export type PresupuestoScope = (typeof PRESUPUESTO_SCOPES)[number];

export type PresupuestoLineaLike = {
  categoria: string;
  montoEstimado?: string | number | null;
};

export function isPresupuestoCategoria(value: string | null | undefined): value is PresupuestoCategoria {
  return PRESUPUESTO_CATEGORIAS.includes(value as PresupuestoCategoria);
}

export function isPresupuestoScope(value: string | null | undefined): value is PresupuestoScope {
  return PRESUPUESTO_SCOPES.includes(value as PresupuestoScope);
}

/**
 * Unica fuente de verdad de quien accede al presupuesto Memas: solo el rol
 * asesor (el lado Memas). Ni el admin de A51 — es el presupuesto de la
 * contraparte. La usan tanto la vista como las server actions.
 */
export function canViewPresupuestoMemas(role: string | null | undefined): boolean {
  return role === "asesor";
}

export function getScopeLabel(scope: string | null | undefined): string {
  switch (scope) {
    case "memas":
      return "Memas";
    case "a51":
      return "A51";
    default:
      return "Sin scope";
  }
}

/**
 * Total general + subtotal por categoria. Solo suma: un presupuesto no tiene
 * pagos ni estado de compra, asi que no hay nada que conciliar contra capital.
 */
export function getPresupuestoTotals(lineas: PresupuestoLineaLike[]) {
  const porCategoria = new Map<string, number>();
  let total = 0;

  for (const linea of lineas) {
    const monto = clampMoney(toMoneyNumber(linea.montoEstimado));
    total += monto;
    porCategoria.set(linea.categoria, (porCategoria.get(linea.categoria) ?? 0) + monto);
  }

  const grupos = PRESUPUESTO_CATEGORIAS.map((categoria) => ({
    categoria,
    subtotal: clampMoney(porCategoria.get(categoria) ?? 0),
    count: lineas.filter((linea) => linea.categoria === categoria).length,
  })).filter((grupo) => grupo.count > 0);

  return {
    total: clampMoney(total),
    grupos,
    count: lineas.length,
  };
}
