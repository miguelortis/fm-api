import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MedicalService } from './medical.service';
import { Roles } from '@/common/decorators/roles.decorator';
import type { IAppointment } from './interfaces/appointment.interface';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Role } from '@/common/enums/role.enum';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { CheckPermissions } from '@/common/decorators/check-permissions.decorator';

@Controller('medical')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MedicalController {
  constructor(private readonly medicalService: MedicalService) {}

  /**
   * REGISTRO EN RECEPCIÓN: La secretaria crea la cita.
   * El servicio validará automáticamente el plan del paciente.
   */
  @Post('check-in')
  @CheckPermissions('appointments:create')
  async checkIn(@Body() appointmentData: IAppointment) {
    return this.medicalService.createAppointment(appointmentData);
  }

  /**
   * COLA DEL MÉDICO: El médico consulta quién sigue en su área.
   * Ordenado por hora de llegada.
   */
  @Get('queue')
  @Roles(Role.ADMIN)
  async getQueue(
    @Query('area') area: string,
    @Query('institutionId') institutionId: string,
  ) {
    return this.medicalService.getQueueByArea(area, institutionId);
  }

  /**
   * LLAMAR PACIENTE: El médico marca que el paciente ya entró a consulta.
   */
  @Patch('call/:id')
  @Roles(Role.ADMIN)
  callPatient(@Param('id') id: string) {
    // Aquí podrías implementar la lógica para cambiar el status a 'in_consultation'
    //return this.medicalService.updateStatus(id, 'in_consultation');
    console.log(id);
  }
}
