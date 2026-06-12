import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  UseGuards,
  Patch,
  Param,
} from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CheckPermissions } from '@/common/decorators/check-permissions.decorator';

@Controller('policies')
@UseGuards(JwtAuthGuard)
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post('renew')
  async renewPolicy(
    @Req() req: { user: { _id: string } },
    @Body() createPolicyDto: CreatePolicyDto,
  ) {
    const titular = req.user._id; // ID inyectado por el JwtStrategy
    return this.policiesService.createOrRenew(titular, createPolicyDto);
  }
  // 👥 ENDPOINT PANEL ADMINISTRATIVO: Listar expedientes en espera por el agente autorizado
  @Get('pending-reviews')
  @CheckPermissions('policies:view')
  async getPendingPolicies() {
    return this.policiesService.findAllPending();
  }

  // ✅ ENDPOINT PANEL ADMINISTRATIVO: Aprobar de forma individual los papeles físicos de un familiar
  @Patch(':policyId/beneficiary/:beneficiaryId/approve-docs')
  @CheckPermissions('policies:approve')
  async verifyFamiliarDocuments(
    @Param('policyId') policyId: string,
    @Param('beneficiaryId') beneficiaryId: string,
  ) {
    return this.policiesService.approveBeneficiaryDocuments(
      policyId,
      beneficiaryId,
    );
  }

  @Get('coverage-check')
  @CheckPermissions('policies:coverage-check')
  async checkCoverage(
    @Query('pacienteId') pacienteId: string,
    @Query('period') period: string,
  ) {
    const currentPeriod = period || '2026-2027';
    return this.policiesService.getActiveCoverage(pacienteId, currentPeriod);
  }
}
