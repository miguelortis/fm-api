import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
class PolicyBeneficiary {
  // refPath permite que este ID apunte de forma dinámica a la colección de Familiares o de Usuarios
  @Prop({
    type: Types.ObjectId,
    required: true,
    refPath: 'beneficiaries.onModel',
  })
  beneficiaryId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['User', 'Beneficiary'] })
  onModel: string; // Define dinámicamente el modelo destino de la relación

  @Prop({
    type: String,
    required: true,
    enum: ['PAREJA', 'MADRE', 'PADRE', 'HIJO'],
  })
  relationship: string;

  @Prop({ type: Number, required: true })
  ageAtSubscription: number; // Edad congelada calculada al momento de la inscripción anual

  @Prop({ type: Boolean, required: true, default: false })
  isSpecial: boolean; // Copia de seguridad de la condición especial para este lapso

  @Prop({ type: Boolean, required: true, default: false })
  hasAllDocuments: boolean; // Flag controlado por el Admin para activar/pausar el uso médico
}

@Schema({ timestamps: true })
export class Policy extends Document {
  @Prop({ required: true, type: String })
  period: string; // Periodo de vigencia contractual. Ej: "2026-2027"

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  titular: Types.ObjectId; // ID del empleado o afiliado principal dueño de la cuenta

  @Prop({ type: Types.ObjectId, ref: 'Plan', required: true })
  planId: Types.ObjectId; // El plan que seleccionó y se le está descontando en este periodo

  @Prop({
    type: String,
    required: true,
    enum: ['PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'EXPIRED'],
    default: 'PENDING_APPROVAL',
  })
  status: string;

  @Prop({ type: [PolicyBeneficiary], default: [] })
  beneficiaries: PolicyBeneficiary[];
}

export const PolicySchema = SchemaFactory.createForClass(Policy);

// Índices compuestos indispensables para el motor de búsquedas cruzadas rápidas
PolicySchema.index({ period: 1, status: 1 });
PolicySchema.index({ titular: 1, period: 1 }, { unique: true }); // Evita que un titular compre dos planes el mismo año
PolicySchema.index({ 'beneficiaries.beneficiaryId': 1, status: 1 }); // Busca rápido coberturas de familiares
