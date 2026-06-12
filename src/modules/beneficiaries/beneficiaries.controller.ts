import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Patch,
  Param,
} from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard'; // 🌟 Importamos el Guard de permisos institucional
import { Types } from 'mongoose';
import { CheckPermissions } from '@/common/decorators/check-permissions.decorator';

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard) // Candado base general: Autenticado por JWT
export class BeneficiariesController {
  constructor(private readonly beneficiariesService: BeneficiariesService) {}

  // 👤 AUTOGESTIÓN PÚBLICA: El trabajador agrega un familiar a su carga
  @Post()
  async addFamiliarToCharge(
    @Req() req: { user: { _id: string } },
    @Body()
    createBeneficiaryDto: CreateBeneficiaryDto & { relationship: string },
  ) {
    const titularId = req?.user?._id;
    return this.beneficiariesService.createOrFindAndLink(
      titularId,
      createBeneficiaryDto,
    );
  }

  // 👤 AUTOGESTIÓN PÚBLICA: El trabajador consulta su propio expediente
  @Get('my-charge')
  async getMyFamilyExpedient(@Req() req: { user: { _id: string } }) {
    const titularId = req.user._id;
    return this.beneficiariesService.getMyCharge(titularId);
  }

  // 🔒 ✅ EXCLUSIVO ADMINISTRATIVO (PANTALLA): Listar todas las carpetas familiares para auditar
  @Get('admin/pending-folders')
  @CheckPermissions('beneficiaries:view') // 🌟 Requiere permiso tipo "screen"
  @UseGuards(PermissionsGuard)
  async getPendingFolders() {
    // Método del servicio que retorna los expedientes a revisar por el personal administrativo
    return await this.beneficiariesService.getAllPendingFolders();
  }

  // 🔒 ✅ EXCLUSIVO ADMINISTRATIVO (ACCIÓN): Tildar/Destildar un documento físico del expediente
  @Patch('admin/audit/:titularId/beneficiary/:beneficiaryId/check-document')
  @CheckPermissions('beneficiaries:audit') // 🌟 Requiere permiso tipo "permission"
  @UseGuards(PermissionsGuard)
  async auditFolderDocument(
    @Param('titularId') titularId: string,
    @Param('beneficiaryId') beneficiaryId: string,
    @Body() body: { documentKey: string; isProvided: boolean },
    @Req() req: { user: { _id: Types.ObjectId } },
  ) {
    const adminId = req.user._id;
    return this.beneficiariesService.toggleFolderDocument(
      titularId,
      beneficiaryId,
      body.documentKey,
      body.isProvided,
      adminId,
    );
  }
}
