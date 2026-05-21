import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Appointment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  doctorId?: Types.ObjectId;

  @Prop({ required: true, enum: ['emergency', 'primary', 'specialist'] })
  area: string;

  @Prop({
    required: true,
    enum: ['waiting', 'triage', 'in_consultation', 'finished', 'cancelled'],
    default: 'waiting',
  })
  status: string;

  @Prop()
  reasonForVisit: string;

  // Signos vitales (Triaje)
  @Prop({
    type: {
      bloodPressure: String,
      temperature: Number,
      weight: Number,
      heartRate: Number,
    },
  })
  vitals?: {
    bloodPressure: string;
    temperature: number;
    weight: number;
    heartRate: number;
  };

  @Prop({ type: Types.ObjectId, ref: 'Institution', required: true })
  institutionId: Types.ObjectId;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
