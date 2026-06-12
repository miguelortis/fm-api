import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  module: string;

  @IsEnum(['screen', 'permission'], {
    message: 'El tipo de permiso debe ser "screen" o "permission"',
  })
  @IsNotEmpty()
  type: 'screen' | 'permission';

  @IsString()
  @IsOptional()
  description?: string;
}
