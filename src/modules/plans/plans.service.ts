import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Plan } from './schemas/plan.schema';
import { UsageTracking } from './schemas/usage-tracking.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<Plan>,
    @InjectModel(UsageTracking.name)
    private usageTrackingModel: Model<UsageTracking>,
    private usersService: UsersService,
  ) {}

  /**
   * Crea un nuevo plan de beneficios
   */
  async create(planData: any): Promise<Plan> {
    const newPlan = new this.planModel(planData);
    return newPlan.save();
  }

  /**
   * Obtiene todos los planes de la institución
   */
  async findAll(institutionId: string): Promise<Plan[]> {
    return this.planModel
      .find({ institutionId })
      .populate('benefits.serviceId')
      .exec();
  }

  /**
   * LÓGICA DE VALIDACIÓN PRINCIPAL
   * Determina si un paciente puede acceder a un servicio según su plan y consumo actual.
   */
  async canUseService(
    patientId: string,
    serviceId: string,
  ): Promise<{ allowed: boolean; message: string }> {
    // 1. Obtener datos del paciente y su plan
    const patient = await this.usersService.findById(patientId);
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    // Si el paciente no tiene planId, es un paciente particular (externo)
    if (!patient.coverage?.planId) {
      return {
        allowed: true,
        message: 'Paciente particular sin plan. Proceder a cobro por taquilla.',
      };
    }

    const plan = await this.planModel.findById(patient.coverage.planId);
    if (!plan)
      throw new NotFoundException('El plan asignado al paciente no existe');

    // 2. Buscar el beneficio específico dentro del plan
    const benefit = plan.benefits.find(
      (b) => b.serviceId.toString() === serviceId,
    );

    if (!benefit) {
      return {
        allowed: false,
        message:
          'Este servicio no está incluido en el plan actual del paciente.',
      };
    }

    // Si es ilimitado, no hace falta contar consumos
    if (benefit.isUnlimited) {
      return { allowed: true, message: 'Servicio ilimitado.' };
    }

    // 3. Calcular el rango de fecha según la frecuencia (mensual, anual, etc.)
    const startDate = this.getStartDateForFrequency(benefit.frequency);

    // 4. Contar cuántas veces ha usado ese servicio en el periodo actual
    const usageCount = await this.usageTrackingModel.countDocuments({
      patientId: new Types.ObjectId(patientId),
      serviceId: new Types.ObjectId(serviceId),
      usageDate: { $gte: startDate },
    });

    // 5. Validar contra el límite del plan
    const isAllowed = usageCount < benefit.limit;

    return {
      allowed: isAllowed,
      message: isAllowed
        ? `Uso permitido. Ha consumido ${usageCount} de ${benefit.limit} disponibles (${benefit.frequency}).`
        : `Límite de consumo alcanzado para este periodo (${benefit.limit} usos ${benefit.frequency}).`,
    };
  }

  /**
   * Registra el consumo de un servicio.
   * Se debe llamar cuando la consulta es efectivamente realizada.
   */
  async registerUsage(usageData: {
    patientId: string;
    serviceId: string;
    planId: string;
    appointmentId?: string;
  }) {
    const record = new this.usageTrackingModel({
      patientId: new Types.ObjectId(usageData.patientId),
      serviceId: new Types.ObjectId(usageData.serviceId),
      planId: new Types.ObjectId(usageData.planId),
      appointmentId: usageData.appointmentId
        ? new Types.ObjectId(usageData.appointmentId)
        : null,
      usageDate: new Date(),
    });
    return record.save();
  }

  /**
   * Helper: Calcula la fecha de inicio del ciclo de consumo
   */
  private getStartDateForFrequency(frequency: string): Date {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    switch (frequency) {
      case 'weekly': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes
        start.setDate(diff);
        break;
      }
      case 'monthly':
        start.setDate(1); // Primer día del mes
        break;
      case 'quarterly': {
        const quarter = Math.floor(now.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        break;
      }
      case 'yearly':
        start.setMonth(0, 1); // 1 de Enero
        break;
      default:
        start.setMonth(0, 1);
    }
    return start;
  }
}
