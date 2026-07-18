import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Patch,
  Param,
  Delete,
  UseFilters,
} from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard'; // 🌟 Importamos el Guard de permisos institucional
import { Types } from 'mongoose';
import { CheckPermissions } from '@/common/decorators/check-permissions.decorator';
import { MongoExceptionFilter } from '@/common/filters/mongo-exception.filter';

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard)
@UseFilters(MongoExceptionFilter)
export class BeneficiariesController {
  constructor(private readonly beneficiariesService: BeneficiariesService) {}

  // 👤 AUTOGESTIÓN PÚBLICA: El trabajador agrega un familiar a su carga
  @Post()
  async addFamiliarToCharge(
    @Req() req: { user: { _id: string; nationalId: string } },
    @Body()
    createBeneficiaryDto: CreateBeneficiaryDto & { relationship: string },
  ) {
    const titularId = req?.user?._id;
    const nationalId = req?.user?.nationalId;
    return this.beneficiariesService.createOrFindAndLink(
      titularId,
      nationalId,
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

  @Delete(':id')
  //@CheckPermissions('beneficiaries:delete')
  @UseGuards(PermissionsGuard)
  async delete(@Param('id') id: string) {
    return await this.beneficiariesService.delete(id);
  }
}
