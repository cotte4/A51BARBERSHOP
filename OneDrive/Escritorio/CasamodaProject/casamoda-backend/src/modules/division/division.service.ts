import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  DirectiveAlcance as PrismaDirectiveAlcance,
  LotOrigen,
  LotTipo,
  OwnerDirective,
  Prisma,
  ProposalEstado,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { runAllocator } from './engine/allocator';
import { renderProposalDepositPdf } from './proposal-pdf';
import {
  EngineBlocking,
  EngineCategory,
  EngineDirective,
  EngineInput,
  EngineLotLine,
  EngineProduct,
  EngineResult,
  EngineSalesScore,
  EngineStore,
  EngineTipoArticulo,
} from './engine/types';

export interface GenerateFromExistingLotInput {
  lotId: string;
  actor?: string;
}

export interface DryRunInput {
  lines: Array<{ sku: string; cantidad: number; multiplo?: number; curvaCompleta?: boolean }>;
  /** Alineado al tipo de lote; REPOSICION activa fallback sin_historial (PRD UAT #7). */
  tipo?: LotTipo;
}

export interface GenerateInlineInput extends DryRunInput {
  lotCode: string;
  origen?: LotOrigen;
  notas?: string;
  actor?: string;
}

@Injectable()
export class DivisionService {
  constructor(private readonly prisma: PrismaService) {}

  // =================== Dry run sin DB write ===================

  async dryRun(input: DryRunInput): Promise<{
    result: EngineResult;
    skuToProductId: Record<string, string>;
    /** SKUs no encontrados en catalogo. */
    missingSkus: string[];
  }> {
    const ctx = await this.loadContext();
    const { lotLines, skuToProductId, missing } = this.resolveLines(input.lines, ctx);
    const engineInput: EngineInput = {
      ...ctx,
      lotLines,
      lotTipo: input.tipo ?? 'REPOSICION',
    };
    const result = runAllocator(engineInput);
    return { result, skuToProductId, missingSkus: missing };
  }

  // =================== Crear propuesta desde lot existente ===================

  async generateFromLot(input: GenerateFromExistingLotInput): Promise<{
    proposalId: string;
    result: EngineResult;
  }> {
    const lot = await this.prisma.stockIngressLot.findUnique({
      where: { id: input.lotId },
      include: { lines: true },
    });
    if (!lot) throw new NotFoundException(`Lote ${input.lotId} no encontrado`);

    const ctx = await this.loadContext();
    const tipoById = new Map(ctx.tipos.map((t) => [t.id, t]));
    const lotLines: EngineLotLine[] = lot.lines.map((l) => {
      const prod = ctx.products.find((p) => p.id === l.productId);
      const tipo = prod ? tipoById.get(prod.tipoArticuloId) : undefined;
      return {
        productId: l.productId,
        cantidad: l.cantidad,
        multiplo: l.multiplo,
        // Sin columna en DB aun: asumimos curva OK hasta ingreso Zeus con certificacion.
        curvaCompleta: tipo?.tieneTalle ? true : true,
      };
    });

    const result = runAllocator({ ...ctx, lotLines, lotTipo: lot.tipo });
    const proposalId = await this.persistProposal(lot.id, result, input.actor);
    return { proposalId, result };
  }

  // =================== Crear lot inline y generar propuesta ===================

  async generateInline(input: GenerateInlineInput): Promise<{
    lotId: string;
    proposalId: string;
    result: EngineResult;
    missingSkus: string[];
  }> {
    const ctx = await this.loadContext();
    const { lotLines, skuToProductId, missing } = this.resolveLines(input.lines, ctx);
    if (lotLines.length === 0) {
      throw new Error(
        `Ningun SKU del lote se pudo resolver contra el catalogo (${missing.length} faltantes)`,
      );
    }

    // Persistir lot + proposal en transaccion
    let lotId = '';
    let proposalId = '';
    let result!: EngineResult;

    await this.prisma.$transaction(async (tx) => {
      const lot = await tx.stockIngressLot.create({
        data: {
          lotCode: input.lotCode,
          fechaIngreso: new Date(),
          origen: input.origen ?? 'NACIONAL',
          tipo: input.tipo ?? 'REPOSICION',
          notas: input.notas,
          creadoPor: input.actor,
          lines: {
            create: lotLines.map((l) => ({
              productId: l.productId,
              cantidad: l.cantidad,
              multiplo: l.multiplo,
            })),
          },
        },
      });
      lotId = lot.id;

      result = runAllocator({
        ...ctx,
        lotLines,
        lotTipo: input.tipo ?? 'REPOSICION',
      });

      proposalId = await this.persistProposalInTx(tx, lot.id, result, input.actor);
    });

    return { lotId, proposalId, result, missingSkus: missing };
  }

  // =================== Fetchers ===================

  async getProposal(id: string) {
    const proposal = await this.prisma.divisionProposal.findUnique({
      where: { id },
      include: {
        lot: { include: { lines: { include: { product: true } } } },
        allocations: { include: { product: true, store: true } },
      },
    });
    if (!proposal) throw new NotFoundException(`Propuesta ${id} no encontrada`);
    return proposal;
  }

  async listProposals(limit = 50) {
    return this.prisma.divisionProposal.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { lot: { select: { lotCode: true, origen: true, tipo: true } } },
    });
  }

  /** Snapshot read-only de score estadistico por SKU+tienda (Sprint ML base). */
  async listMlScores(input: {
    sku?: string;
    storeCode?: string;
    horizonDays?: number;
    limit?: number;
  }) {
    const take = Number.isFinite(input.limit) ? Math.min(Math.max(input.limit ?? 50, 1), 300) : 50;
    const where: Prisma.MlScoreSnapshotWhereInput = {
      ...(input.sku
        ? {
            product: {
              sku: { contains: input.sku.trim(), mode: 'insensitive' },
            },
          }
        : {}),
      ...(input.storeCode
        ? {
            store: {
              code: { contains: input.storeCode.trim(), mode: 'insensitive' },
            },
          }
        : {}),
      ...(input.horizonDays ? { horizonDays: input.horizonDays } : {}),
    };

    try {
      const rows = await this.prisma.mlScoreSnapshot.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { mlScore: 'desc' }],
        take,
        select: {
          id: true,
          horizonDays: true,
          forecastDemand: true,
          mlScore: true,
          confidence: true,
          modelVersion: true,
          featureVersion: true,
          source: true,
          createdAt: true,
          product: { select: { id: true, sku: true, description: true } },
          store: { select: { id: true, code: true, name: true, tier: true } },
        },
      });
      return {
        source: 'db' as const,
        items: rows.map((r) => ({
          id: r.id,
          product: r.product,
          store: r.store,
          horizonDays: r.horizonDays,
          forecastDemand: Number(r.forecastDemand),
          mlScore: Number(r.mlScore),
          confidence: r.confidence == null ? null : Number(r.confidence),
          modelVersion: r.modelVersion,
          featureVersion: r.featureVersion,
          source: r.source,
          createdAt: r.createdAt,
        })),
      };
    } catch {
      // Fallback dev-safe cuando DB no esta lista: endpoint no rompe la UI.
      return { source: 'mock' as const, items: [] };
    }
  }

  /** Directivas activas e históricas (PRD §5.5). */
  async listOwnerDirectives(includeInactive = true) {
    const directives = await this.prisma.ownerDirective.findMany({
      where: includeInactive ? undefined : { activa: true },
      orderBy: [{ activa: 'desc' }, { createdAt: 'desc' }],
    });
    return this.enrichDirectivesWithCodes(directives);
  }

  async createOwnerDirective(input: {
    alcance: PrismaDirectiveAlcance;
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
  }) {
    const desde = input.vigenciaDesde ? new Date(input.vigenciaDesde) : new Date();
    if (Number.isNaN(desde.getTime())) throw new BadRequestException('vigenciaDesde inválida');
    const hasta = input.vigenciaHasta ? new Date(input.vigenciaHasta) : null;
    if (hasta && Number.isNaN(hasta.getTime())) {
      throw new BadRequestException('vigenciaHasta inválida');
    }
    if (hasta && hasta < desde) {
      throw new BadRequestException('vigenciaHasta no puede ser menor que vigenciaDesde');
    }

    const targetStoreId = await this.resolveStoreId(input.targetStoreId, input.targetStoreCode);
    const targetGroupId = await this.resolveGroupId(input.targetGroupId, input.targetGroupCode);
    const targetCategoryId = await this.resolveCategoryId(
      input.targetCategoryId,
      input.targetCategoryCode,
    );
    const targetProductId = await this.resolveProductId(input.targetProductId, input.targetProductSku);
    this.validateDirectiveScope(input.alcance, {
      storeId: targetStoreId,
      groupId: targetGroupId,
      categoryId: targetCategoryId,
      productId: targetProductId,
    });

    const created = await this.prisma.ownerDirective.create({
      data: {
        alcance: input.alcance,
        targetStoreId,
        targetGroupId,
        targetCategoryId,
        targetProductId,
        valor: input.valor as Prisma.InputJsonValue,
        motivo: input.motivo,
        emisor: input.emisor,
        vigenciaDesde: desde,
        vigenciaHasta: hasta,
        activa: true,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        tipoEvento: 'directiva.creada',
        actor: input.emisor,
        payload: {
          directiveId: created.id,
          alcance: created.alcance,
          motivo: created.motivo,
        },
      },
    });
    return created;
  }

  async setOwnerDirectiveActive(id: string, activa: boolean, actor?: string) {
    const current = await this.prisma.ownerDirective.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`Directiva ${id} no encontrada`);
    const updated = await this.prisma.ownerDirective.update({
      where: { id },
      data: { activa },
    });
    await this.prisma.auditEvent.create({
      data: {
        tipoEvento: activa ? 'directiva.activada' : 'directiva.desactivada',
        actor,
        payload: { directiveId: id, prevActiva: current.activa, activa },
      },
    });
    return updated;
  }

  private validateDirectiveScope(
    alcance: PrismaDirectiveAlcance,
    targets: { storeId: string | null; groupId: string | null; categoryId: string | null; productId: string | null },
  ) {
    const has = {
      store: Boolean(targets.storeId),
      group: Boolean(targets.groupId),
      category: Boolean(targets.categoryId),
      product: Boolean(targets.productId),
    };
    const count = [has.store, has.group, has.category, has.product].filter(Boolean).length;
    if (alcance === 'GLOBAL') {
      if (count > 0) throw new BadRequestException('GLOBAL no admite targets');
      return;
    }
    if (alcance === 'GRUPO' && !has.group) {
      throw new BadRequestException('GRUPO requiere groupCode/groupId');
    }
    if (alcance === 'CATEGORIA' && !has.category) {
      throw new BadRequestException('CATEGORIA requiere categoryCode/categoryId');
    }
    if (alcance === 'TIENDA' && !has.store) {
      throw new BadRequestException('TIENDA requiere storeCode/storeId');
    }
    if (alcance === 'TIENDA_CATEGORIA' && !(has.store && has.category)) {
      throw new BadRequestException('TIENDA_CATEGORIA requiere store + category');
    }
    if (alcance === 'SKU' && !has.product) {
      throw new BadRequestException('SKU requiere productSku/productId');
    }
  }

  private async enrichDirectivesWithCodes(
    directives: OwnerDirective[],
  ): Promise<
    Array<
      OwnerDirective & {
        targetStoreCode?: string | null;
        targetStoreName?: string | null;
        targetGroupCode?: string | null;
        targetCategoryCode?: string | null;
        targetProductSku?: string | null;
      }
    >
  > {
    const storeIds = [...new Set(directives.map((d) => d.targetStoreId).filter(Boolean) as string[])];
    const groupIds = [...new Set(directives.map((d) => d.targetGroupId).filter(Boolean) as string[])];
    const categoryIds = [...new Set(directives.map((d) => d.targetCategoryId).filter(Boolean) as string[])];
    const productIds = [...new Set(directives.map((d) => d.targetProductId).filter(Boolean) as string[])];

    const [stores, groups, categories, products] = await Promise.all([
      storeIds.length
        ? this.prisma.store.findMany({ where: { id: { in: storeIds } }, select: { id: true, code: true, name: true } })
        : [],
      groupIds.length
        ? this.prisma.group.findMany({ where: { id: { in: groupIds } }, select: { id: true, code: true } })
        : [],
      categoryIds.length
        ? this.prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, code: true } })
        : [],
      productIds.length
        ? this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, sku: true } })
        : [],
    ]);

    const storeById = new Map(stores.map((s) => [s.id, s]));
    const groupById = new Map(groups.map((g) => [g.id, g]));
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const productById = new Map(products.map((p) => [p.id, p]));

    return directives.map((d) => ({
      ...d,
      targetStoreCode: d.targetStoreId ? storeById.get(d.targetStoreId)?.code ?? null : null,
      targetStoreName: d.targetStoreId ? storeById.get(d.targetStoreId)?.name ?? null : null,
      targetGroupCode: d.targetGroupId ? groupById.get(d.targetGroupId)?.code ?? null : null,
      targetCategoryCode: d.targetCategoryId ? categoryById.get(d.targetCategoryId)?.code ?? null : null,
      targetProductSku: d.targetProductId ? productById.get(d.targetProductId)?.sku ?? null : null,
    }));
  }

  private async resolveStoreId(id?: string, code?: string): Promise<string | null> {
    if (id) return id;
    if (!code) return null;
    const row = await this.prisma.store.findUnique({ where: { code }, select: { id: true } });
    if (!row) throw new BadRequestException(`storeCode no encontrado: ${code}`);
    return row.id;
  }

  private async resolveGroupId(id?: string, code?: string): Promise<string | null> {
    if (id) return id;
    if (!code) return null;
    const row = await this.prisma.group.findUnique({ where: { code }, select: { id: true } });
    if (!row) throw new BadRequestException(`groupCode no encontrado: ${code}`);
    return row.id;
  }

  private async resolveCategoryId(id?: string, code?: string): Promise<string | null> {
    if (id) return id;
    if (!code) return null;
    const row = await this.prisma.category.findUnique({ where: { code }, select: { id: true } });
    if (!row) throw new BadRequestException(`categoryCode no encontrado: ${code}`);
    return row.id;
  }

  private async resolveProductId(id?: string, sku?: string): Promise<string | null> {
    if (id) return id;
    if (!sku) return null;
    const row = await this.prisma.product.findUnique({ where: { sku }, select: { id: true } });
    if (!row) throw new BadRequestException(`productSku no encontrado: ${sku}`);
    return row.id;
  }

  /** Timeline de auditoria por propuesta (PRD §11.2 / §8.3). */
  async listProposalAuditEvents(proposalId: string) {
    const p = await this.prisma.divisionProposal.findUnique({
      where: { id: proposalId },
      select: { id: true },
    });
    if (!p) throw new NotFoundException(`Propuesta ${proposalId} no encontrada`);
    return this.prisma.auditEvent.findMany({
      where: { proposalId },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        tipoEvento: true,
        actor: true,
        timestamp: true,
        payload: true,
      },
    });
  }

  // =================== Aprobacion y ajustes ===================

  async patchAllocations(
    proposalId: string,
    input: { lines: Array<{ id: string; cantidadAprobada: number }>; actor?: string },
  ) {
    const proposal = await this.loadProposalForEdit(proposalId);
    assertProposalEditable(proposal.estado);

    const byId = new Map(proposal.allocations.map((a) => [a.id, a]));
    for (const line of input.lines) {
      if (!byId.has(line.id)) {
        throw new BadRequestException(`Linea de asignacion ${line.id} no pertenece a esta propuesta`);
      }
    }

    const merged = new Map<string, number>();
    for (const a of proposal.allocations) {
      const patch = input.lines.find((l) => l.id === a.id);
      merged.set(a.id, patch ? patch.cantidadAprobada : (a.cantidadAprobada ?? a.cantidadSugerida));
    }

    assertTotalsVsLot(proposal, merged);

    await this.prisma.$transaction(async (tx) => {
      for (const line of input.lines) {
        const prev = byId.get(line.id)!;
        const changed = line.cantidadAprobada !== (prev.cantidadAprobada ?? prev.cantidadSugerida);
        await tx.allocationLine.update({
          where: { id: line.id },
          data: { cantidadAprobada: line.cantidadAprobada },
        });
        if (changed) {
          await tx.auditEvent.create({
            data: {
              proposalId,
              tipoEvento: 'allocation.ajustada',
              actor: input.actor,
              payload: {
                allocationLineId: line.id,
                cantidadSugerida: prev.cantidadSugerida,
                cantidadAprobada: line.cantidadAprobada,
              },
            },
          });
        }
      }
    });

    return this.getProposal(proposalId);
  }

  /** Copia cantidad sugerida en cantidad aprobada donde falta (borrador o excepción pendiente). */
  async acceptSuggested(proposalId: string, actor?: string) {
    const proposal = await this.loadProposalForEdit(proposalId);
    if (
      proposal.estado !== ProposalEstado.BORRADOR &&
      proposal.estado !== ProposalEstado.REQUIERE_EXCEPCION
    ) {
      throw new BadRequestException(
        'Solo se puede aceptar sugerido en estado BORRADOR o REQUIERE_EXCEPCION',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const a of proposal.allocations) {
        if (a.cantidadAprobada == null) {
          await tx.allocationLine.update({
            where: { id: a.id },
            data: { cantidadAprobada: a.cantidadSugerida },
          });
        }
      }
      await tx.auditEvent.create({
        data: {
          proposalId,
          tipoEvento: 'propuesta.aceptar_sugerido',
          actor,
          payload: { lineas: proposal.allocations.length },
        },
      });
    });

    return this.getProposal(proposalId);
  }

  /** Completa aprobaciones faltantes, valida totales vs lote y pasa a VALIDADA. */
  async validateProposal(proposalId: string, actor?: string) {
    const proposal = await this.loadProposalForEdit(proposalId);
    if (
      proposal.estado !== ProposalEstado.BORRADOR &&
      proposal.estado !== ProposalEstado.REQUIERE_EXCEPCION
    ) {
      throw new BadRequestException('Solo se puede validar desde BORRADOR o REQUIERE_EXCEPCION');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const a of proposal.allocations) {
        if (a.cantidadAprobada == null) {
          await tx.allocationLine.update({
            where: { id: a.id },
            data: { cantidadAprobada: a.cantidadSugerida },
          });
        }
      }

      const fresh = await tx.allocationLine.findMany({ where: { proposalId } });
      const merged = new Map(fresh.map((a) => [a.id, a.cantidadAprobada ?? a.cantidadSugerida]));
      assertTotalsVsLot(proposal, merged);

      await tx.divisionProposal.update({
        where: { id: proposalId },
        data: { estado: ProposalEstado.VALIDADA },
      });

      await tx.auditEvent.create({
        data: {
          proposalId,
          tipoEvento: 'propuesta.validada',
          actor,
          payload: { estado: ProposalEstado.VALIDADA },
        },
      });
    });

    return this.getProposal(proposalId);
  }

  async publishProposal(proposalId: string, actor?: string) {
    const proposal = await this.loadProposalForEdit(proposalId);
    if (proposal.estado !== ProposalEstado.VALIDADA) {
      throw new BadRequestException(
        'Solo se puede publicar desde VALIDADA (validá primero si venías de borrador o excepción)',
      );
    }

    const missing = proposal.allocations.filter((a) => a.cantidadAprobada == null);
    if (missing.length) {
      throw new BadRequestException(
        `Hay ${missing.length} lineas sin cantidad aprobada; validá o aceptá sugerido primero`,
      );
    }

    const merged = new Map(
      proposal.allocations.map((a) => [a.id, a.cantidadAprobada ?? a.cantidadSugerida]),
    );
    assertTotalsVsLot(proposal, merged);

    await this.prisma.$transaction(async (tx) => {
      await tx.divisionProposal.update({
        where: { id: proposalId },
        data: {
          estado: ProposalEstado.PUBLICADA,
          publicadoPor: actor,
          publicadaEn: new Date(),
        },
      });
      await tx.auditEvent.create({
        data: {
          proposalId,
          tipoEvento: 'propuesta.publicada',
          actor,
          payload: { estado: ProposalEstado.PUBLICADA },
        },
      });
    });

    return this.getProposal(proposalId);
  }

  async discardProposal(proposalId: string, actor?: string) {
    const proposal = await this.loadProposalForEdit(proposalId);
    if (proposal.estado === ProposalEstado.PUBLICADA) {
      throw new BadRequestException('No se puede descartar una propuesta ya publicada');
    }
    if (proposal.estado === ProposalEstado.DESCARTADA) {
      return this.getProposal(proposalId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.divisionProposal.update({
        where: { id: proposalId },
        data: { estado: ProposalEstado.DESCARTADA },
      });
      await tx.auditEvent.create({
        data: {
          proposalId,
          tipoEvento: 'propuesta.descartada',
          actor,
          payload: { estadoAnterior: proposal.estado },
        },
      });
    });

    return this.getProposal(proposalId);
  }

  /** Marca manualmente REQUIERE_EXCEPCION con motivo (escala a dueñas, PRD §7). */
  async markException(proposalId: string, input: { motivo: string; actor?: string }) {
    const p = await this.prisma.divisionProposal.findUnique({ where: { id: proposalId } });
    if (!p) throw new NotFoundException(`Propuesta ${proposalId} no encontrada`);
    if (
      p.estado === ProposalEstado.PUBLICADA ||
      p.estado === ProposalEstado.DESCARTADA
    ) {
      throw new BadRequestException('No se puede marcar excepcion en este estado');
    }

    const prev = (p.resumenValidaciones as Record<string, unknown> | null) ?? {};
    const resumenValidaciones = {
      ...prev,
      motivoExcepcionEncargado: input.motivo,
      excepcionMarcadaEn: new Date().toISOString(),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.divisionProposal.update({
        where: { id: proposalId },
        data: {
          estado: ProposalEstado.REQUIERE_EXCEPCION,
          resumenValidaciones: resumenValidaciones as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.auditEvent.create({
        data: {
          proposalId,
          tipoEvento: 'propuesta.excepcion_marcada',
          actor: input.actor,
          payload: { motivo: input.motivo },
        },
      });
    });

    return this.getProposal(proposalId);
  }

  /**
   * Export tipo planilla depósito (PRD §11.3 — modo Excel paralelo).
   * Filas solo con cantidad de envío > 0. Hoja extra de remanente (PRD §6).
   */
  async exportProposalFile(proposalId: string, format: 'csv' | 'xlsx' | 'pdf'): Promise<StreamableFile> {
    const p = await this.prisma.divisionProposal.findUnique({
      where: { id: proposalId },
      include: {
        lot: { include: { lines: { include: { product: true } } } },
        allocations: { include: { product: true, store: true } },
      },
    });
    if (!p) throw new NotFoundException(`Propuesta ${proposalId} no encontrada`);
    if (p.estado === ProposalEstado.DESCARTADA) {
      throw new BadRequestException('No se puede exportar una propuesta descartada');
    }

    const rows = buildExportRows(p);
    const remRows = buildRemanenteRows(p);
    const safeLot = p.lot.lotCode.replace(/[^\w.-]+/g, '_');

    if (format === 'pdf') {
      const buffer = await renderProposalDepositPdf(
        p.lot.lotCode,
        rows.map((r) => ({
          sku: r.sku,
          tiendaCodigo: r.tiendaCodigo,
          tiendaNombre: r.tiendaNombre,
          cantidadEnvio: r.cantidadEnvio,
        })),
        remRows.map((r) => ({
          sku: r.sku,
          cantidadLote: r.cantidadLote,
          asignadoTiendas: r.asignadoTiendas,
          remanente: r.remanente,
        })),
      );
      const filename = `planilla-deposito-${safeLot}.pdf`;
      return new StreamableFile(buffer, {
        type: 'application/pdf',
        disposition: `attachment; filename="${filename}"`,
      });
    }

    if (format === 'xlsx') {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Casamoda';
      const ws = wb.addWorksheet('Envio deposito', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      ws.columns = [
        { header: 'Lote', key: 'lotCode', width: 16 },
        { header: 'SKU', key: 'sku', width: 18 },
        { header: 'Descripcion', key: 'descripcion', width: 36 },
        { header: 'Tienda codigo', key: 'tiendaCodigo', width: 14 },
        { header: 'Tienda nombre', key: 'tiendaNombre', width: 22 },
        { header: 'Cant. sugerida', key: 'cantSugerida', width: 14 },
        { header: 'Cant. aprobada', key: 'cantAprobada', width: 14 },
        { header: 'Cant. envio', key: 'cantEnvio', width: 12 },
      ];
      for (const r of rows) {
        ws.addRow({
          lotCode: r.lotCode,
          sku: r.sku,
          descripcion: r.descripcion,
          tiendaCodigo: r.tiendaCodigo,
          tiendaNombre: r.tiendaNombre,
          cantSugerida: r.cantidadSugerida,
          cantAprobada: r.cantidadAprobada ?? '',
          cantEnvio: r.cantidadEnvio,
        });
      }
      ws.getRow(1).font = { bold: true };

      const ws2 = wb.addWorksheet('Remanente deposito');
      ws2.columns = [
        { header: 'SKU', key: 'sku', width: 18 },
        { header: 'Cantidad lote', key: 'cantLote', width: 14 },
        { header: 'Asignado tiendas', key: 'asignado', width: 16 },
        { header: 'Remanente', key: 'rem', width: 12 },
      ];
      for (const r of remRows) {
        ws2.addRow({
          sku: r.sku,
          cantLote: r.cantidadLote,
          asignado: r.asignadoTiendas,
          rem: r.remanente,
        });
      }
      ws2.getRow(1).font = { bold: true };

      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      const filename = `planilla-deposito-${safeLot}.xlsx`;
      return new StreamableFile(buffer, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: `attachment; filename="${filename}"`,
      });
    }

    const csv = rowsToCsv(rows, remRows);
    const buffer = Buffer.from(`\uFEFF${csv}`, 'utf-8');
    const filename = `planilla-deposito-${safeLot}.csv`;
    return new StreamableFile(buffer, {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  // =================== Helpers ===================

  private async loadProposalForEdit(proposalId: string): Promise<ProposalEditPayload> {
    const proposal = await this.prisma.divisionProposal.findUnique({
      where: { id: proposalId },
      include: {
        lot: { include: { lines: true } },
        allocations: true,
      },
    });
    if (!proposal) throw new NotFoundException(`Propuesta ${proposalId} no encontrada`);
    return proposal;
  }

  private async loadContext(): Promise<{
    stores: EngineStore[];
    categories: EngineCategory[];
    tipos: EngineTipoArticulo[];
    products: EngineProduct[];
    blockings: EngineBlocking[];
    salesScores: EngineSalesScore[];
    directives: EngineDirective[];
  }> {
    const [
      storesDb,
      categoriesDb,
      tiposDb,
      productsDb,
      blockingsDb,
      salesDb,
      directivesDb,
    ] = await Promise.all([
      this.prisma.store.findMany({ where: { active: true } }),
      this.prisma.category.findMany(),
      this.prisma.tipoArticulo.findMany(),
      this.prisma.product.findMany(),
      this.prisma.storeBlockingRule.findMany({ where: { status: 'BLOQUEADO' } }),
      this.prisma.salesScore.findMany(),
      this.prisma.ownerDirective.findMany({
        where: {
          activa: true,
          vigenciaDesde: { lte: new Date() },
          OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gte: new Date() } }],
        },
      }),
    ]);

    const stores: EngineStore[] = storesDb.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      tier: s.tier,
      factorTienda: Number(s.factorTienda),
      esOutlet: s.esOutlet,
      maxCapacidadPorCategoria: s.maxCapacidadPorCategoria as Record<string, number> | null,
      active: s.active,
    }));

    const categories: EngineCategory[] = categoriesDb.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      groupId: c.groupId,
      multiplo: c.multiplo,
      myMaxBase: c.myMaxBase,
    }));

    const tipos: EngineTipoArticulo[] = tiposDb.map((t) => ({
      id: t.id,
      code: t.code,
      categoryId: t.categoryId,
      tieneTalle: t.tieneTalle,
    }));

    const products: EngineProduct[] = productsDb.map((p) => ({
      id: p.id,
      sku: p.sku,
      description: p.description,
      tipoArticuloId: p.tipoArticuloId,
      equivalencia: p.equivalencia,
      multiplo: p.multiplo,
      minimoBase: p.minimoBase,
      maximoProducto: p.maximoProducto,
    }));

    const blockings: EngineBlocking[] = blockingsDb.map((b) => ({
      storeId: b.storeId,
      groupId: b.groupId,
      categoryId: b.categoryId,
      status: b.status,
    }));

    const salesScores: EngineSalesScore[] = salesDb.map((s) => ({
      storeId: s.storeId,
      categoryId: s.categoryId,
      score: Number(s.scoreCalculado),
      diasHistorialVentas: s.diasHistorialVentas,
    }));

    const directives: EngineDirective[] = directivesDb.map((d: OwnerDirective) => ({
      id: d.id,
      alcance: mapAlcance(d.alcance),
      targetStoreId: d.targetStoreId,
      targetGroupId: d.targetGroupId,
      targetCategoryId: d.targetCategoryId,
      targetProductId: d.targetProductId,
      valor: d.valor as EngineDirective['valor'],
      motivo: d.motivo,
    }));

    return { stores, categories, tipos, products, blockings, salesScores, directives };
  }

  private resolveLines(
    lines: DryRunInput['lines'],
    ctx: { products: EngineProduct[]; tipos: EngineTipoArticulo[]; categories: EngineCategory[] },
  ): {
    lotLines: EngineLotLine[];
    skuToProductId: Record<string, string>;
    missing: string[];
  } {
    const bySku = new Map(ctx.products.map((p) => [p.sku, p]));
    const tipoById = new Map(ctx.tipos.map((t) => [t.id, t]));
    const catById = new Map(ctx.categories.map((c) => [c.id, c]));
    const lotLines: EngineLotLine[] = [];
    const skuToProductId: Record<string, string> = {};
    const missing: string[] = [];

    for (const l of lines) {
      const product = bySku.get(l.sku);
      if (!product) {
        missing.push(l.sku);
        continue;
      }
      skuToProductId[l.sku] = product.id;
      // Resolver multiplo: override producto > categoria > 1
      let multiplo = l.multiplo;
      if (!multiplo) {
        if (product.multiplo) multiplo = product.multiplo;
        else {
          const tipo = tipoById.get(product.tipoArticuloId);
          if (tipo) {
            const cat = catById.get(tipo.categoryId);
            if (cat) multiplo = cat.multiplo;
          }
        }
      }
      const tipo = tipoById.get(product.tipoArticuloId);
      const curvaCompleta =
        tipo?.tieneTalle === true ? (l.curvaCompleta !== false ? true : false) : true;

      lotLines.push({
        productId: product.id,
        cantidad: l.cantidad,
        multiplo: Math.max(1, multiplo ?? 1),
        curvaCompleta,
      });
    }

    return { lotLines, skuToProductId, missing };
  }

  private async persistProposal(
    lotId: string,
    result: EngineResult,
    actor?: string,
  ): Promise<string> {
    return this.prisma.$transaction((tx) => this.persistProposalInTx(tx, lotId, result, actor));
  }

  private async persistProposalInTx(
    tx: Prisma.TransactionClient,
    lotId: string,
    result: EngineResult,
    actor?: string,
  ): Promise<string> {
    const remanenteDepositoPorSku = await buildRemanenteMotorPorSku(tx, result.residuos);

    const proposal = await tx.divisionProposal.create({
      data: {
        lotId,
        estado: result.requiereExcepcion
          ? ProposalEstado.REQUIERE_EXCEPCION
          : ProposalEstado.BORRADOR,
        generadoPor: actor,
        resumenValidaciones: {
          residuos: result.residuos,
          warnings: result.warnings,
          resumenPorProducto: result.resumenPorProducto,
          remanenteDepositoPorSku,
          requiereExcepcionCurva: result.requiereExcepcion,
          motivosExcepcionMotor: result.motivosExcepcion,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    if (result.allocations.length) {
      await tx.allocationLine.createMany({
        data: result.allocations.map((a) => ({
          proposalId: proposal.id,
          productId: a.productId,
          storeId: a.storeId,
          cantidadSugerida: a.cantidadSugerida,
          score: new Prisma.Decimal(a.score),
          flags: a.flags,
        })),
      });
    }

    await tx.auditEvent.create({
      data: {
        proposalId: proposal.id,
        tipoEvento: 'propuesta.generada',
        actor,
        payload: {
          allocations: result.allocations.length,
          warnings: result.warnings,
          residuos: result.residuos,
        },
      },
    });

    return proposal.id;
  }
}

function mapAlcance(a: PrismaDirectiveAlcance): EngineDirective['alcance'] {
  return a as EngineDirective['alcance'];
}

type ProposalEditPayload = Prisma.DivisionProposalGetPayload<{
  include: { lot: { include: { lines: true } }; allocations: true };
}>;

function assertProposalEditable(estado: ProposalEstado): void {
  if (estado === ProposalEstado.PUBLICADA || estado === ProposalEstado.DESCARTADA) {
    throw new BadRequestException('La propuesta no admite ediciones en este estado');
  }
}

function assertTotalsVsLot(
  proposal: ProposalEditPayload,
  allocationIdToCantidad: Map<string, number>,
): void {
  const sumByProduct = new Map<string, number>();
  for (const a of proposal.allocations) {
    const q = allocationIdToCantidad.get(a.id);
    if (q === undefined) continue;
    sumByProduct.set(a.productId, (sumByProduct.get(a.productId) ?? 0) + q);
  }
  for (const line of proposal.lot.lines) {
    const sum = sumByProduct.get(line.productId) ?? 0;
    if (sum > line.cantidad) {
      throw new BadRequestException(
        `Total aprobado por tienda (${sum} u.) supera la cantidad del lote (${line.cantidad} u.) para el producto ${line.productId}`,
      );
    }
  }
}

type ProposalForExport = Prisma.DivisionProposalGetPayload<{
  include: {
    lot: { include: { lines: { include: { product: true } } } };
    allocations: { include: { product: true; store: true } };
  };
}>;

interface ExportRow {
  lotCode: string;
  sku: string;
  descripcion: string;
  tiendaCodigo: string;
  tiendaNombre: string;
  cantidadSugerida: number;
  cantidadAprobada: number | null;
  cantidadEnvio: number;
}

interface RemanenteRow {
  sku: string;
  cantidadLote: number;
  asignadoTiendas: number;
  remanente: number;
}

async function buildRemanenteMotorPorSku(
  tx: Prisma.TransactionClient,
  residuos: Record<string, number>,
): Promise<Record<string, number>> {
  const ids = Object.keys(residuos).filter((id) => (residuos[id] ?? 0) > 0);
  if (!ids.length) return {};
  const prods = await tx.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, sku: true },
  });
  const out: Record<string, number> = {};
  for (const pr of prods) {
    const q = residuos[pr.id];
    if (q != null && q > 0) out[pr.sku] = q;
  }
  return out;
}

function buildExportRows(p: ProposalForExport): ExportRow[] {
  const rows: ExportRow[] = [];
  for (const a of p.allocations) {
    const envio = a.cantidadAprobada ?? a.cantidadSugerida;
    if (envio <= 0) continue;
    rows.push({
      lotCode: p.lot.lotCode,
      sku: a.product.sku,
      descripcion: a.product.description,
      tiendaCodigo: a.store.code,
      tiendaNombre: a.store.name,
      cantidadSugerida: a.cantidadSugerida,
      cantidadAprobada: a.cantidadAprobada,
      cantidadEnvio: envio,
    });
  }
  rows.sort((a, b) => {
    const c = a.sku.localeCompare(b.sku);
    return c !== 0 ? c : a.tiendaCodigo.localeCompare(b.tiendaCodigo);
  });
  return rows;
}

function buildRemanenteRows(p: ProposalForExport): RemanenteRow[] {
  const sumByProduct = new Map<string, number>();
  for (const a of p.allocations) {
    const q = a.cantidadAprobada ?? a.cantidadSugerida;
    sumByProduct.set(a.productId, (sumByProduct.get(a.productId) ?? 0) + q);
  }
  const rows: RemanenteRow[] = [];
  for (const line of p.lot.lines) {
    const asignado = sumByProduct.get(line.productId) ?? 0;
    rows.push({
      sku: line.product.sku,
      cantidadLote: line.cantidad,
      asignadoTiendas: asignado,
      remanente: line.cantidad - asignado,
    });
  }
  rows.sort((a, b) => a.sku.localeCompare(b.sku));
  return rows;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: ExportRow[], remRows: RemanenteRow[]): string {
  const lines: string[] = [];
  lines.push(
    [
      'Lote',
      'SKU',
      'Descripcion',
      'Tienda codigo',
      'Tienda nombre',
      'Cant sugerida',
      'Cant aprobada',
      'Cant envio',
    ].join(','),
  );
  for (const r of rows) {
    lines.push(
      [
        escapeCsvCell(r.lotCode),
        escapeCsvCell(r.sku),
        escapeCsvCell(r.descripcion),
        escapeCsvCell(r.tiendaCodigo),
        escapeCsvCell(r.tiendaNombre),
        escapeCsvCell(r.cantidadSugerida),
        escapeCsvCell(r.cantidadAprobada ?? ''),
        escapeCsvCell(r.cantidadEnvio),
      ].join(','),
    );
  }
  lines.push('');
  lines.push('Remanente deposito (lote menos asignado a tiendas)');
  lines.push(['SKU', 'Cantidad lote', 'Asignado tiendas', 'Remanente'].join(','));
  for (const r of remRows) {
    lines.push(
      [
        escapeCsvCell(r.sku),
        escapeCsvCell(r.cantidadLote),
        escapeCsvCell(r.asignadoTiendas),
        escapeCsvCell(r.remanente),
      ].join(','),
    );
  }
  return lines.join('\r\n');
}
