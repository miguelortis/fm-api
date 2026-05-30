import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CheckPermissions } from '../../common/decorators/check-permissions.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @CheckPermissions('roles:manage') // Reutiliza tus permisos existentes de seguridad informática
  async getLogs(
    @Query()
    query: {
      page?: string;
      limit?: string;
      action?: string;
      module?: string;
    },
  ) {
    return this.auditLogsService.findAll(query);
  }
}
