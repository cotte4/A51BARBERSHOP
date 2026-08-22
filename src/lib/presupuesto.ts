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

export const FOTO_POS_DEFAULT = "50% 50%";

/**
 * Valida/normaliza un object-position guardado. Solo aceptamos el formato
 * "<x>% <y>%" con ambos valores entre 0 y 100: el valor va directo a un
 * style inline, asi que no puede entrar texto arbitrario.
 */
export function normalizeFotoPos(value: string | null | undefined): string {
  if (!value) return FOTO_POS_DEFAULT;

  const match = /^(\d{1,3}(?:\.\d+)?)% (\d{1,3}(?:\.\d+)?)%$/.exec(value.trim());
  if (!match) return FOTO_POS_DEFAULT;

  const x = Number(match[1]);
  const y = Number(match[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
    return FOTO_POS_DEFAULT;
  }

  return `${x}% ${y}%`;
}

export const FOTO_ZOOM_DEFAULT = 1;
export const FOTO_ZOOM_MIN = 1;
export const FOTO_ZOOM_MAX = 4;

/** Zoom del recorte, acotado a [1, 4]. Cualquier basura cae en 1 (sin recorte). */
export function normalizeFotoZoom(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return FOTO_ZOOM_DEFAULT;
  const clamped = Math.min(FOTO_ZOOM_MAX, Math.max(FOTO_ZOOM_MIN, parsed));
  return Math.round(clamped * 100) / 100;
}

/**
 * Estilo del recorte, en un solo lugar para que la miniatura de la lista y la
 * previsualizacion del modal se vean exactamente igual.
 *
 * transformOrigin acompana a objectPosition: al escalar, el punto elegido
 * queda quieto en vez de irse de cuadro.
 */
export function getFotoCropStyle(
  fotoPos: string | null | undefined,
  fotoZoom: string | number | null | undefined,
  extraScale = 1
) {
  const position = normalizeFotoPos(fotoPos);
  const zoom = normalizeFotoZoom(fotoZoom) * extraScale;

  return {
    objectPosition: position,
    transformOrigin: position,
    transform: `scale(${zoom})`,
  };
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
