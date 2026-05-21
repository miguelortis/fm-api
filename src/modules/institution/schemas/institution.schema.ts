import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Institution extends Document {
  @Prop({ required: true, unique: true })
  name: string; // Ej: Fondo de Mutualidad UNEFM

  @Prop({ required: true, unique: true })
  slug: string; // Ej: unefm (se usará para la URL o subdominio)

  @Prop({
    type: {
      licenseType: {
        type: String,
        enum: ['unlimited', 'timed'],
        default: 'timed',
      },
      expirationDate: { type: Date },
      isActive: { type: Boolean, default: true },
    },
  })
  license: {
    licenseType: string;
    expirationDate?: Date;
    isActive: boolean;
  };

  @Prop({ type: [String], default: ['recepcion', 'consultas'] })
  enabledModules: string[]; // Ej: ['farmacia', 'laboratorio', 'cobranzas']
}

export const InstitutionSchema = SchemaFactory.createForClass(Institution);
