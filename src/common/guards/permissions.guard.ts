import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/check-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Extraer el permiso requerido del decorador @CheckPermissions
    const requiredPermission = this.reflector.get<string>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    // Si el endpoint no tiene el decorador, se considera público (dentro de la red autenticada)
    if (!requiredPermission) return true;

    // 2. Obtener el usuario del request (inyectado previamente por el JwtAuthGuard)
    const { user }: { user: { isRoot: boolean; permissions: string[] } } =
      context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // 3. LÓGICA VIP: Si el usuario es ROOT, tiene acceso total e inmediato
    if (user.isRoot) return true;

    // 4. Si no es root, verificamos si tiene el slug en su lista de permisos
    const hasPermission = user.permissions?.includes(requiredPermission);

    if (!hasPermission) {
      throw new ForbiddenException(
        `No tienes el permiso necesario: [${requiredPermission}]`,
      );
    }

    return true;
  }
}
