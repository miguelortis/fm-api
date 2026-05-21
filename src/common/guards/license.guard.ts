import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { InstitutionService } from '../../modules/institution/institution.service';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(private institutionService: InstitutionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Por ahora, como solo tienes la UNEFM, buscaremos la primera institución.
    // En el futuro, esto vendrá del token JWT del usuario logueado.
    const institution = await this.institutionService.getFirstInstitution();

    if (!institution) {
      throw new ForbiddenException('Institución no configurada.');
    }

    // 1. Verificar si está activa
    if (!institution.license.isActive) {
      throw new ForbiddenException(
        'La licencia de esta institución ha sido suspendida.',
      );
    }

    // 2. Verificar fecha de vencimiento (si no es ilimitada)
    if (
      institution.license.licenseType === 'timed' &&
      institution.license.expirationDate
    ) {
      const now = new Date();
      if (now > institution.license.expirationDate) {
        throw new ForbiddenException(
          'Su licencia ha expirado. Por favor, contacte al administrador.',
        );
      }
    }

    // Guardamos la institución en la request para usarla luego en los controladores
    request['institution'] = institution;

    return true;
  }
}
