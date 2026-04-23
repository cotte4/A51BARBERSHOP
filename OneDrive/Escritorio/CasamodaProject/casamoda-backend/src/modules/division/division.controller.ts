import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { DivisionService } from './division.service';
import {
  ActorDto,
  CreateOwnerDirectiveDto,
  DryRunDto,
  GenerateFromLotDto,
  GenerateInlineDto,
  MarkExceptionDto,
  MlScoreQueryDto,
  PatchAllocationsDto,
} from './dto';

@Controller('division')
export class DivisionController {
  constructor(private readonly service: DivisionService) {}

  @Roles('DUENIA', 'ADMIN')
  @Get('directives')
  async listDirectives(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive !== 'false';
    return this.service.listOwnerDirectives(include);
  }

  @Roles('DUENIA', 'ADMIN')
  @Post('directives')
  async createDirective(@Body() dto: CreateOwnerDirectiveDto) {
    return this.service.createOwnerDirective({
      ...dto,
      alcance: dto.alcance,
    });
  }

  @Roles('DUENIA', 'ADMIN')
  @Post('directives/:id/activate')
  async activateDirective(@Param('id') id: string, @Body() dto: ActorDto) {
    return this.service.setOwnerDirectiveActive(id, true, dto.actor);
  }

  @Roles('DUENIA', 'ADMIN')
  @Post('directives/:id/deactivate')
  async deactivateDirective(@Param('id') id: string, @Body() dto: ActorDto) {
    return this.service.setOwnerDirectiveActive(id, false, dto.actor);
  }

  @Roles('ENCARGADO', 'ADMIN')
  @Post('dry-run')
  async dryRun(@Body() dto: DryRunDto) {
    return this.service.dryRun(dto);
  }

  @Roles('ENCARGADO', 'ADMIN')
  @Post('proposals')
  async generateInline(@Body() dto: GenerateInlineDto) {
    return this.service.generateInline(dto);
  }

  @Roles('ENCARGADO', 'ADMIN')
  @Post('proposals/from-lot')
  async generateFromLot(@Body() dto: GenerateFromLotDto) {
    return this.service.generateFromLot(dto);
  }

  @Roles('ENCARGADO', 'DUENIA', 'ADMIN')
  @Get('ml-scores')
  async listMlScores(@Query() query: MlScoreQueryDto) {
    return this.service.listMlScores(query);
  }

  @Roles('ENCARGADO', 'DUENIA', 'ADMIN')
  @Get('proposals')
  async list(@Query('limit') limit?: string) {
    return this.service.listProposals(limit ? Number(limit) : undefined);
  }

  @Roles('ENCARGADO', 'DUENIA', 'ADMIN')
  @Get('proposals/:id/export')
  async export(@Param('id') id: string, @Query('format') format?: string) {
    const f = (format ?? 'csv').toLowerCase();
    const fmt = f === 'xlsx' ? 'xlsx' : f === 'pdf' ? 'pdf' : 'csv';
    return this.service.exportProposalFile(id, fmt);
  }

  @Roles('ENCARGADO', 'DUENIA', 'ADMIN')
  @Get('proposals/:id/audit')
  async audit(@Param('id') id: string) {
    return this.service.listProposalAuditEvents(id);
  }

  @Roles('ENCARGADO', 'DUENIA', 'ADMIN')
  @Get('proposals/:id')
  async getOne(@Param('id') id: string) {
    return this.service.getProposal(id);
  }

  @Roles('ENCARGADO', 'ADMIN')
  @Patch('proposals/:id/allocations')
  async patchAllocations(@Param('id') id: string, @Body() dto: PatchAllocationsDto) {
    return this.service.patchAllocations(id, dto);
  }

  @Roles('ENCARGADO', 'ADMIN')
  @Post('proposals/:id/accept-suggested')
  async acceptSuggested(@Param('id') id: string, @Body() dto: ActorDto) {
    return this.service.acceptSuggested(id, dto.actor);
  }

  @Roles('ENCARGADO', 'ADMIN')
  @Post('proposals/:id/validate')
  async validate(@Param('id') id: string, @Body() dto: ActorDto) {
    return this.service.validateProposal(id, dto.actor);
  }

  @Roles('ENCARGADO', 'ADMIN')
  @Post('proposals/:id/publish')
  async publish(@Param('id') id: string, @Body() dto: ActorDto) {
    return this.service.publishProposal(id, dto.actor);
  }

  @Roles('ENCARGADO', 'ADMIN')
  @Post('proposals/:id/discard')
  async discard(@Param('id') id: string, @Body() dto: ActorDto) {
    return this.service.discardProposal(id, dto.actor);
  }

  @Roles('ENCARGADO', 'DUENIA', 'ADMIN')
  @Post('proposals/:id/marcar-excepcion')
  async markException(@Param('id') id: string, @Body() dto: MarkExceptionDto) {
    return this.service.markException(id, { motivo: dto.motivo, actor: dto.actor });
  }
}
