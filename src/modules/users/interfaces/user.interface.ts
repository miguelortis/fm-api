import { IRole } from '@/modules/auth/interfaces/role.interface';

export interface IUser {
  _id: string;
  firstName: string;
  lastName: string;
  nationalId: string; // Cédula o ID generado para menores
  email?: string;
  role: IRole;
  permissions: string[];

  // Relaciones familiares (Recursividad)
  familyGroup: string[] | IUser[]; // IDs de familiares o los objetos completos si usas populate
  parentPrimary?: string | IUser; // Quién es el titular responsable

  // Gestión de beneficios y cobertura
  coverage: {
    planId?: string; // ID del Plan asociado
    limit: number; // Límite monetario o de puntos (si aplica)
    used: number; // Consumo acumulado
    status: 'active' | 'suspended';
  };

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
