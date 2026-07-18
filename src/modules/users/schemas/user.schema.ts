import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import type {
  IBirthCertificateDetails,
  IEmploymentType,
  IMaritalStatus,
  IPersonalType,
  IStatus,
} from '../interfaces/user.interface';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ type: String, required: true, uppercase: true, trim: true })
  nationality: string;

  @Prop({ required: true, unique: true })
  nationalId: string;

  @Prop({ required: true, uppercase: true, trim: true })
  firstName: string;

  @Prop({ required: true, uppercase: true, trim: true })
  lastName: string;

  @Prop({ type: String })
  placeOfBirth?: string;

  @Prop({ type: String, lowercase: true, trim: true })
  email?: string;

  @Prop({ type: String, min: 6 })
  password?: string;

  @Prop({ type: String, trim: true })
  address?: string;

  @Prop({ type: String, enum: ['M', 'F'] })
  gender?: string;

  @Prop({ type: Types.ObjectId, ref: 'Role' })
  role: Types.ObjectId;

  @Prop()
  birthDate?: Date;

  @Prop({ type: Boolean, default: false })
  isTitular: boolean;

  // COBERTURA MÉDICA
  @Prop({
    type: {
      planId: { type: Types.ObjectId, ref: 'Plan' },
      limit: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['active', 'inactive', 'excluded', 'suspended'],
        default: 'active',
      },
    },
  })
  coverage!: {
    planId?: Types.ObjectId;
    limit: number;
    used: number;
    status: string;
  };

  @Prop({
    type: String,
    required: true,
    enum: [
      'pending',
      'processing',
      'active',
      'inactive',
      'excluded',
      'refused',
    ],
    default: 'pending',
  })
  status: IStatus;

  @Prop({ trim: true })
  refuseReason?: string;

  @Prop({ trim: true })
  dependencyArea: string;

  @Prop({ trim: true })
  profession: string;

  @Prop({
    type: String,
    enum: ['FIJO', 'CONTRATADO', 'JUBILADO'],
  })
  employmentType: IEmploymentType;

  @Prop({
    type: String,
    enum: ['SOLTERO/A', 'CASADO/A', 'DIVORCIADO/A', 'VIUDO/A', 'OTROS'],
  })
  maritalStatus: IMaritalStatus;

  @Prop({
    type: String,
    enum: ['DOCENTE', 'ADMINISTRATIVO', 'OBRERO'],
  })
  personalType: IPersonalType;

  @Prop()
  isSpecial: boolean;

  @Prop({ trim: true })
  phone: string;

  @Prop({ type: Object, default: {} })
  birthCertificateDetails?: IBirthCertificateDetails;

  @Prop({ type: String, uppercase: true, trim: true })
  bank?: string;

  @Prop({ type: String, trim: true })
  accountNumber?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
