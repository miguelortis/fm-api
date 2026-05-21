import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Plan extends Document {
  @Prop({ required: true })
  name: string; // Ej: Plan Básico Unefm

  @Prop({
    type: [
      {
        serviceId: { type: Types.ObjectId, ref: 'Service' },
        limit: { type: Number }, // Cantidad permitida
        isUnlimited: { type: Boolean, default: false },
        frequency: {
          type: String,
          enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
          default: 'yearly',
        },
      },
    ],
  })
  benefits!: Array<{
    serviceId: Types.ObjectId;
    limit: number;
    isUnlimited: boolean;
    frequency: string;
  }>;

  @Prop({ required: true })
  price!: number; // Costo del plan para el titular

  @Prop({ required: true, enum: ['weekly', 'biweekly', 'monthly'] })
  billingFrequency!: string; // Frecuencia de cobro al titular
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
