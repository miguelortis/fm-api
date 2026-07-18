//DTO para updateProfile, se utiliza para validar los datos que el usuario puede actualizar en su perfil
import { IsOptional, IsString, IsEnum } from 'class-validator';
import type {
  IEmploymentType,
  IMaritalStatus,
  IPersonalType,
} from '../interfaces/user.interface';

export class UpdateProfileDto {
  @IsOptional()
  @IsEnum(['M', 'F'])
  gender?: 'M' | 'F';

  @IsOptional()
  @IsString()
  placeOfBirth?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  dependencyArea?: string;

  @IsOptional()
  @IsEnum(['DOCENTE', 'ADMINISTRATIVO', 'OBRERO'])
  personalType?: IPersonalType;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsEnum(['FIJO', 'CONTRATADO', 'JUBILADO'])
  employmentType?: IEmploymentType;

  @IsOptional()
  @IsEnum(['SOLTERO/A', 'CASADO/A', 'DIVORCIADO/A', 'VIUDO/A', 'OTROS'])
  maritalStatus?: IMaritalStatus;
}
