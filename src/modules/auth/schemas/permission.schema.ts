import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PermissionDocument = Permission & Document;

@Schema({ timestamps: true })
export class Permission {
  @Prop({ required: true, unique: true, trim: true })
  name: string; // Ej: "Crear Usuarios"

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string; // Ej: "users:create"

  @Prop({ required: true })
  module: string; // Ej: "Administración", "Consultas" (Para agrupar en la UI)

  @Prop()
  description?: string;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
