import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { Plan, PlanSchema } from './schemas/plan.schema';
import {
  UsageTracking,
  UsageTrackingSchema,
} from './schemas/usage-tracking.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Plan.name, schema: PlanSchema },
      { name: UsageTracking.name, schema: UsageTrackingSchema },
    ]),
    UsersModule, // Necesario para inyectar UsersService
  ],
  providers: [PlansService],
  controllers: [PlansController],
  exports: [PlansService],
})
export class PlansModule {}
