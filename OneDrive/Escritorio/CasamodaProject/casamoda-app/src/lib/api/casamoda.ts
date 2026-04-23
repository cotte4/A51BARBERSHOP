import type {
  BlockingAuditFilters,
  BlockingAuditEvent,
  Category,
  Family,
  Group,
  ListResponse,
  MatrixResponse,
  ProductListItem,
  ProductListResponse,
  Store,
  UpsertBlockingInput,
} from '@/types/modules/catalog';
import type {
  CreateOwnerDirectiveInput,
  DryRunInput,
  DryRunResult,
  GenerateInlineInput,
  GenerateInlineResult,
  MarkExceptionInput,
  MlScoreListResponse,
  MlScoreQueryInput,
  OwnerDirective,
  PatchAllocationsInput,
  ProposalAuditEvent,
  ProposalDetail,
  ProposalListItem,
} from '@/types/modules/division';
import type {
  ApplyPlanResult,
  ApplyResult,
  IngestionPreviewResult,
  IngestionUploadRecord,
  IngestionUploadResponse,
} from '@/types/modules/ingestion';
import type { AppUserRole } from '@/lib/auth-storage';
import { getStoredToken } from '@/lib/auth-storage';
import { API_BASE_URL, apiFetch } from './client';

export interface LoginResponse {
  accessToken: string;
  user: { id: string; email: string; name: string; role: AppUserRole };
}

export const casamodaApi = {
  baseUrl: API_BASE_URL,

  health: () => apiFetch<{ status: string; checks: { database: { ok: boolean } } }>('/health'),

  auth: {
    login: (body: { email: string; password: string }) =>
      apiFetch<LoginResponse>('/auth/login', { method: 'POST', body }),
    me: () => apiFetch<LoginResponse['user']>('/auth/me'),
  },

  catalog: {
    stores: () => apiFetch<ListResponse<Store>>('/catalog/stores'),
    groups: () => apiFetch<ListResponse<Group>>('/catalog/groups'),
    categories: () => apiFetch<ListResponse<Category>>('/catalog/categories'),
    families: () => apiFetch<ListResponse<Family>>('/catalog/families'),
    products: (params: { skip?: number; take?: number; search?: string } = {}) =>
      apiFetch<ProductListResponse<ProductListItem>>('/catalog/products', { query: params }),
    blockingsMatrix: () => apiFetch<MatrixResponse>('/catalog/blockings/matrix'),
    blockingsAudit: (filters: BlockingAuditFilters = { limit: 50 }) =>
      apiFetch<BlockingAuditEvent[]>('/catalog/blockings/audit', {
        query: filters as unknown as Record<string, string | number | boolean | undefined>,
      }),
    upsertBlocking: (input: UpsertBlockingInput) =>
      apiFetch('/catalog/blockings/upsert', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }),
  },

  ingestion: {
    preview: async (file: File): Promise<IngestionPreviewResult> => {
      const fd = new FormData();
      fd.append('file', file);
      return apiFetch<IngestionPreviewResult>('/ingestion/preview', {
        method: 'POST',
        body: fd,
      });
    },
    upload: async (file: File): Promise<IngestionUploadResponse> => {
      const fd = new FormData();
      fd.append('file', file);
      return apiFetch<IngestionUploadResponse>('/ingestion/upload', {
        method: 'POST',
        body: fd,
      });
    },
    list: () => apiFetch<IngestionUploadRecord[]>('/ingestion/uploads'),
    applyPreview: async (file: File): Promise<ApplyPlanResult> => {
      const fd = new FormData();
      fd.append('file', file);
      return apiFetch<ApplyPlanResult>('/ingestion/apply-preview', {
        method: 'POST',
        body: fd,
      });
    },
    apply: async (file: File): Promise<ApplyResult> => {
      const fd = new FormData();
      fd.append('file', file);
      return apiFetch<ApplyResult>('/ingestion/apply', {
        method: 'POST',
        body: fd,
      });
    },
  },

  division: {
    listMlScores: (query: MlScoreQueryInput = {}) =>
      apiFetch<MlScoreListResponse>('/division/ml-scores', {
        query: query as unknown as Record<string, string | number | boolean | undefined>,
      }),
    dryRun: (input: DryRunInput) =>
      apiFetch<DryRunResult>('/division/dry-run', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }),
    generate: (input: GenerateInlineInput) =>
      apiFetch<GenerateInlineResult>('/division/proposals', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }),
    list: (limit = 50) =>
      apiFetch<ProposalListItem[]>('/division/proposals', { query: { limit } }),
    get: (id: string) => apiFetch<ProposalDetail>(`/division/proposals/${id}`),
    listAudit: (id: string) =>
      apiFetch<ProposalAuditEvent[]>(`/division/proposals/${encodeURIComponent(id)}/audit`),
    patchAllocations: (id: string, input: PatchAllocationsInput) =>
      apiFetch<ProposalDetail>(`/division/proposals/${id}/allocations`, {
        method: 'PATCH',
        body: input as unknown as Record<string, unknown>,
      }),
    acceptSuggested: (id: string, actor?: string) =>
      apiFetch<ProposalDetail>(`/division/proposals/${id}/accept-suggested`, {
        method: 'POST',
        body: { actor } as Record<string, unknown>,
      }),
    validate: (id: string, actor?: string) =>
      apiFetch<ProposalDetail>(`/division/proposals/${id}/validate`, {
        method: 'POST',
        body: { actor } as Record<string, unknown>,
      }),
    publish: (id: string, actor?: string) =>
      apiFetch<ProposalDetail>(`/division/proposals/${id}/publish`, {
        method: 'POST',
        body: { actor } as Record<string, unknown>,
      }),
    discard: (id: string, actor?: string) =>
      apiFetch<ProposalDetail>(`/division/proposals/${id}/discard`, {
        method: 'POST',
        body: { actor } as Record<string, unknown>,
      }),
    markException: (id: string, input: MarkExceptionInput) =>
      apiFetch<ProposalDetail>(`/division/proposals/${id}/marcar-excepcion`, {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }),
    listDirectives: (includeInactive = true) =>
      apiFetch<OwnerDirective[]>('/division/directives', {
        query: { includeInactive },
      }),
    createDirective: (input: CreateOwnerDirectiveInput) =>
      apiFetch<OwnerDirective>('/division/directives', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      }),
    activateDirective: (id: string, actor?: string) =>
      apiFetch<OwnerDirective>(`/division/directives/${id}/activate`, {
        method: 'POST',
        body: { actor } as Record<string, unknown>,
      }),
    deactivateDirective: (id: string, actor?: string) =>
      apiFetch<OwnerDirective>(`/division/directives/${id}/deactivate`, {
        method: 'POST',
        body: { actor } as Record<string, unknown>,
      }),
    downloadProposalExport: async (id: string, format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<void> => {
      const url = `${API_BASE_URL}/division/proposals/${encodeURIComponent(id)}/export?format=${format}`;
      const headers = new Headers();
      const token = getStoredToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const res = await fetch(url, { headers });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j: unknown = await res.json();
          if (j && typeof j === 'object' && 'message' in j) {
            msg = String((j as { message: unknown }).message);
          }
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const cd = res.headers.get('Content-Disposition');
      const ext = format === 'csv' ? 'csv' : format === 'xlsx' ? 'xlsx' : 'pdf';
      let filename = `planilla-deposito.${ext}`;
      const m = cd?.match(/filename="([^"]+)"/);
      if (m?.[1]) filename = m[1];
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    },
  },
};
