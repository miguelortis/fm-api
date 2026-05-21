import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment } from './schemas/appointment.schema';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class MedicalService {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    private plansService: PlansService, // Inyectamos el motor de planes
  ) {}

  async createAppointment(appointmentData: {
    patientId?: string;
    serviceId?: string;
  }) {
    const { patientId, serviceId } = appointmentData;

    if (!patientId || !serviceId) {
      throw new BadRequestException('patientId y serviceId son requeridos');
    }
    // 1. Validar si el paciente puede usar el servicio (Urología, etc.)
    const validation = await this.plansService.canUseService(
      patientId,
      serviceId,
    );

    if (!validation.allowed) {
      throw new BadRequestException(validation.message);
    }

    // 2. Si está permitido, creamos la cita en estado 'waiting'
    const newAppointment = new this.appointmentModel({
      ...appointmentData,
      status: 'waiting',
    });

    return newAppointment.save();
  }

  // Listar pacientes para el médico según el área
  async getQueueByArea(area: string, institutionId: string) {
    return this.appointmentModel
      .find({
        area,
        institutionId,
        status: 'waiting',
      })
      .populate('patientId')
      .sort({ createdAt: 1 })
      .exec();
  }
}
