import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IPhysicalDocumentStatus } from '../types/family-charge.interface';

@Schema({ _id: false })
class PhysicalDocumentStatus {
  @Prop({ type: Boolean, default: false })
  isProvided: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  verifiedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  verifiedAt: Date | null;
}

const PhysicalDocumentStatusSchema = SchemaFactory.createForClass(
  PhysicalDocumentStatus,
);

@Schema({ timestamps: true })
export class FamilyCharge extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  titular: Types.ObjectId; // El ID de tu papá

  @Prop({ type: Types.ObjectId, required: true, refPath: 'onModel' })
  beneficiary: Types.ObjectId; // 🌟 Puede ser tu USER_ID o un BENEFICIARY_ID

  @Prop({ type: String, required: true, enum: ['User', 'Beneficiary'] })
  onModel: 'User' | 'Beneficiary'; // 🌟 Le dice a Mongoose en qué colección buscarte

  @Prop({
    type: String,
    required: true,
    enum: ['PAREJA', 'MADRE', 'PADRE', 'HIJO'],
  })
  relationship: 'PAREJA' | 'MADRE' | 'PADRE' | 'HIJO';

  @Prop({
    type: {
      parentBirthCertificate: PhysicalDocumentStatusSchema,
      parentCedula: PhysicalDocumentStatusSchema,
      childBirthCertificate: PhysicalDocumentStatusSchema,
      titularCedula: PhysicalDocumentStatusSchema,
      specialProof: PhysicalDocumentStatusSchema,
      marriageCertificate: PhysicalDocumentStatusSchema,
      partnerCedula: PhysicalDocumentStatusSchema,
    },
    _id: false,
    default: {},
  })
  physicalDocuments: {
    parentBirthCertificate?: IPhysicalDocumentStatus;
    parentCedula?: IPhysicalDocumentStatus;
    childBirthCertificate?: IPhysicalDocumentStatus;
    titularCedula?: IPhysicalDocumentStatus;
    specialProof?: IPhysicalDocumentStatus;
    marriageCertificate?: IPhysicalDocumentStatus;
    partnerCedula?: IPhysicalDocumentStatus;
  };

  @Prop({ type: Boolean, required: true, default: false })
  isFolderComplete: boolean; // Flag permanente: ¡Si es true, no vuelve a pedir papeles nunca!
}

export const FamilyChargeSchema = SchemaFactory.createForClass(FamilyCharge);
FamilyChargeSchema.index({ titular: 1, beneficiary: 1 }, { unique: true });
