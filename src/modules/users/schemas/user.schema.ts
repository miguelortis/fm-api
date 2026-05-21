import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  nationalId!: string; // Para niños sin cédula, usaremos un formato especial (ej: V-MADRE-1)

  @Prop()
  email?: string;

  @Prop()
  password?: string; // Solo si tiene acceso al sistema (Trabajador o Titular)

  @Prop({ type: Types.ObjectId, ref: 'Role' })
  role: Types.ObjectId;

  // RELACIÓN FAMILIAR: Para evitar duplicados
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  familyGroup: Types.ObjectId[]; // Lista de IDs de familiares vinculados

  @Prop({ type: Types.ObjectId, ref: 'User' })
  parentPrimary: Types.ObjectId; // El titular principal responsable

  // COBERTURA MÉDICA
  @Prop({
    type: {
      planId: { type: Types.ObjectId, ref: 'Plan' },
      limit: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active',
      },
    },
  })
  coverage!: {
    planId?: Types.ObjectId; // Es opcional porque los externos no tienen plan
    limit: number;
    used: number;
    status: string;
  };

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
