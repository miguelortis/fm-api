import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Permission } from './permission.schema';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({ required: true, unique: true, trim: true })
  name: string; // Ej: "Personal de Informática"

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string; // Ej: "root" o "admin"

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Permission' }],
    default: [],
  })
  permissions: Permission[];

  @Prop({ default: false })
  isRoot: boolean; // Si es true, el Guard ignora las validaciones y da acceso total

  @Prop({ default: true })
  isActive: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
