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
  // Preguntas 1-5 (originales)
  lifestyle: "minimal" | "nocturno" | "outdoor" | "formal";
  morningMinutes: 0 | 3 | 5 | 10;
  arrival: "caminando" | "auto" | "apurado" | "con-tiempo";
  perfectCut: "otros-notan" | "lo-siento" | "dura-semanas";
  turnoff: "musica-boluda" | "gente-de-mas" | "apuro" | "charla-forzada";
  // Preguntas 6-10 (nuevas, opcionales para no romper perfiles existentes)
  music?: "trap" | "rock" | "reggaeton" | "electronica";
  weekendStyle?: "todo-negro" | "sporty" | "como-siempre" | "me-armo";
  chairBehavior?: "celular" | "duermo" | "hablo" | "miro-todo";
  beard?: "rapada" | "prolija" | "descuidada" | "no-tengo";
  barberTrust?: "le-explico-todo" | "le-muestro-foto" | "confio-en-el" | "mitad-y-mitad";
  // Pregunta 11: texto libre
  freeText?: string;
  // Color favorito para avatar alien (pregunta 12, antes de la cámara)
  favoriteColor?: string;
};

export type StyleDominante =
  | "El Victor" | "El Código" | "El Turbio"
  | "El Espectro" | "El Pesado" | "El Clandestino"
  | "El Detonante" | "El Bardo" | "El Humo"
  | "El Satélite" | "El Filo" | "El Umbral"
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
