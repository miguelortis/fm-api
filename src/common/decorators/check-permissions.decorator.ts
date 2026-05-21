import { SetMetadata } from '@nestjs/common';

// Definimos una clave única para identificar estos metadatos
export const PERMISSION_KEY = 'permission';

/**
 * Decorador para requerir un permiso específico en un endpoint.
 * Uso: @CheckPermissions('users:create')
 */
export const CheckPermissions = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);
