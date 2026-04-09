// ————————————————————————————
// Roles de usuario
// ————————————————————————————
export type Rol = "admin" | "barbero" | "marciano";

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
export type TipoGasto = "fijo" | "rapido";
export type CategoriaGastoRapidoKey =
  | "cafe"
  | "bebida"
  | "comida"
  | "barber"
  | "limpieza"
  | "compras"
  | "otros";

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

export interface ClientPreferences {
  allergies?: string;
  productPreferences?: string;
  extraNotes?: string;
}

export type ClientVipTag = string;

export interface ClientSummary {
  id: string;
  name: string;
  email: string | null;
  phoneRaw: string | null;
  avatarUrl?: string | null;
  esMarciano: boolean;
  archivedAt: Date | null;
  totalVisits: number;
  lastVisitAt: Date | null;
  lastVisitBarberoNombre?: string | null;
  lastVisitNote?: string | null;
}

export interface VisitLogSummary {
  id: string;
  visitedAt: Date;
  barberNotes: string | null;
  tags: string[];
  photoUrls: string[];
  propinaEstrellas: number;
  authorBarberoName?: string | null;
}

export interface ClientProfileEvent {
  id: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  changedByName?: string | null;
}

export interface MarcianoUsage {
  mes: string;
  cortesUsados: number;
  consumicionesUsadas: number;
  sorteosParticipados: number;
}

export interface MarcianoBeneficiosConfig {
  cortesPorMes: number | null;
  consumicionesPorMes: number | null;
  sorteosPorMes: number | null;
}

export interface ClientProfile extends ClientSummary {
  avatarUrl: string | null;
  tags: string[];
  notes: string | null;
  userId: string | null;
  preferences: ClientPreferences | null;
  marcianoDesde: Date | null;
  createdByUserId: string;
  createdByBarberoId: string | null;
  visits: VisitLogSummary[];
  auditEvents: ClientProfileEvent[];
  marcianoUsage: MarcianoUsage | null;
}

export interface VisitLogInput {
  barberNotes?: string;
  tags?: string[];
  photoUrls?: string[];
  propinaEstrellas?: number;
}

export type ClientBriefingScope = "admin" | "barbero";

export type TurnoEstado = "pendiente" | "confirmado" | "completado" | "cancelado";

export interface TurnoExtraInput {
  productoId: string;
  cantidad: number;
}

export interface DisponibilidadSlot {
  id: string;
  fecha: string;
  horaInicio: string;
  duracionMinutos: number;
}

export interface TurnoSummary {
  id: string;
  barberoId: string;
  barberoNombre: string;
  clienteNombre: string;
  clienteTelefonoRaw: string | null;
  fecha: string;
  horaInicio: string;
  duracionMinutos: number;
  estado: TurnoEstado;
  notaCliente: string | null;
  sugerenciaCancion: string | null;
  spotifyTrackUri: string | null;
  motivoCancelacion: string | null;
  esMarcianoSnapshot: boolean;
  prioridadAbsoluta: boolean;
  servicioNombre: string | null;
  precioEsperado: string | null;
  extras: Array<{
    id: string;
    nombre: string;
    cantidad: number;
  }>;
}

export interface TurnoDetalle extends TurnoSummary {
  barberoId: string;
  clientId: string | null;
}

export interface ReservaPublicInput {
  slug: string;
  serviceId: string;
  slotId: string;
  clienteNombre: string;
  clienteTelefonoRaw?: string;
  notaCliente?: string;
  sugerenciaCancion?: string;
  spotifyTrackUri?: string;
  extras?: TurnoExtraInput[];
}

export interface QuickActionDefaults {
  servicioId: string;
  servicioNombre: string;
  precioBase: number;
  medioPagoId: string;
  medioPagoNombre: string;
  comisionMedioPagoPct: number;
}

// ————————————————————————————
// Perfil Marciano (Style DNA)
// ————————————————————————————
export type FaceShape = 'oval' | 'cuadrado' | 'redondo' | 'corazon' | 'diamante' | 'alien';

export type InterrogatoryAnswers = {
  lifestyle: 'minimal' | 'nocturno' | 'outdoor' | 'formal';
  morningMinutes: 0 | 3 | 5 | 10;
  arrival: 'caminando' | 'auto' | 'apurado' | 'con-tiempo';
  perfectCut: 'otros-notan' | 'lo-siento' | 'dura-semanas';
  turnoff: 'musica-boluda' | 'gente-de-mas' | 'apuro' | 'charla-forzada';
};

export type StyleDominante = 'Comandante' | 'Capitán' | 'Piloto' | 'Navegante' | 'Explorador' | 'Intergaláctico';

export type StyleProfile = {
  version: 1;
  dominantStyle: StyleDominante;
  recommendedCuts: string[];
  chairTimeMin: number;
  idealBarberoId: string | null;
  faceMetrics: {
    widthHeightRatio: number;
    jawWidthRatio: number;
    foreheadChinRatio: number;
  } | null;
  answers: InterrogatoryAnswers;
  generatedAt: string;
};

export interface MarcianoVisit {
  id: string;
  visitedAt: Date;
  barberoNombre: string | null;
  photoUrls: string[];
  corteNombre: string | null;
  tags: string[];
}
