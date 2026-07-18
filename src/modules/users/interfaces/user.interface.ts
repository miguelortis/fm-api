import { IRole } from '@/modules/auth/interfaces/role.interface';

export interface IBirthCertificateDetails {
  state?: string;
  municipality?: string;
  year?: string;
  book?: string;
  actNumber?: string;
}

export type IMaritalStatus =
  | 'SOLTERO/A'
  | 'CASADO/A'
  | 'DIVORCIADO/A'
  | 'VIUDO/A'
  | 'OTROS';

export type IStatus =
  | 'pending'
  | 'processing'
  | 'active'
  | 'inactive'
  | 'excluded'
  | 'refused';

export type IEmploymentType = 'FIJO' | 'CONTRATADO' | 'JUBILADO';

export type IPersonalType = 'DOCENTE' | 'ADMINISTRATIVO' | 'OBRERO';

export interface IUser {
  _id: string;
  nationality: string;
  firstName: string;
  lastName: string;
  nationalId: string; // Cédula o ID generado para menores
  email?: string;
  role: IRole;
  refuseReason?: string;
  gender?: 'M' | 'F';
  placeOfBirth?: string;
  address?: string;
  isTitular?: boolean;
  dependencyArea: string;
  personalType: IPersonalType;
  profession: string;
  employmentType: IEmploymentType;
  maritalStatus: IMaritalStatus;
  // Gestión de beneficios y cobertura
  coverage: {
    planId?: string; // ID del Plan asociado
    limit: number; // Límite monetario o de puntos (si aplica)
    used: number; // Consumo acumulado
    status: 'active' | 'suspended';
  };

  status: IStatus;
  createdAt: string;
  updatedAt: string;

  birthCertificateDetails?: IBirthCertificateDetails; // Detalles del acta de nacimiento
  isSpecial?: boolean; // Indica si el usuario tiene alguna condición especial
}
