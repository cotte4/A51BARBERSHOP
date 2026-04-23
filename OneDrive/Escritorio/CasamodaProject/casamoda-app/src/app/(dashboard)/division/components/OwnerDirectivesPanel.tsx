'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { casamodaApi } from '@/lib/api/casamoda';
import { getStoredUser } from '@/lib/auth-storage';
import type { CreateOwnerDirectiveInput, DirectiveAlcance, OwnerDirective } from '@/types/modules/division';

const ALCANCES: DirectiveAlcance[] = [
  'GLOBAL',
  'GRUPO',
  'CATEGORIA',
  'TIENDA',
  'TIENDA_CATEGORIA',
  'SKU',
];

export function OwnerDirectivesPanel() {
  const user = getStoredUser();
  const canManage = user?.role === 'DUENIA' || user?.role === 'ADMIN';
  const qc = useQueryClient();
  const [jsonValor, setJsonValor] = useState('{"tipo":"priorizar","peso":1.6}');
  const [form, setForm] = useState<CreateOwnerDirectiveInput>({
    alcance: 'GLOBAL',
    emisor: user?.name ?? '',
    motivo: '',
    valor: { tipo: 'priorizar', peso: 1.6 },
  });

  const directivesQuery = useQuery({
    queryKey: ['owner-directives'],
    queryFn: () => casamodaApi.division.listDirectives(true),
  });
  const storesQuery = useQuery({
    queryKey: ['stores'],
    queryFn: () => casamodaApi.catalog.stores(),
  });
  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: () => casamodaApi.catalog.groups(),
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => casamodaApi.catalog.categories(),
  });
  const productsQuery = useQuery({
    queryKey: ['products', 'directive-search'],
    queryFn: () => casamodaApi.catalog.products({ take: 80 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateOwnerDirectiveInput) => casamodaApi.division.createDirective(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-directives'] });
      setForm((prev) => ({ ...prev, motivo: '' }));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activa }: { id: string; activa: boolean }) =>
      activa
        ? casamodaApi.division.activateDirective(id, user?.name)
        : casamodaApi.division.deactivateDirective(id, user?.name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-directives'] });
    },
  });

  const parseError = useMemo(() => {
    try {
      JSON.parse(jsonValor);
      return null;
    } catch {
      return 'JSON inválido en valor.';
    }
  }, [jsonValor]);

  const storesByCode = useMemo(() => {
    const entries = (storesQuery.data?.items ?? []).map((s) => [s.code, s.name] as const);
    return new Map(entries);
  }, [storesQuery.data?.items]);

  const groupsByCode = useMemo(() => {
    const entries = (groupsQuery.data?.items ?? []).map((g) => [g.code, g.name] as const);
    return new Map(entries);
  }, [groupsQuery.data?.items]);

  const categoriesByCode = useMemo(() => {
    const entries = (categoriesQuery.data?.items ?? []).map((c) => [c.code, c.name] as const);
    return new Map(entries);
  }, [categoriesQuery.data?.items]);

  const productsBySku = useMemo(() => {
    const entries = (productsQuery.data?.items ?? []).map((p) => [p.sku, p.description] as const);
    return new Map(entries);
  }, [productsQuery.data?.items]);

  const requiredByScope = useMemo(() => {
    switch (form.alcance) {
      case 'GRUPO':
        return ['group'];
      case 'CATEGORIA':
        return ['category'];
      case 'TIENDA':
        return ['store'];
      case 'TIENDA_CATEGORIA':
        return ['store', 'category'];
      case 'SKU':
        return ['sku'];
      default:
        return [];
    }
  }, [form.alcance]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      targetStoreCode: requiredByScope.includes('store') ? prev.targetStoreCode : undefined,
      targetGroupCode: requiredByScope.includes('group') ? prev.targetGroupCode : undefined,
      targetCategoryCode: requiredByScope.includes('category') ? prev.targetCategoryCode : undefined,
      targetProductSku: requiredByScope.includes('sku') ? prev.targetProductSku : undefined,
    }));
  }, [requiredByScope]);

  const scopeError = useMemo(() => {
    const miss: string[] = [];
    if (requiredByScope.includes('store') && !form.targetStoreCode?.trim()) miss.push('storeCode');
    if (requiredByScope.includes('group') && !form.targetGroupCode?.trim()) miss.push('groupCode');
    if (requiredByScope.includes('category') && !form.targetCategoryCode?.trim()) miss.push('categoryCode');
    if (requiredByScope.includes('sku') && !form.targetProductSku?.trim()) miss.push('productSku');
    return miss.length ? `Falta ${miss.join(', ')} para el alcance ${form.alcance}.` : null;
  }, [form, requiredByScope]);

  function renderCodeName(code: string | null | undefined, name: string | null | undefined) {
    if (!code) return '—';
    return name ? `${code} - ${name}` : code;
  }

  function renderTargetSummary(d: OwnerDirective) {
    const store = d.targetStoreCode ?? d.targetStoreId;
    const group = d.targetGroupCode ?? d.targetGroupId;
    const category = d.targetCategoryCode ?? d.targetCategoryId;
    const sku = d.targetProductSku ?? d.targetProductId;
    const storeName = d.targetStoreName ?? (store ? storesByCode.get(store) : null);
    const groupName = group ? groupsByCode.get(group) : null;
    const categoryName = category ? categoriesByCode.get(category) : null;
    const productName = sku ? productsBySku.get(sku) : null;
    if (d.alcance === 'GLOBAL') return 'Global';
    if (d.alcance === 'GRUPO') return renderCodeName(group, groupName);
    if (d.alcance === 'CATEGORIA') return renderCodeName(category, categoryName);
    if (d.alcance === 'TIENDA') return renderCodeName(store, storeName);
    if (d.alcance === 'TIENDA_CATEGORIA') {
      return `${renderCodeName(store, storeName)} / ${renderCodeName(category, categoryName)}`;
    }
    if (d.alcance === 'SKU') return renderCodeName(sku, productName);
    return '—';
  }

  return (
    <div className="space-y-4">
      {!canManage ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-4 text-sm text-amber-900">
            Tu rol puede ver directivas, pero no crear/activar/desactivar.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Directivas de dueñas
          </CardTitle>
          <CardDescription>
            Overrides manuales del motor (PRD §5.5). Se aplican por alcance y vigencia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Alcance</Label>
              <select
                value={form.alcance}
                disabled={!canManage}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, alcance: e.target.value as DirectiveAlcance }))
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {ALCANCES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Emisor</Label>
              <Input
                value={form.emisor}
                disabled={!canManage}
                onChange={(e) => setForm((p) => ({ ...p, emisor: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={form.motivo}
                disabled={!canManage}
                onChange={(e) => setForm((p) => ({ ...p, motivo: e.target.value }))}
                placeholder="Ej.: priorizar costa este mes"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {requiredByScope.includes('store') ? (
              <Input
                placeholder="storeCode (requerido)"
                disabled={!canManage}
                list="directive-store-codes"
                value={form.targetStoreCode ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, targetStoreCode: e.target.value || undefined }))}
              />
            ) : null}
            {requiredByScope.includes('group') ? (
              <Input
                placeholder="groupCode (requerido)"
                disabled={!canManage}
                list="directive-group-codes"
                value={form.targetGroupCode ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, targetGroupCode: e.target.value || undefined }))}
              />
            ) : null}
            {requiredByScope.includes('category') ? (
              <Input
                placeholder="categoryCode (requerido)"
                disabled={!canManage}
                list="directive-category-codes"
                value={form.targetCategoryCode ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, targetCategoryCode: e.target.value || undefined }))
                }
              />
            ) : null}
            {requiredByScope.includes('sku') ? (
              <Input
                placeholder="productSku (requerido)"
                disabled={!canManage}
                list="directive-product-skus"
                value={form.targetProductSku ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, targetProductSku: e.target.value || undefined }))}
              />
            ) : null}
          </div>
          <datalist id="directive-store-codes">
            {(storesQuery.data?.items ?? []).map((s) => (
              <option key={s.code} value={s.code} />
            ))}
          </datalist>
          <datalist id="directive-group-codes">
            {(groupsQuery.data?.items ?? []).map((g) => (
              <option key={g.code} value={g.code} />
            ))}
          </datalist>
          <datalist id="directive-category-codes">
            {(categoriesQuery.data?.items ?? []).map((c) => (
              <option key={c.code} value={c.code} />
            ))}
          </datalist>
          <datalist id="directive-product-skus">
            {(productsQuery.data?.items ?? []).map((p) => (
              <option key={p.sku} value={p.sku} />
            ))}
          </datalist>

          <div className="space-y-2">
            <Label>Valor (JSON)</Label>
            <textarea
              value={jsonValor}
              disabled={!canManage}
              onChange={(e) => setJsonValor(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
            {parseError ? <p className="text-xs text-destructive">{parseError}</p> : null}
            {scopeError ? <p className="text-xs text-destructive">{scopeError}</p> : null}
          </div>

          {createMutation.isError ? (
            <div className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {(createMutation.error as Error).message}
            </div>
          ) : null}

          <Button
            disabled={!canManage || !!parseError || !!scopeError || createMutation.isPending}
            onClick={() => {
              const parsed = JSON.parse(jsonValor) as Record<string, unknown>;
              createMutation.mutate({ ...form, valor: parsed });
            }}
          >
            {createMutation.isPending ? 'Creando…' : 'Crear directiva'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Historial de directivas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Alcance</th>
                  <th className="px-3 py-2 text-left">Motivo</th>
                  <th className="px-3 py-2 text-left">Target</th>
                  <th className="px-3 py-2 text-left">Emisor</th>
                  <th className="px-3 py-2 text-left">Valor</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(directivesQuery.data ?? []).map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 font-mono text-xs">{d.alcance}</td>
                    <td className="px-3 py-2">{d.motivo}</td>
                    <td className="px-3 py-2 text-xs font-mono">{renderTargetSummary(d)}</td>
                    <td className="px-3 py-2 text-xs">{d.emisor}</td>
                    <td className="px-3 py-2 text-xs font-mono max-w-[320px] truncate">
                      {JSON.stringify(d.valor)}
                    </td>
                    <td className="px-3 py-2">{d.activa ? 'Activa' : 'Inactiva'}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canManage || toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate({ id: d.id, activa: !d.activa })}
                      >
                        {d.activa ? 'Desactivar' : 'Activar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
