import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

//physicalDocuments types
type IPhysicalDocumentStatus = {
  isProvided: boolean;
  verifiedBy: Types.ObjectId | null;
  verifiedAt: Date | null;
};

@Schema({ timestamps: true })
export class Beneficiary extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  titular: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  beneficiary: Types.ObjectId;

  @Prop({ type: String, required: true })
  relationship: string;

  @Prop({ type: Boolean, default: false })
  isFolderComplete: boolean;

  @Prop({
    type: {
      nationalIdCopy: String,
      birthCertificateCopy: String,
      legalProofSpecial: String,
    },
    _id: false,
  })
  @Prop({ type: Object, default: {} })
  physicalDocuments: {
    parentBirthCertificate?: IPhysicalDocumentStatus;
    parentCedula?: IPhysicalDocumentStatus;
    childBirthCertificate?: IPhysicalDocumentStatus;
    titularCedula?: IPhysicalDocumentStatus;
    specialProof?: IPhysicalDocumentStatus;
    marriageCertificate?: IPhysicalDocumentStatus;
    partnerCedula?: IPhysicalDocumentStatus;
  };
}

export const BeneficiarySchema = SchemaFactory.createForClass(Beneficiary);
BeneficiarySchema.index({ titular: 1, beneficiary: 1 }, { unique: true });
BeneficiarySchema.index(
  { titular: 1, relationship: 1 },
  {
    unique: true,
    partialFilterExpression: {
      relationship: { $in: ['PADRE', 'MADRE', 'PAREJA'] },
    },
  },
);
