// ————————————————————————————
// Roles de usuario
// ————————————————————————————
export type Rol = "admin" | "barbero";

// ————————————————————————————
// Tipos del modelo financiero
// ————————————————————————————
export type TipoModelo = "variable" | "hibrido" | "fijo";

export type TipoMovimientoStock =
  | "entrada"
  | "venta"
  | "uso_interno"
  | "ajuste";

export type FrecuenciaGasto = "mensual" | "trimestral" | "anual" | "unica";

// ————————————————————————————
// Cálculos financieros (siempre en servidor)
// ————————————————————————————
export interface CalculoAtencion {
  precioCobrado: number;
  comisionMedioPagoPct: number;
  comisionMedioPagoMonto: number;
  montoNeto: number;
  comisionBarberoPct: number;
  comisionBarberoMonto: number;
}

// ————————————————————————————
// Resumen de barbero en cierre de caja
// ————————————————————————————
export interface ResumenBarberoCierre {
  barberoId: string;
  nombre: string;
  cantidadAtenciones: number;
  totalBruto: number;
  totalComision: number;
}
