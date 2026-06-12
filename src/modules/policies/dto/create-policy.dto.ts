import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

class PolicyBeneficiaryItemDto {
  @IsMongoId()
  beneficiaryId: string;

  @IsEnum(['User', 'Beneficiary'])
  onModel: 'User' | 'Beneficiary';

  @IsEnum(['PAREJA', 'MADRE', 'PADRE', 'HIJO'])
  relationship: 'PAREJA' | 'MADRE' | 'PADRE' | 'HIJO';
}

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  period: string; // Ej: "2026-2027"

  @IsMongoId()
  planId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyBeneficiaryItemDto)
  beneficiaries: PolicyBeneficiaryItemDto[];
}
