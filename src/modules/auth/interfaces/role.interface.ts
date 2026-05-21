import { Permission } from '../schemas/permission.schema';

export interface IRole {
  name: string;
  slug: string;
  permissions?: Permission[]; // Aquí guardamos los slugs de los permisos asociados a este rol
  isActive?: boolean;
  isRoot?: boolean; // Para marcar roles que tienen acceso total (como admin)
}
