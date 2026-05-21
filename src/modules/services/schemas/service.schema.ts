import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class MedicalService extends Document {
  @Prop({ required: true })
  name!: string; // Ej: "Consulta de Ginecología", "Perfil Lipídico"

  @Prop({
    required: true,
    enum: ['consultation', 'laboratory', 'imaging', 'procedure'],
  })
  type!: string;

  @Prop({ required: true, default: 0 })
  basePrice!: number; // Precio para pacientes particulares

  @Prop({ type: Types.ObjectId, ref: 'Institution', required: true })
  institutionId!: Types.ObjectId;

  @Prop({ default: true })
  isActive!: boolean;
}

export const MedicalServiceSchema =
  SchemaFactory.createForClass(MedicalService);
