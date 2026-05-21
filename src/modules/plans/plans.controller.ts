import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { PlansService } from './plans.service';
import { Roles } from '@/common/decorators/roles.decorator';
import type { IPlan } from './interfaces/plan.interface';
import { Role } from '@/common/enums/role.enum';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // Crear un plan (Solo el administrador)
  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() planData: IPlan) {
    return this.plansService.create(planData);
  }

  // Obtener todos los planes de una institución
  @Get()
  async findAll(@Query('institutionId') institutionId: string) {
    return this.plansService.findAll(institutionId);
  }

  // Endpoint de validación: ¿Este paciente puede atenderse en este servicio?
  // Ejemplo: GET /plans/validate-usage?patientId=...&serviceId=...
  @Get('validate-usage')
  async validateUsage(
    @Query('patientId') patientId: string,
    @Query('serviceId') serviceId: string,
  ) {
    return this.plansService.canUseService(patientId, serviceId);
  }
}
