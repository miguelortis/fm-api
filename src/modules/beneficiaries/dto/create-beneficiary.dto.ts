import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class BirthCertificateDetailsDto {
  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  municipality: string;

  @IsString()
  @IsNotEmpty()
  year: string;

  @IsString()
  @IsNotEmpty()
  book: string;

  @IsString()
  @IsNotEmpty()
  actNumber: string;
}

class BeneficiaryDocumentsDto {
  @IsString()
  @IsOptional()
  nationalIdCopy?: string;

  @IsString()
  @IsOptional()
  birthCertificateCopy?: string;

  @IsString()
  @IsOptional()
  legalProofSpecial?: string;
}

export class CreateBeneficiaryDto {
  @IsString()
  @IsOptional()
  nationalId?: string | null;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @Type(() => Date)
  @IsDate()
  birthDate: Date;

  @IsString()
  @IsOptional()
  placeOfBirth?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo debe ser válido' })
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsBoolean()
  @IsOptional()
  isTitular?: boolean;

  @IsBoolean()
  @IsOptional()
  isSpecial?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => BirthCertificateDetailsDto)
  birthCertificateDetails?: BirthCertificateDetailsDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => BeneficiaryDocumentsDto)
  documents?: BeneficiaryDocumentsDto;

  @IsOptional()
  @IsDateString()
  registrationDate?: string;
}
