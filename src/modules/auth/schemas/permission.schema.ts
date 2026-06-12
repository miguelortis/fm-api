import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PermissionDocument = Permission & Document;

@Schema({ timestamps: true })
export class Permission {
  @Prop({ required: true, trim: true })
  name: string; // Ej: "Mesa de Validación" o "Auditar Carpetas Físicas"

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string; // Ej: "beneficiaries:view" o "beneficiaries:audit"

  @Prop({ required: true, trim: true })
  module: string; // Ej: "Cargas Familiares", "Control de Pólizas" (Tu Key del JSON)

  @Prop({ required: true, enum: ['screen', 'action'], trim: true })
  type: 'screen' | 'action'; // 🌟 Nuevo campo estricto

  @Prop({ trim: true })
  description?: string;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

// Índice compuesto para optimizar las búsquedas por agrupación en la UI
PermissionSchema.index({ module: 1, type: 1 });
