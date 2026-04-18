// Tipos compartidos del dominio
export type CategoriaGastoRapidoKey =
  | "cafe"
  | "bebida"
  | "comida"
  | "barber"
  | "limpieza"
  | "compras"
  | "otros";

export interface ClientPreferences {
  allergies?: string;
  productPreferences?: string;
  extraNotes?: string;
}

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
  styleAnalysis?: StyleAnalysis | null;
}

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

export interface QuickActionDefaults {
  servicioId: string;
  servicioNombre: string;
  precioBase: number;
  medioPagoId: string;
  medioPagoNombre: string;
  comisionMedioPagoPct: number;
}

// Perfil Marciano (Style DNA)
export type FaceShape = "oval" | "cuadrado" | "redondo" | "corazon" | "diamante" | "alien";

export type InterrogatoryAnswers = {
  lifestyle: "minimal" | "nocturno" | "outdoor" | "formal";
  morningMinutes: 0 | 3 | 5 | 10;
  perfectCut: "otros-notan" | "lo-siento" | "dura-semanas";
  // Psychological questions (Fase 4)
  praiseResponse?: "reafirma" | "duda" | "indiferente" | "incomodo";
  feedbackTolerance?: "lo_pruebo" | "pregunto" | "dudo" | "rechazo";
  socialProjection?: "mucho" | "equilibrado" | "poco" | "nada";
  // Legacy fields (pre-Fase 4) — kept for backward compat with existing JSONB
  arrival?: "caminando" | "auto" | "apurado" | "con-tiempo";
  turnoff?: "musica-boluda" | "gente-de-mas" | "apuro" | "charla-forzada";
  weekendStyle?: "todo-negro" | "sporty" | "como-siempre" | "me-armo";
  // Preguntas 6-10
  music?: "trap" | "rock" | "reggaeton" | "electronica";
  chairBehavior?: "celular" | "duermo" | "hablo" | "miro-todo";
  beard?: "rapada" | "prolija" | "descuidada" | "no-tengo";
  barberTrust?: "le-explico-todo" | "le-muestro-foto" | "confio-en-el" | "mitad-y-mitad";
  freeText?: string;
};

export type StyleAnalysis = {
  perfil: string;
  estilosProbables: string[];
  actitudCambio: "conservador" | "abierto" | "aventurero";
  notasBarbero: string;
  confianza: number;
  generadoEn: string;
  modelo: string;
};

export type StyleDominante =
  | "El Quebrado" | "El Contador" | "El Ancla" | "El Silueta"
  | "El Espectro" | "El Vinilo" | "El Filo" | "El Pesado"
  | "El Raíz" | "El Mapa" | "El Gravedad" | "El Humo"
  | "El Satélite" | "El Órbita" | "El Caldo" | "El Núcleo"
  | "El Intergaláctico";

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
