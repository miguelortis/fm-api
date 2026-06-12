import { Types } from 'mongoose';

export interface IPolicyBeneficiary {
  beneficiaryId: Types.ObjectId; // ID del beneficiario (puede ser User o Beneficiary)
  onModel: 'User' | 'Beneficiary'; // Para saber en qué colección buscar
  relationship: 'PAREJA' | 'MADRE' | 'PADRE' | 'HIJO'; // Parentesco con el titular
  ageAtSubscription: number; // Edad al momento de la inscripción en la póliza
  hasAllDocuments: boolean; // Si el beneficiario tiene toda la documentación requerida
  isSpecial: boolean; // Si es un caso especial (ej: niños sin cédula)
}

export interface IPolicy {
  _id: string;
  period: string;
  titular: string;
  planId: string;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'EXPIRED';
  beneficiaries: IPolicyBeneficiary[];
  createdAt: string;
}
