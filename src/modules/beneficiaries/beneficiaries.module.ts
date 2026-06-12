import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BeneficiariesService } from './beneficiaries.service';
import { BeneficiariesController } from './beneficiaries.controller';
import { Beneficiary, BeneficiarySchema } from './schemas/beneficiary.schema';
import {
  FamilyCharge,
  FamilyChargeSchema,
} from './schemas/family-charge.schema';
import { UsersModule } from '../users/users.module';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Beneficiary.name, schema: BeneficiarySchema },
      { name: FamilyCharge.name, schema: FamilyChargeSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService],
  exports: [BeneficiariesService, MongooseModule],
})
export class BeneficiariesModule {}
