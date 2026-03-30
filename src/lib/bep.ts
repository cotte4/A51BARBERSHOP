// Lógica pura del Punto de Equilibrio (BEP) — sin acceso a DB

export type BepParams = {
  gastosMesReal: number;
  presupuestoMensual: number;
  alquilerBancoDia: number;
  precioPromedioDia: number;
  mixGabote: number; // 0-1, default 0.5 si no hay datos
  feePromedioMedioPago: number; // proporción, ej: 0.03 para 3%
  diasMes: number;
  cortesDiaMes: number;
};

export type BepResultado = {
  cortesBep: number;
  cortesDiaActual: number;
  superado: boolean;
  faltanCortes: number;
  usandoPresupuesto: boolean; // true si usó presupuesto, false si usó gastos reales
  sinReferencia: boolean; // true si gastos=0 Y presupuesto=0
};

export function calcularBep(params: BepParams): BepResultado {
  const {
    gastosMesReal,
    presupuestoMensual,
    alquilerBancoDia,
    precioPromedioDia,
    mixGabote,
    feePromedioMedioPago,
    diasMes,
    cortesDiaMes,
  } = params;

  // Sin referencia
  if (gastosMesReal <= 0 && presupuestoMensual <= 0) {
    return {
      cortesBep: 0,
      cortesDiaActual: cortesDiaMes,
      superado: false,
      faltanCortes: 0,
      usandoPresupuesto: false,
      sinReferencia: true,
    };
  }

  // Determinar referencia de gastos por día
  let gastosReferenciaDia: number;
  let usandoPresupuesto: boolean;

  if (gastosMesReal > 0) {
    gastosReferenciaDia = gastosMesReal / (diasMes > 0 ? diasMes : 1);
    usandoPresupuesto = false;
  } else {
    gastosReferenciaDia = presupuestoMensual / (diasMes > 0 ? diasMes : 1);
    usandoPresupuesto = true;
  }

  // Contribución de la casa por corte
  // Solo los cortes de Gabote aportan a la casa (25% - fee)
  // Los cortes de Pinky no aportan a la casa
  // El alquiler banco se prorratea por corte estimado del día
  const cortesEstimadosDia = cortesDiaMes > 0 ? cortesDiaMes : 1;
  const contribucionPorCorteGabote =
    precioPromedioDia * (0.25 - feePromedioMedioPago);
  const aporteAlquilerPorCorte = alquilerBancoDia / cortesEstimadosDia;
  const contribucionCasaPorCorte =
    mixGabote * contribucionPorCorteGabote + aporteAlquilerPorCorte;

  if (contribucionCasaPorCorte <= 0) {
    return {
      cortesBep: 0,
      cortesDiaActual: cortesDiaMes,
      superado: false,
      faltanCortes: 0,
      usandoPresupuesto,
      sinReferencia: false,
    };
  }

  const cortesBep = Math.ceil(gastosReferenciaDia / contribucionCasaPorCorte);
  const superado = cortesDiaMes >= cortesBep;
  const faltanCortes = Math.max(0, cortesBep - cortesDiaMes);

  return {
    cortesBep,
    cortesDiaActual: cortesDiaMes,
    superado,
    faltanCortes,
    usandoPresupuesto,
    sinReferencia: false,
  };
}
