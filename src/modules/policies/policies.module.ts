import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PoliciesService } from './policies.service';
import { PoliciesController } from './policies.controller';
import { Policy, PolicySchema } from './schemas/policy.schema';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module'; // 🔥 IMPORTACIÓN
import { UsersService } from '../users/users.service';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Policy.name, schema: PolicySchema },
      { name: User.name, schema: UserSchema }, // 🔥 Necesario para que el PoliciesService pueda hacer consultas a la colección de Usuarios
    ]),
    BeneficiariesModule, // 🔥 Al importar el módulo completo, heredamos el acceso a 'Beneficiary'
  ],
  controllers: [PoliciesController],
  providers: [PoliciesService, UsersService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
