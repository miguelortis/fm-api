import { Types } from 'mongoose';
import { IBeneficiary } from './beneficiary.interface';

export interface IPhysicalDocumentStatus {
  isProvided: boolean;
  verifiedBy: Types.ObjectId | null; // ID del admin que verificó
  verifiedAt: Date | null; // Fecha de verificación
}

export interface IFamilyCharge {
  titular: Types.ObjectId; // El ID de tu papá
  beneficiary: Types.ObjectId | IBeneficiary; // 🌟 Puede ser tu USER_ID o un BENEFICIARY_ID
  onModel: 'User' | 'Beneficiary'; // 🌟 Le dice a Mongoose en qué colección buscarte
  relationship: 'PAREJA' | 'MADRE' | 'PADRE' | 'HIJO';
  physicalDocuments: {
    parentBirthCertificate?: IPhysicalDocumentStatus;
    parentCedula?: IPhysicalDocumentStatus;
    childBirthCertificate?: IPhysicalDocumentStatus;
    titularCedula?: IPhysicalDocumentStatus;
    specialProof?: IPhysicalDocumentStatus;
    marriageCertificate?: IPhysicalDocumentStatus;
    partnerCedula?: IPhysicalDocumentStatus;
  };
  isFolderComplete: boolean; // Flag calculado para saber si el expediente está completo según la relación y condición especial
}
