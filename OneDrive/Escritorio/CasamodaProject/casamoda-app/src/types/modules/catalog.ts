// Tipos alineados al backend casamoda-backend (modulo catalog).
// Fuente: src/modules/catalog/catalog.service.ts

export type Source = 'db' | 'mock';

export type StoreTier = 'A' | 'B' | 'C';
export type StoreCapacity = 'NORMAL' | 'LIMITADA' | 'OUTLET';

export interface Store {
  id?: string;
  code: string;
  name: string;
  tier: StoreTier;
  factorTienda: number | string;
  capacity: StoreCapacity;
  esOutlet: boolean;
  active?: boolean;
  maxCapacidadPorCategoria?: Record<string, number> | null;
}

export interface Group {
  code: string;
  name: string;
  categories?: Category[];
}

export interface Category {
  code: string;
  name: string;
  groupCode?: string;
  multiplo: number;
  myMaxBase?: number;
}

export interface Family {
  code: string;
  name: string;
}

export type BlockingStatus = 'HABILITADO' | 'BLOQUEADO' | 'OUTLET';

export interface BlockingRow {
  storeCode: string;
  storeName: string;
  esOutlet: boolean;
  categorias: Array<{
    categoryCode: string;
    categoryName: string;
    status: BlockingStatus;
  }>;
}

export interface MatrixResponse {
  source: Source;
  matrix: BlockingRow[];
}

export interface ListResponse<T> {
  source: Source;
  items: T[];
}

export interface ProductListResponse<T> {
  source: Source;
  total: number;
  skip: number;
  take: number;
  items: T[];
}

export interface ProductListItem {
  sku: string;
  description: string;
  color?: string | null;
  talle?: string | null;
  multiplo?: number | null;
  minimoBase?: number | null;
  maximoProducto?: number | null;
  equivalencia?: string;
  price?: string | number | null;
  cost?: string | number | null;
  tipoArticuloCode?: string;
  familyCode?: string | null;
}

export interface UpsertBlockingInput {
  storeCode: string;
  categoryCode?: string;
  groupCode?: string;
  status: 'BLOQUEADO' | 'HABILITADO';
  motivo?: string;
  actor?: string;
}

export interface BlockingAuditEvent {
  id: string;
  tipoEvento: string;
  actor?: string | null;
  timestamp: string;
  payload: {
    storeCode?: string | null;
    groupCode?: string | null;
    categoryCode?: string | null;
    prevStatus?: string | null;
    status?: string | null;
    motivo?: string | null;
  } | null;
}

export interface BlockingAuditFilters {
  limit?: number;
  storeCode?: string;
  categoryCode?: string;
  actor?: string;
  from?: string;
  to?: string;
}
