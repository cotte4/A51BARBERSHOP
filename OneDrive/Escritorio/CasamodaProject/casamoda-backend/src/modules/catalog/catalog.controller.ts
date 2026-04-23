import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CatalogService } from './catalog.service';
import { UpsertBlockingDto } from './dto';

@Roles('ENCARGADO', 'DUENIA', 'ADMIN')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('stores')
  stores() {
    return this.catalog.listStores();
  }

  @Get('groups')
  groups() {
    return this.catalog.listGroups();
  }

  @Get('categories')
  categories() {
    return this.catalog.listCategories();
  }

  @Get('families')
  families() {
    return this.catalog.listFamilies();
  }

  @Get('products')
  products(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    return this.catalog.listProducts({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      search,
    });
  }

  @Get('blockings')
  blockings() {
    return this.catalog.listBlockings();
  }

  @Get('blockings/matrix')
  matrix() {
    return this.catalog.buildBlockingMatrix();
  }

  @Get('blockings/audit')
  blockingsAudit(
    @Query('limit') limit?: string,
    @Query('storeCode') storeCode?: string,
    @Query('categoryCode') categoryCode?: string,
    @Query('actor') actor?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.catalog.listBlockingAuditEvents({
      limit: limit ? Number(limit) : 50,
      storeCode,
      categoryCode,
      actor,
      from,
      to,
    });
  }

  @Roles('ADMIN')
  @Post('blockings/upsert')
  upsertBlocking(@Body() dto: UpsertBlockingDto) {
    return this.catalog.upsertBlocking(dto);
  }
}
