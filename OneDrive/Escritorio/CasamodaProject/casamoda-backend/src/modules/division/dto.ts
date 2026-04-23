import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class LotLineDto {
  @IsString()
  sku!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  multiplo?: number;

  /** Solo aplica si el tipo tiene talle: `false` = sin curva completa certificada (PRD §5.2). */
  @IsOptional()
  @IsBoolean()
  curvaCompleta?: boolean;
}

export class DryRunDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LotLineDto)
  lines!: LotLineDto[];

  @IsOptional()
  @IsIn(['NUEVA', 'REPOSICION'])
  tipo?: 'NUEVA' | 'REPOSICION';
}

export class GenerateInlineDto extends DryRunDto {
  @IsString()
  lotCode!: string;

  @IsOptional()
  @IsIn(['NACIONAL', 'IMPORTADO'])
  origen?: 'NACIONAL' | 'IMPORTADO';

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsString()
  actor?: string;
}

export class GenerateFromLotDto {
  @IsString()
  lotId!: string;

  @IsOptional()
  @IsString()
  actor?: string;
}

export class ActorDto {
  @IsOptional()
  @IsString()
  actor?: string;
}

export class AllocationPatchLineDto {
  @IsString()
  id!: string;

  @IsInt()
  @Min(0)
  cantidadAprobada!: number;
}

export class MarkExceptionDto {
  @IsString()
  @MinLength(4, { message: 'Ingresá un motivo (min. 4 caracteres).' })
  motivo!: string;

  @IsOptional()
  @IsString()
  actor?: string;
}

export class PatchAllocationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AllocationPatchLineDto)
  lines!: AllocationPatchLineDto[];

  @IsOptional()
  @IsString()
  actor?: string;
}

export class CreateOwnerDirectiveDto {
  @IsIn(['GLOBAL', 'GRUPO', 'CATEGORIA', 'TIENDA', 'TIENDA_CATEGORIA', 'SKU'])
  alcance!: 'GLOBAL' | 'GRUPO' | 'CATEGORIA' | 'TIENDA' | 'TIENDA_CATEGORIA' | 'SKU';

  @IsOptional()
  @IsString()
  targetStoreId?: string;

  @IsOptional()
  @IsString()
  targetStoreCode?: string;

  @IsOptional()
  @IsString()
  targetGroupId?: string;

  @IsOptional()
  @IsString()
  targetGroupCode?: string;

  @IsOptional()
  @IsString()
  targetCategoryId?: string;

  @IsOptional()
  @IsString()
  targetCategoryCode?: string;

  @IsOptional()
  @IsString()
  targetProductId?: string;

  @IsOptional()
  @IsString()
  targetProductSku?: string;

  @IsObject()
  valor!: Record<string, unknown>;

  @IsString()
  @MinLength(4)
  motivo!: string;

  @IsString()
  @MinLength(2)
  emisor!: string;

  @IsOptional()
  @IsString()
  vigenciaDesde?: string;

  @IsOptional()
  @IsString()
  vigenciaHasta?: string;
}

export class MlScoreQueryDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  storeCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  horizonDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
