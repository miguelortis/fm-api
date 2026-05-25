import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class AuditLog extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: string;

  @Prop()
  userName: string;

  @Prop({ required: true })
  module: string; // Nombre de la colección (roles, users, appointments, etc.)

  @Prop({ required: true })
  action: string; // 'CREATE', 'UPDATE', 'DELETE'

  @Prop({ type: Object })
  previousState: any; // El "Antes" (null si es CREATE)

  @Prop({ type: Object })
  newState: any; // El "Después" (null si es DELETE)

  @Prop()
  ipAddress: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
