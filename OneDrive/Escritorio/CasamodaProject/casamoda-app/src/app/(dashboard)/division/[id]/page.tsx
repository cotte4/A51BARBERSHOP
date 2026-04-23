'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  History,
  Send,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MainShell } from '@/components/layout';
import { casamodaApi } from '@/lib/api/casamoda';
import { canMarkException, canMutateDivision, getStoredUser } from '@/lib/auth-storage';
import type { EngineAllocation, ProposalDetail, ProposalEstado } from '@/types/modules/division';
import { AllocationLinesEditor } from '../components/AllocationLinesEditor';
import { AllocationMatrix } from '../components/AllocationMatrix';

interface PageProps {
  params: Promise<{ id: string }>;
}

const ESTADO_BADGE: Record<ProposalEstado, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  BORRADOR: 'secondary',
  VALIDADA: 'default',
  REQUIERE_EXCEPCION: 'outline',
  PUBLICADA: 'default',
  DESCARTADA: 'destructive',
};

const FLAG_LABELS: Record<string, string> = {
  bloqueado: 'Bloqueado',
  outlet_only: 'Outlet',
  tope_categoria: 'Tope cat.',
  tope_producto: 'Tope prod.',
  multiplo_ajustado: 'Mult.',
  directiva_no_mandar: 'No mandar',
  directiva_priorizar: 'Prior.',
  directiva_forzar_cantidad: 'Forzado',
  sin_stock_suficiente: 'Sin stock',
  residuo_asignado: 'Residuo',
  curva_incompleta: 'Curva',
  cobertura_minima: 'Mín.',
  modo_top_n: 'Top-N',
  sin_historial: 'Sin hist.',
};

function effectiveQty(a: { cantidadAprobada: number | null; cantidadSugerida: number }): number {
  return a.cantidadAprobada ?? a.cantidadSugerida;
}

function remanenteLiveRows(data: ProposalDetail) {
  const sumByProduct = new Map<string, number>();
  for (const a of data.allocations) {
    sumByProduct.set(a.productId, (sumByProduct.get(a.productId) ?? 0) + effectiveQty(a));
  }
  return [...data.lot.lines]
    .map((line) => {
      const asignado = sumByProduct.get(line.product.id) ?? 0;
      return {
        sku: line.product.sku,
        cantidadLote: line.cantidad,
        asignadoTiendas: asignado,
        remanente: line.cantidad - asignado,
      };
    })
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

export default function ProposalDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | 'pdf' | null>(null);
  const [motivoExcepcion, setMotivoExcepcion] = useState('');
  const [canMutate, setCanMutate] = useState(true);
  const [canEscalate, setCanEscalate] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['division-proposal', id],
    queryFn: () => casamodaApi.division.get(id),
  });

  const { data: auditEvents } = useQuery({
    queryKey: ['division-proposal-audit', id],
    queryFn: () => casamodaApi.division.listAudit(id),
    enabled: Boolean(data),
  });

  useEffect(() => {
    const role = getStoredUser()?.role;
    setCanMutate(canMutateDivision(role));
    setCanEscalate(canMarkException(role));
  }, []);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['division-proposal', id] });
    qc.invalidateQueries({ queryKey: ['division-proposals'] });
    qc.invalidateQueries({ queryKey: ['division-proposal-audit', id] });
  };

  const acceptMutation = useMutation({
    mutationFn: () => casamodaApi.division.acceptSuggested(id),
    onSuccess: invalidate,
  });
  const validateMutation = useMutation({
    mutationFn: () => casamodaApi.division.validate(id),
    onSuccess: invalidate,
  });
  const publishMutation = useMutation({
    mutationFn: () => casamodaApi.division.publish(id),
    onSuccess: invalidate,
  });
  const discardMutation = useMutation({
    mutationFn: () => casamodaApi.division.discard(id),
    onSuccess: invalidate,
  });
  const markExceptionMutation = useMutation({
    mutationFn: () => casamodaApi.division.markException(id, { motivo: motivoExcepcion.trim() }),
    onSuccess: () => {
      setMotivoExcepcion('');
      invalidate();
    },
  });

  if (isLoading) {
    return (
      <MainShell title="Propuesta" description="Cargando…">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Cargando propuesta…
          </CardContent>
        </Card>
      </MainShell>
    );
  }

  if (error || !data) {
    return (
      <MainShell title="Propuesta" description="Error">
        <Card className="border-destructive/40">
          <CardContent className="py-8 text-center text-sm text-destructive">
            {(error as Error)?.message ?? 'No encontrada'}
          </CardContent>
        </Card>
      </MainShell>
    );
  }

  const estado = data.estado as ProposalEstado;

  const allocations: EngineAllocation[] = data.allocations.map((a) => ({
    id: a.id,
    productId: a.productId,
    storeId: a.storeId,
    cantidadSugerida: a.cantidadSugerida,
    cantidadAprobada: a.cantidadAprobada,
    score: typeof a.score === 'string' ? Number(a.score) : a.score,
    flags: a.flags,
  }));

  const productsInLot = data.lot.lines.map((l) => ({
    productId: l.product.id,
    sku: l.product.sku,
    description: l.product.description,
    cantidadDisponible: l.cantidad,
  }));

  useEffect(() => {
    if (!selectedProductId && productsInLot.length > 0) {
      setSelectedProductId(productsInLot[0].productId);
    }
  }, [productsInLot, selectedProductId]);

  const storeMap = new Map<
    string,
    { id: string; code: string; name: string; tier: 'A' | 'B' | 'C' }
  >();
  for (const a of data.allocations) {
    storeMap.set(a.store.code, {
      id: a.storeId,
      code: a.store.code,
      name: a.store.name,
      tier: a.store.tier,
    });
  }
  const stores = [...storeMap.values()].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier.localeCompare(b.tier);
    return a.code.localeCompare(b.code);
  });

  const totalLot = data.lot.lines.reduce((acc, l) => acc + l.cantidad, 0);
  const totalSugerido = data.allocations.reduce((acc, a) => acc + a.cantidadSugerida, 0);
  const totalAprobado = data.allocations.reduce((acc, a) => acc + effectiveQty(a), 0);

  const mutating =
    acceptMutation.isPending ||
    validateMutation.isPending ||
    publishMutation.isPending ||
    discardMutation.isPending ||
    markExceptionMutation.isPending;

  const actionError =
    (acceptMutation.error as Error)?.message ??
    (validateMutation.error as Error)?.message ??
    (publishMutation.error as Error)?.message ??
    (discardMutation.error as Error)?.message ??
    (markExceptionMutation.error as Error)?.message;

  const remRows = remanenteLiveRows(data);
  const motorRem = data.resumenValidaciones?.remanenteDepositoPorSku;
  const resumen = data.resumenValidaciones;
  const curvaPendiente = resumen?.requiereExcepcionCurva === true;
  const motivosMotor = resumen?.motivosExcepcionMotor ?? [];
  const motivoEncargado = resumen?.motivoExcepcionEncargado;
  const selectedProduct = productsInLot.find((p) => p.productId === selectedProductId) ?? null;
  const selectedLotLine = data.lot.lines.find((l) => l.product.id === selectedProductId) ?? null;
  const selectedRows = useMemo(() => {
    if (!selectedProductId) return [];
    return allocations
      .filter((a) => a.productId === selectedProductId)
      .map((a) => {
        const store = data.allocations.find((r) => r.id === a.id)?.store;
        return {
          ...a,
          storeCode: store?.code ?? a.storeId,
          storeName: store?.name ?? a.storeId,
          storeTier: store?.tier ?? null,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [allocations, data.allocations, selectedProductId]);
  const selectedStats = useMemo(() => {
    const lotQty = selectedLotLine?.cantidad ?? 0;
    const suggested = selectedRows.reduce((acc, r) => acc + r.cantidadSugerida, 0);
    const approved = selectedRows.reduce((acc, r) => acc + (r.cantidadAprobada ?? r.cantidadSugerida), 0);
    const blocked = selectedRows.filter((r) => r.flags.includes('bloqueado')).length;
    const noHistory = selectedRows.filter((r) => r.flags.includes('sin_historial')).length;
    const lowCurve = selectedRows.filter((r) => r.flags.includes('curva_incompleta')).length;
    return {
      lotQty,
      suggested,
      approved,
      remanente: Math.max(0, lotQty - approved),
      blocked,
      noHistory,
      lowCurve,
    };
  }, [selectedLotLine?.cantidad, selectedRows]);

  const runExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setExportError(null);
    setExporting(format);
    try {
      await casamodaApi.division.downloadProposalExport(id, format);
    } catch (e) {
      setExportError((e as Error).message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <MainShell
      title={`Propuesta ${data.lot.lotCode}`}
      description={`Creada ${new Date(data.createdAt).toLocaleString('es-AR')}`}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/division">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Link>
        </Button>
        <Badge variant={ESTADO_BADGE[estado] ?? 'secondary'}>{estado}</Badge>
        {data.publicadaEn ? (
          <span className="text-xs text-muted-foreground">
            Publicada {new Date(data.publicadaEn).toLocaleString('es-AR')}
            {data.publicadoPor ? ` · ${data.publicadoPor}` : ''}
          </span>
        ) : null}
      </div>

      <div className="space-y-6">
        {curvaPendiente ? (
          <Card className="border-amber-300 bg-amber-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-950 text-base">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                Curva de talles — requiere excepción (PRD §5.2)
              </CardTitle>
              <CardDescription>
                El motor no asignó stock hasta certificar curva completa. Motivos:
              </CardDescription>
            </CardHeader>
            <CardContent>
              {motivosMotor.length > 0 ? (
                <ul className="text-sm text-amber-900 list-disc pl-5 space-y-1">
                  {motivosMotor.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-amber-900">
                  Sin asignación a tiendas hasta certificar curva o gestionar la excepción.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {motivoEncargado ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Motivo de excepción (encargado)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{motivoEncargado}</CardContent>
          </Card>
        ) : null}

        {canEscalate && estado !== 'PUBLICADA' && estado !== 'DESCARTADA' ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Marcar excepción manual</CardTitle>
              <CardDescription>
                Escala a dueñas con un motivo (PRD §7). La propuesta pasa a REQUIERE_EXCEPCION.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="motivo-exc">Motivo</Label>
                <textarea
                  id="motivo-exc"
                  value={motivoExcepcion}
                  onChange={(e) => setMotivoExcepcion(e.target.value)}
                  rows={3}
                  placeholder="Ej.: falta talle M en negro para aprobar envío…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={mutating || !canEscalate}
                onClick={() => {
                  if (!motivoExcepcion.trim() || motivoExcepcion.trim().length < 4) {
                    alert('Ingresá un motivo de al menos 4 caracteres.');
                    return;
                  }
                  if (
                    !confirm(
                      '¿Marcar esta propuesta como REQUIERE_EXCEPCION y guardar el motivo en auditoría?',
                    )
                  )
                    return;
                  markExceptionMutation.mutate();
                }}
              >
                Marcar REQUIERE_EXCEPCION
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Resumen</CardTitle>
            <CardDescription>
              Lote <code className="font-mono">{data.lot.lotCode}</code> · {data.lot.origen} ·{' '}
              {data.lot.tipo}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <Metric label="Unidades del lote" value={totalLot} />
              <Metric label="Unidades aprobadas" value={totalAprobado} />
              <Metric
                label="Residuo (lote − aprobado)"
                value={Math.max(0, totalLot - totalAprobado)}
                tone={totalLot > totalAprobado ? 'warn' : 'default'}
              />
              <Metric label="SKUs" value={data.lot.lines.length} />
            </div>
            <p className="text-xs text-muted-foreground">
              Total sugerido por el motor: <strong>{totalSugerido}</strong>
              {totalSugerido !== totalAprobado ? (
                <span>
                  {' '}
                  · diferencia con aprobado: <strong>{totalAprobado - totalSugerido}</strong>
                </span>
              ) : null}
            </p>

            {canMutate && estado !== 'PUBLICADA' && estado !== 'DESCARTADA' ? (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {estado === 'BORRADOR' || estado === 'REQUIERE_EXCEPCION' ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={mutating}
                      onClick={() => acceptMutation.mutate()}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Aceptar sugerido
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={mutating}
                      onClick={() => {
                        if (
                          !confirm(
                            'Validar propuesta? Se completarán aprobaciones vacías y pasará a VALIDADA (desde borrador o excepción).',
                          )
                        )
                          return;
                        validateMutation.mutate();
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Validar
                    </Button>
                  </>
                ) : null}
                {estado === 'VALIDADA' ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={mutating}
                    onClick={() => {
                      if (!confirm('Publicar esta propuesta? Qedará lista para depósito / operación.'))
                        return;
                      publishMutation.mutate();
                    }}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Publicar
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={mutating}
                  onClick={() => {
                    if (!confirm('Descartar esta propuesta?')) return;
                    discardMutation.mutate();
                  }}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Descartar
                </Button>
              </div>
            ) : null}

            {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

            {estado !== 'DESCARTADA' ? (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exporting !== null}
                  onClick={() => runExport('csv')}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  {exporting === 'csv' ? 'Descargando…' : 'Descargar CSV'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exporting !== null}
                  onClick={() => runExport('xlsx')}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  {exporting === 'xlsx' ? 'Descargando…' : 'Descargar Excel'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exporting !== null}
                  onClick={() => runExport('pdf')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  {exporting === 'pdf' ? 'Descargando…' : 'Descargar PDF'}
                </Button>
              </div>
            ) : null}
            {exportError ? <p className="text-sm text-destructive">{exportError}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Remanente en depósito</CardTitle>
            <CardDescription>
              PRD §6: unidades del lote que no van a tienda (lote menos asignación efectiva). Se
              actualiza al cambiar cantidades aprobadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-right">Lote</th>
                    <th className="px-3 py-2 text-right">A tiendas</th>
                    <th className="px-3 py-2 text-right">Remanente</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {remRows.map((r) => (
                    <tr key={r.sku}>
                      <td className="px-3 py-1.5 font-mono text-xs">{r.sku}</td>
                      <td className="px-3 py-1.5 text-right">{r.cantidadLote}</td>
                      <td className="px-3 py-1.5 text-right">{r.asignadoTiendas}</td>
                      <td
                        className={
                          r.remanente > 0
                            ? 'px-3 py-1.5 text-right font-medium text-amber-800'
                            : 'px-3 py-1.5 text-right text-muted-foreground'
                        }
                      >
                        {r.remanente}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {motorRem && Object.keys(motorRem).length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Residual registrado por el motor al generar (por SKU):{' '}
                <span className="font-mono">
                  {Object.entries(motorRem)
                    .map(([sku, q]) => `${sku}=${q}`)
                    .join(', ')}
                </span>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Detalle por producto</CardTitle>
            <CardDescription>
              Curva/flags por tienda y score relativo dentro de la propuesta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="sku-detail">SKU</Label>
              <select
                id="sku-detail"
                value={selectedProductId ?? ''}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[220px]"
              >
                {productsInLot.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.sku}
                  </option>
                ))}
              </select>
              {selectedProduct?.description ? (
                <span className="text-xs text-muted-foreground truncate">{selectedProduct.description}</span>
              ) : null}
            </div>
            {selectedProduct ? (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                <Metric label="Lote SKU" value={selectedStats.lotQty} />
                <Metric label="Sugerido SKU" value={selectedStats.suggested} />
                <Metric label="Aprobado SKU" value={selectedStats.approved} />
                <Metric
                  label="Remanente SKU"
                  value={selectedStats.remanente}
                  tone={selectedStats.remanente > 0 ? 'warn' : 'default'}
                />
                <Metric label="Tiendas bloqueadas" value={selectedStats.blocked} />
                <Metric label="Sin historial" value={selectedStats.noHistory} />
              </div>
            ) : null}
            {selectedStats.lowCurve > 0 ? (
              <p className="text-xs text-amber-700">
                {selectedStats.lowCurve} tienda(s) con flag de curva incompleta para este SKU.
              </p>
            ) : null}
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Tienda</th>
                    <th className="px-3 py-2 text-center">Tier</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="px-3 py-2 text-right">Sugerido</th>
                    <th className="px-3 py-2 text-right">Aprobado</th>
                    <th className="px-3 py-2 text-left">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedRows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2">
                        <span className="font-medium">{r.storeCode}</span>
                        <span className="text-muted-foreground text-xs ml-1">{r.storeName}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="outline">{r.storeTier ?? '-'}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">{r.score.toFixed(3)}</td>
                      <td className="px-3 py-2 text-right">{r.cantidadSugerida}</td>
                      <td className="px-3 py-2 text-right">{r.cantidadAprobada ?? '—'}</td>
                      <td className="px-3 py-2 text-xs">
                        {r.flags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.flags.map((f) => (
                              <Badge key={`${r.id}-${f}`} variant="outline" className="text-[10px]">
                                {FLAG_LABELS[f] ?? f}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                  {selectedRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No hay asignaciones para este producto.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5 shrink-0" />
              Auditoría
            </CardTitle>
            <CardDescription>Eventos registrados para esta propuesta (PRD §8.3).</CardDescription>
          </CardHeader>
          <CardContent>
            {!auditEvents?.length ? (
              <p className="text-sm text-muted-foreground">Sin eventos aún.</p>
            ) : (
              <ul className="space-y-3 text-sm max-h-[420px] overflow-y-auto">
                {auditEvents.map((ev) => (
                  <li key={ev.id} className="border-l-2 border-muted pl-3">
                    <div className="font-medium">{ev.tipoEvento}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(ev.timestamp).toLocaleString('es-AR')}
                      {ev.actor ? ` · ${ev.actor}` : ''}
                    </div>
                    {ev.payload != null ? (
                      <pre className="text-xs mt-1 bg-muted/50 p-2 rounded overflow-x-auto max-h-28 whitespace-pre-wrap">
                        {JSON.stringify(ev.payload, null, 2)}
                      </pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Ajustes por línea</CardTitle>
            <CardDescription>
              Cantidades finales por SKU y tienda. Guardá antes de validar o publicar si cambiaste
              números a mano.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AllocationLinesEditor proposalId={id} estado={estado} allocations={data.allocations} canEdit={canMutate} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Matriz de reparto</CardTitle>
            <CardDescription>
              Vista compacta (cantidad efectiva = aprobada si existe, si no sugerida).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AllocationMatrix
              allocations={allocations}
              products={productsInLot}
              stores={stores}
            />
          </CardContent>
        </Card>
      </div>
    </MainShell>
  );
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  tone?: 'default' | 'warn';
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase">{label}</span>
      <span
        className={
          tone === 'warn'
            ? 'text-lg font-semibold text-amber-700'
            : 'text-lg font-semibold'
        }
      >
        {value}
      </span>
    </div>
  );
}
