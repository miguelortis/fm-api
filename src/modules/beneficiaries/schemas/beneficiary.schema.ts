import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Beneficiary extends Document {
  @Prop({ type: String, required: false })
  nationalId: string; // Cédula (puede ser null para menores)

  // 🔒 Serial único de partida de nacimiento para menores sin cédula
  @Prop({ type: String, required: false })
  civilRegistrySerial: string;

  @Prop({ required: true, type: String })
  firstName: string;

  @Prop({ required: true, type: String })
  lastName: string;

  @Prop({ required: true, type: Date })
  birthDate: Date;

  @Prop({ required: true, type: Boolean, default: false })
  isSpecial: boolean; // Flag para hijos con condiciones especiales (cobertura ilimitada)

  // Datos específicos desagregados del acta (para auditoría visual o reconstrucción)
  @Prop({
    type: {
      state: String,
      municipality: String,
      year: String,
      book: String,
      actNumber: String,
    },
    _id: false,
    default: null,
  })
  birthCertificateDetails: {
    state: string;
    municipality: string;
    year: string;
    book: string;
    actNumber: string;
  } | null;

  // Expediente digital de documentos requeridos
  @Prop({
    type: {
      nationalIdCopy: String, // URL del archivo de cédula
      birthCertificateCopy: String, // URL del archivo de partida de nacimiento
      legalProofSpecial: String, // URL del justificativo de condición especial
    },
    _id: false,
  })
  documents: {
    nationalIdCopy?: string;
    birthCertificateCopy?: string;
    legalProofSpecial?: string;
  };
}

export const BeneficiarySchema = SchemaFactory.createForClass(Beneficiary);

// Índice 1: Garantiza que la cédula sea única, pero IGNORA por completo los registros que no la tengan
BeneficiarySchema.index(
  { nationalId: 1 },
  {
    unique: true,
    partialFilterExpression: { nationalId: { $exists: true, $type: 'string' } },
  },
);

// Índice 2: Garantiza que el serial de la partida de nacimiento sea único si existe
BeneficiarySchema.index(
  { civilRegistrySerial: 1 },
  {
    unique: true,
    partialFilterExpression: {
      civilRegistrySerial: { $exists: true, $type: 'string' },
    },
  },
);

BeneficiarySchema.index({ firstName: 1, lastName: 1 });
