import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BLOCKINGS_SEED } from '../../../prisma/seed/data/blockings';
import {
  CATEGORIES_SEED,
  FAMILIES_SEED,
  GROUPS_SEED,
  TIPOS_ARTICULO_SEED,
} from '../../../prisma/seed/data/catalog';
import { PRODUCTS_SEED } from '../../../prisma/seed/data/products';
import { STORES_SEED } from '../../../prisma/seed/data/stores';

/**
 * CatalogService sirve el catalogo (tiendas, grupos, categorias, bloqueos, productos).
 * Si la DB esta disponible, lee de Prisma. Si no, cae al seed mock en memoria.
 * Esta dualidad existe SOLO en Fase 0 para desbloquear trabajo de UI sin Postgres.
 */
@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listStores() {
    try {
      const stores = await this.prisma.store.findMany({
        orderBy: [{ tier: 'asc' }, { name: 'asc' }],
        include: { blockingRules: { include: { category: true, group: true } } },
      });
      if (stores.length) return { source: 'db', items: stores };
    } catch (error) {
      this.logger.debug(`DB off, usando mock stores (${this.describe(error)})`);
    }
    return { source: 'mock', items: STORES_SEED };
  }

  async listGroups() {
    try {
      const groups = await this.prisma.group.findMany({
        orderBy: { name: 'asc' },
        include: { categories: true },
      });
      if (groups.length) return { source: 'db', items: groups };
    } catch (error) {
      this.logger.debug(`DB off, usando mock groups (${this.describe(error)})`);
    }
    return {
      source: 'mock',
      items: GROUPS_SEED.map((g) => ({
        ...g,
        categories: CATEGORIES_SEED.filter((c) => c.groupCode === g.code),
      })),
    };
  }

  async listCategories() {
    try {
      const cats = await this.prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: { group: true, tipos: true },
      });
      if (cats.length) return { source: 'db', items: cats };
    } catch (error) {
      this.logger.debug(`DB off, usando mock categories (${this.describe(error)})`);
    }
    return {
      source: 'mock',
      items: CATEGORIES_SEED.map((c) => ({
        ...c,
        tipos: TIPOS_ARTICULO_SEED.filter((t) => t.categoryCode === c.code),
      })),
    };
  }

  async listFamilies() {
    try {
      const fams = await this.prisma.family.findMany({ orderBy: { name: 'asc' } });
      if (fams.length) return { source: 'db', items: fams };
    } catch (error) {
      this.logger.debug(`DB off, usando mock families (${this.describe(error)})`);
    }
    return { source: 'mock', items: FAMILIES_SEED };
  }

  async listProducts(params: { skip?: number; take?: number; search?: string }) {
    const skip = params.skip ?? 0;
    const take = Math.min(params.take ?? 50, 200);
    const search = params.search?.trim();

    try {
      const where = search
        ? {
            OR: [
              { sku: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};
      const [items, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          orderBy: { sku: 'asc' },
          skip,
          take,
          include: { tipoArticulo: { include: { category: { include: { group: true } } } }, family: true },
        }),
        this.prisma.product.count({ where }),
      ]);
      if (items.length || total) return { source: 'db', total, skip, take, items };
    } catch (error) {
      this.logger.debug(`DB off, usando mock products (${this.describe(error)})`);
    }

    const filtered = search
      ? PRODUCTS_SEED.filter(
          (p) =>
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            p.description.toLowerCase().includes(search.toLowerCase()),
        )
      : PRODUCTS_SEED;
    return {
      source: 'mock',
      total: filtered.length,
      skip,
      take,
      items: filtered.slice(skip, skip + take),
    };
  }

  async listBlockings() {
    try {
      const items = await this.prisma.storeBlockingRule.findMany({
        include: { store: true, category: true, group: true },
      });
      if (items.length) return { source: 'db', items };
    } catch (error) {
      this.logger.debug(`DB off, usando mock blockings (${this.describe(error)})`);
    }
    return { source: 'mock', items: BLOCKINGS_SEED };
  }

  /** Matriz grupo-categoria x tienda (seccion 4.2). */
  async buildBlockingMatrix() {
    const [stores, categories, blockings] = await Promise.all([
      this.listStores(),
      this.listCategories(),
      this.listBlockings(),
    ]);

    const storeItems = stores.items as Array<{ code: string; name: string; esOutlet?: boolean }>;
    const categoryItems = categories.items as Array<{ code: string; name: string; groupCode?: string }>;

    const isBlocked = (storeCode: string, categoryCode: string): boolean => {
      if (stores.source === 'mock') {
        return (blockings.items as Array<{ storeCode: string; categoryCode?: string }>).some(
          (b) => b.storeCode === storeCode && b.categoryCode === categoryCode,
        );
      }
      return (
        blockings.items as Array<{
          store: { code: string };
          category: { code: string } | null;
        }>
      ).some((b) => b.store.code === storeCode && b.category?.code === categoryCode);
    };

    const matrix = storeItems.map((s) => ({
      storeCode: s.code,
      storeName: s.name,
      esOutlet: Boolean(s.esOutlet),
      categorias: categoryItems.map((c) => ({
        categoryCode: c.code,
        categoryName: c.name,
        status: s.esOutlet ? 'OUTLET' : isBlocked(s.code, c.code) ? 'BLOQUEADO' : 'HABILITADO',
      })),
    }));

    return {
      source: stores.source,
      matrix,
    };
  }

  async upsertBlocking(input: {
    storeCode: string;
    categoryCode?: string;
    groupCode?: string;
    status: 'BLOQUEADO' | 'HABILITADO';
    motivo?: string;
    actor?: string;
  }) {
    try {
      const store = await this.prisma.store.findUnique({
        where: { code: input.storeCode },
        select: { id: true, esOutlet: true, code: true },
      });
      if (!store) throw new BadRequestException(`Tienda no encontrada: ${input.storeCode}`);
      if (store.esOutlet) {
        throw new BadRequestException('No se edita matriz para outlet desde este flujo');
      }

      const category = input.categoryCode
        ? await this.prisma.category.findUnique({
            where: { code: input.categoryCode },
            select: { id: true, groupId: true, code: true },
          })
        : null;
      const group = input.groupCode
        ? await this.prisma.group.findUnique({
            where: { code: input.groupCode },
            select: { id: true, code: true },
          })
        : null;

      if (input.categoryCode && !category) {
        throw new BadRequestException(`Categoria no encontrada: ${input.categoryCode}`);
      }
      if (input.groupCode && !group) {
        throw new BadRequestException(`Grupo no encontrado: ${input.groupCode}`);
      }

      const groupId = group?.id ?? category?.groupId ?? null;
      const categoryId = category?.id ?? null;

      const existing = await this.prisma.storeBlockingRule.findFirst({
        where: {
          storeId: store.id,
          groupId,
          categoryId,
        },
      });

      if (input.status === 'HABILITADO') {
        if (existing) {
          await this.prisma.storeBlockingRule.delete({ where: { id: existing.id } });
          await this.prisma.auditEvent.create({
            data: {
              tipoEvento: 'blocking.deleted',
              actor: input.actor,
              payload: {
                storeCode: store.code,
                groupCode: group?.code ?? null,
                categoryCode: category?.code ?? null,
                prevStatus: existing.status,
                status: 'HABILITADO',
                motivo: input.motivo ?? null,
              },
            },
          });
        } else {
          await this.prisma.auditEvent.create({
            data: {
              tipoEvento: 'blocking.noop',
              actor: input.actor,
              payload: {
                storeCode: store.code,
                groupCode: group?.code ?? null,
                categoryCode: category?.code ?? null,
                prevStatus: 'HABILITADO',
                status: 'HABILITADO',
                motivo: input.motivo ?? null,
              },
            },
          });
        }
        return { ok: true, status: 'HABILITADO' as const };
      }

      const motivo = input.motivo?.trim() || 'Ajuste manual matriz';
      if (existing) {
        const updated = await this.prisma.storeBlockingRule.update({
          where: { id: existing.id },
          data: {
            status: 'BLOQUEADO',
            motivo,
          },
          include: { store: true, category: true, group: true },
        });
        await this.prisma.auditEvent.create({
          data: {
            tipoEvento: 'blocking.updated',
            actor: input.actor,
            payload: {
              storeCode: store.code,
              groupCode: group?.code ?? null,
              categoryCode: category?.code ?? null,
              prevStatus: existing.status,
              status: 'BLOQUEADO',
              motivo,
            },
          },
        });
        return updated;
      }

      const created = await this.prisma.storeBlockingRule.create({
        data: {
          storeId: store.id,
          groupId,
          categoryId,
          status: 'BLOQUEADO',
          motivo,
        },
        include: { store: true, category: true, group: true },
      });
      await this.prisma.auditEvent.create({
        data: {
          tipoEvento: 'blocking.created',
          actor: input.actor,
          payload: {
            storeCode: store.code,
            groupCode: group?.code ?? null,
            categoryCode: category?.code ?? null,
            prevStatus: 'HABILITADO',
            status: 'BLOQUEADO',
            motivo,
          },
        },
      });
      return created;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`No se pudo actualizar bloqueo (${this.describe(error)})`);
    }
  }

  async listBlockingAuditEvents(filters?: {
    limit?: number;
    storeCode?: string;
    categoryCode?: string;
    actor?: string;
    from?: string;
    to?: string;
  }) {
    const take = Number.isFinite(filters?.limit) ? Math.min(Math.max(filters!.limit!, 1), 300) : 50;
    const from = filters?.from ? new Date(filters.from) : null;
    const to = filters?.to ? new Date(filters.to) : null;
    const actorNeedle = filters?.actor?.trim().toLowerCase();
    const storeNeedle = filters?.storeCode?.trim().toLowerCase();
    const categoryNeedle = filters?.categoryCode?.trim().toLowerCase();

    const events = await this.prisma.auditEvent.findMany({
      where: {
        OR: [
          { tipoEvento: { startsWith: 'blocking.' } },
          { tipoEvento: { startsWith: 'blockings.' } },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take,
      select: {
        id: true,
        tipoEvento: true,
        actor: true,
        timestamp: true,
        payload: true,
      },
    });
    return events.filter((ev) => {
      if (from && ev.timestamp < from) return false;
      if (to && ev.timestamp > to) return false;
      if (actorNeedle && !(ev.actor ?? '').toLowerCase().includes(actorNeedle)) return false;

      const payload =
        ev.payload && typeof ev.payload === 'object'
          ? (ev.payload as { storeCode?: unknown; categoryCode?: unknown; groupCode?: unknown })
          : null;
      const storeCode = typeof payload?.storeCode === 'string' ? payload.storeCode : '';
      const categoryCode =
        typeof payload?.categoryCode === 'string'
          ? payload.categoryCode
          : typeof payload?.groupCode === 'string'
            ? payload.groupCode
            : '';
      if (storeNeedle && !storeCode.toLowerCase().includes(storeNeedle)) return false;
      if (categoryNeedle && !categoryCode.toLowerCase().includes(categoryNeedle)) return false;
      return true;
    });
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown';
  }
}
