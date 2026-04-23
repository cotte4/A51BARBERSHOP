'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  ErrorState,
  LoadingCard,
  SourceBadge,
} from '@/components/ui/data-placeholder';
import { casamodaApi } from '@/lib/api/casamoda';
import { getStoredUser } from '@/lib/auth-storage';
import { BlockingStatus } from '@/types/modules/catalog';

const STATUS_CELL: Record<BlockingStatus, { label: string; className: string }> = {
  HABILITADO: {
    label: 'OK',
    className:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  BLOQUEADO: {
    label: 'BLOQ',
    className:
      'bg-destructive/10 text-destructive border-destructive/30',
  },
  OUTLET: {
    label: 'OUTLET',
    className:
      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
};

export function BlockingMatrix() {
  const qc = useQueryClient();
  const user = useMemo(() => getStoredUser(), []);
  const canEdit = user?.role === 'ADMIN';
  const [motivo, setMotivo] = useState('Ajuste manual matriz');
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [lastCellFeedback, setLastCellFeedback] = useState<{ kind: 'ok' | 'error'; message: string } | null>(
    null,
  );
  const [auditLimit, setAuditLimit] = useState(30);
  const [auditStoreCode, setAuditStoreCode] = useState('');
  const [auditCategoryCode, setAuditCategoryCode] = useState('');
  const [auditActor, setAuditActor] = useState('');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['catalog', 'blockings', 'matrix'],
    queryFn: () => casamodaApi.catalog.blockingsMatrix(),
  });
  const auditQuery = useQuery({
    queryKey: [
      'catalog',
      'blockings',
      'audit',
      auditLimit,
      auditStoreCode,
      auditCategoryCode,
      auditActor,
      auditFrom,
      auditTo,
    ],
    queryFn: () =>
      casamodaApi.catalog.blockingsAudit({
        limit: auditLimit,
        storeCode: auditStoreCode || undefined,
        categoryCode: auditCategoryCode || undefined,
        actor: auditActor || undefined,
        from: auditFrom || undefined,
        to: auditTo || undefined,
      }),
  });
  const upsertMutation = useMutation({
    mutationFn: (input: { storeCode: string; categoryCode: string; status: 'BLOQUEADO' | 'HABILITADO' }) =>
      casamodaApi.catalog.upsertBlocking({ ...input, motivo, actor: user?.name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog', 'blockings', 'matrix'] });
      qc.invalidateQueries({ queryKey: ['catalog', 'blockings', 'audit'] });
    },
  });

  if (isLoading) return <LoadingCard />;
  if (error || !data) {
    return (
      <ErrorState
        description={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  const categorias = data.matrix[0]?.categorias ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Matriz seccion 4.2 PRD · {data.matrix.length} tiendas × {categorias.length} categorias.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">OK</span> = asignable · <span className="font-medium">BLOQ</span> = bloqueada · <span className="font-medium">OUTLET</span> = flujo separado (Luro).
          </p>
        </div>
        <SourceBadge source={data.source} />
      </div>

      {canEdit ? (
        <div className="flex items-center gap-2">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs w-72"
            placeholder="Motivo de cambio"
          />
          <span className="text-xs text-muted-foreground">
            Click sobre una celda para alternar BLOQ/OK
          </span>
        </div>
      ) : null}
      {lastCellFeedback ? (
        <p
          className={cn(
            'text-xs',
            lastCellFeedback.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive',
          )}
        >
          {lastCellFeedback.message}
        </p>
      ) : null}

      <div className="rounded-lg border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 p-2 text-left font-medium">
                Tienda
              </th>
              {categorias.map((c) => (
                <th
                  key={c.categoryCode}
                  className="whitespace-nowrap p-2 text-left text-xs font-medium"
                  title={c.categoryCode}
                >
                  {c.categoryName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row) => (
              <tr key={row.storeCode} className="border-b last:border-b-0">
                <th
                  scope="row"
                  className={cn(
                    'sticky left-0 bg-background p-2 text-left text-xs font-medium',
                    row.esOutlet && 'text-amber-700 dark:text-amber-400',
                  )}
                >
                  {row.storeName}
                </th>
                {row.categorias.map((c) => {
                  const meta = STATUS_CELL[c.status];
                  const key = `${row.storeCode}::${c.categoryCode}`;
                  const isSaving = activeCellKey === key && upsertMutation.isPending;
                  return (
                    <td key={c.categoryCode} className="p-1">
                      <button
                        type="button"
                        disabled={!canEdit || c.status === 'OUTLET' || upsertMutation.isPending}
                        onClick={() => {
                          if (!canEdit || c.status === 'OUTLET') return;
                          const next = c.status === 'BLOQUEADO' ? 'HABILITADO' : 'BLOQUEADO';
                          setActiveCellKey(key);
                          setLastCellFeedback(null);
                          upsertMutation.mutate(
                            {
                              storeCode: row.storeCode,
                              categoryCode: c.categoryCode,
                              status: next,
                            },
                            {
                              onSuccess: () => {
                                setLastCellFeedback({
                                  kind: 'ok',
                                  message: `${row.storeCode}/${c.categoryCode} actualizado a ${next}.`,
                                });
                                setActiveCellKey(null);
                              },
                              onError: (err) => {
                                setLastCellFeedback({
                                  kind: 'error',
                                  message:
                                    err instanceof Error
                                      ? `Error en ${row.storeCode}/${c.categoryCode}: ${err.message}`
                                      : `Error en ${row.storeCode}/${c.categoryCode}.`,
                                });
                                setActiveCellKey(null);
                              },
                            },
                          );
                        }}
                        className={cn(
                          'inline-flex w-full items-center justify-center rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium',
                          meta.className,
                          canEdit && c.status !== 'OUTLET' ? 'cursor-pointer hover:opacity-80' : '',
                          isSaving ? 'ring-2 ring-primary/50' : '',
                        )}
                      >
                        {isSaving ? '...' : meta.label}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">Historial de cambios de bloqueos</p>
          <p className="text-xs text-muted-foreground">
            Últimos eventos de altas, actualizaciones y desbloqueos en la matriz.
          </p>
        </div>
        <div className="grid gap-2 border-b px-3 py-2 md:grid-cols-6">
          <input
            value={auditStoreCode}
            onChange={(e) => setAuditStoreCode(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            placeholder="storeCode"
          />
          <input
            value={auditCategoryCode}
            onChange={(e) => setAuditCategoryCode(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            placeholder="categoryCode / groupCode"
          />
          <input
            value={auditActor}
            onChange={(e) => setAuditActor(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            placeholder="actor"
          />
          <input
            type="date"
            value={auditFrom}
            onChange={(e) => setAuditFrom(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            title="Desde"
          />
          <input
            type="date"
            value={auditTo}
            onChange={(e) => setAuditTo(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            title="Hasta"
          />
          <select
            value={auditLimit}
            onChange={(e) => setAuditLimit(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value={30}>30 eventos</option>
            <option value={60}>60 eventos</option>
            <option value={120}>120 eventos</option>
            <option value={200}>200 eventos</option>
          </select>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="border-b">
                <th className="p-2 text-left text-xs font-medium">Fecha</th>
                <th className="p-2 text-left text-xs font-medium">Actor</th>
                <th className="p-2 text-left text-xs font-medium">Tienda</th>
                <th className="p-2 text-left text-xs font-medium">Categoría</th>
                <th className="p-2 text-left text-xs font-medium">Cambio</th>
                <th className="p-2 text-left text-xs font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {auditQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-sm text-muted-foreground">
                    Cargando historial…
                  </td>
                </tr>
              ) : null}
              {(auditQuery.data ?? []).map((ev) => (
                <tr key={ev.id} className="border-b last:border-b-0">
                  <td className="p-2 text-xs text-muted-foreground">
                    {new Date(ev.timestamp).toLocaleString('es-AR')}
                  </td>
                  <td className="p-2 text-xs">{ev.actor || '—'}</td>
                  <td className="p-2 text-xs font-mono">{ev.payload?.storeCode || '—'}</td>
                  <td className="p-2 text-xs font-mono">{ev.payload?.categoryCode || ev.payload?.groupCode || '—'}</td>
                  <td className="p-2 text-xs font-mono">
                    {(ev.payload?.prevStatus ?? 'HABILITADO').toString()} → {(ev.payload?.status ?? '—').toString()}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">{ev.payload?.motivo || '—'}</td>
                </tr>
              ))}
              {!auditQuery.isLoading && (auditQuery.data?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-sm text-muted-foreground">
                    Sin eventos aún.
                  </td>
                </tr>
              ) : null}
              {auditQuery.error ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-sm text-destructive">
                    {(auditQuery.error as Error).message}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
