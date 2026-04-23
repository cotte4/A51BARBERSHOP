export type AllocationFlag =
  | 'bloqueado'
  | 'outlet_only'
  | 'tope_categoria'
  | 'tope_producto'
  | 'multiplo_ajustado'
  | 'directiva_no_mandar'
  | 'directiva_priorizar'
  | 'directiva_forzar_cantidad'
  | 'sin_stock_suficiente'
  | 'residuo_asignado'
  | 'curva_incompleta'
  | 'cobertura_minima'
  | 'modo_top_n'
  | 'sin_historial';

export interface EngineAllocation {
  /** Id de `allocation_lines` cuando viene persistido. */
  id?: string;
  productId: string;
  storeId: string;
  cantidadSugerida: number;
  cantidadAprobada?: number | null;
  score: number;
  flags: AllocationFlag[];
}

export interface EngineResumen {
  productId: string;
  cantidadDisponible: number;
  cantidadAsignada: number;
  tiendasElegibles: number;
  tiendasAsignadas: number;
  flags: AllocationFlag[];
}

export interface EngineResult {
  allocations: EngineAllocation[];
  residuos: Record<string, number>;
  warnings: string[];
  resumenPorProducto: EngineResumen[];
  /** Solo true por curva de talles sin certificar (PRD §5.2). */
  requiereExcepcion: boolean;
  motivosExcepcion: string[];
}

export interface DryRunResult {
  result: EngineResult;
  skuToProductId: Record<string, string>;
  missingSkus: string[];
}

export interface DryRunLineInput {
  sku: string;
  cantidad: number;
  multiplo?: number;
  /** `false` si el articulo tiene talle y no hay curva completa certificada. */
  curvaCompleta?: boolean;
}

export interface DryRunInput {
  lines: DryRunLineInput[];
  /** Tipo de ingreso del lote (motor: fallback sin_historial en REPOSICION, PRD UAT #7). */
  tipo?: 'NUEVA' | 'REPOSICION';
}

export interface GenerateInlineInput extends DryRunInput {
  lotCode: string;
  origen?: 'NACIONAL' | 'IMPORTADO';
  notas?: string;
  actor?: string;
}

export interface GenerateInlineResult {
  lotId: string;
  proposalId: string;
  result: EngineResult;
  missingSkus: string[];
}

export type ProposalEstado =
  | 'BORRADOR'
  | 'VALIDADA'
  | 'REQUIERE_EXCEPCION'
  | 'PUBLICADA'
  | 'DESCARTADA';

/** Contenido típico de `DivisionProposal.resumenValidaciones` (JSON). */
export interface ProposalResumenValidaciones {
  residuos?: Record<string, number>;
  warnings?: string[];
  resumenPorProducto?: EngineResumen[];
  /** Remanente según motor al generar (productId → unidades); ver también `remanenteDepositoPorSku`. */
  remanenteDepositoPorSku?: Record<string, number>;
  requiereExcepcionCurva?: boolean;
  motivosExcepcionMotor?: string[];
  motivoExcepcionEncargado?: string;
  excepcionMarcadaEn?: string;
}

export interface ProposalListItem {
  id: string;
  createdAt: string;
  estado: ProposalEstado;
  generadoPor: string | null;
  lot: { lotCode: string; origen: string; tipo: string };
}

/** Evento de auditoria asociado a una propuesta (PRD §8.3). */
export interface ProposalAuditEvent {
  id: string;
  tipoEvento: string;
  actor: string | null;
  timestamp: string;
  payload: unknown;
}

export interface ProposalDetail {
  id: string;
  lotId: string;
  estado: ProposalEstado;
  resumenValidaciones: ProposalResumenValidaciones | null;
  createdAt: string;
  publicadoPor?: string | null;
  publicadaEn?: string | null;
  lot: {
    id: string;
    lotCode: string;
    origen: string;
    tipo: string;
    fechaIngreso: string;
    lines: Array<{
      id: string;
      cantidad: number;
      multiplo: number;
      product: { id: string; sku: string; description: string };
    }>;
  };
  allocations: Array<{
    id: string;
    productId: string;
    storeId: string;
    cantidadSugerida: number;
    cantidadAprobada: number | null;
    score: string | number;
    flags: AllocationFlag[];
    product: { sku: string; description: string };
    store: { code: string; name: string; tier: 'A' | 'B' | 'C' };
  }>;
}

export interface PatchAllocationsInput {
  lines: Array<{ id: string; cantidadAprobada: number }>;
  actor?: string;
}

export interface MarkExceptionInput {
  motivo: string;
  actor?: string;
}

export type DirectiveAlcance =
  | 'GLOBAL'
  | 'GRUPO'
  | 'CATEGORIA'
  | 'TIENDA'
  | 'TIENDA_CATEGORIA'
  | 'SKU';

export interface OwnerDirective {
  id: string;
  alcance: DirectiveAlcance;
  targetStoreId: string | null;
  targetGroupId: string | null;
  targetCategoryId: string | null;
  targetProductId: string | null;
  targetStoreCode?: string | null;
  targetStoreName?: string | null;
  targetGroupCode?: string | null;
  targetCategoryCode?: string | null;
  targetProductSku?: string | null;
  valor: Record<string, unknown>;
  motivo: string;
  emisor: string;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOwnerDirectiveInput {
  alcance: DirectiveAlcance;
  targetStoreId?: string;
  targetStoreCode?: string;
  targetGroupId?: string;
  targetGroupCode?: string;
  targetCategoryId?: string;
  targetCategoryCode?: string;
  targetProductId?: string;
  targetProductSku?: string;
  valor: Record<string, unknown>;
  motivo: string;
  emisor: string;
  vigenciaDesde?: string;
  vigenciaHasta?: string;
}

export interface MlScoreItem {
  id: string;
  product: { id: string; sku: string; description: string };
  store: { id: string; code: string; name: string; tier: 'A' | 'B' | 'C' };
  horizonDays: number;
  forecastDemand: number;
  mlScore: number;
  confidence: number | null;
  modelVersion: string;
  featureVersion: string | null;
  source: string;
  createdAt: string;
}

export interface MlScoreListResponse {
  source: 'db' | 'mock';
  items: MlScoreItem[];
}

export interface MlScoreQueryInput {
  sku?: string;
  storeCode?: string;
  horizonDays?: number;
  limit?: number;
}
