import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpsertBlockingDto {
  @IsString()
  storeCode!: string;

  @IsOptional()
  @IsString()
  categoryCode?: string;

  @IsOptional()
  @IsString()
  groupCode?: string;

  @IsIn(['BLOQUEADO', 'HABILITADO'])
  status!: 'BLOQUEADO' | 'HABILITADO';

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  actor?: string;
}
