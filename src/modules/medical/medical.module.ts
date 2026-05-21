// src/modules/medical/medical.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicalService } from './medical.service';
import { MedicalController } from './medical.controller';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema';
import { PlansModule } from '../plans/plans.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    PlansModule, // Para validar la cobertura
    UsersModule, // Para buscar datos del paciente
  ],
  controllers: [MedicalController],
  providers: [MedicalService],
})
export class MedicalModule {}
