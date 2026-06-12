import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Policy } from './schemas/policy.schema';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { UsersService } from '../users/users.service';
import { FamilyCharge } from '../beneficiaries/schemas/family-charge.schema';

@Injectable()
export class PoliciesService {
  constructor(
    @InjectModel(Policy.name) private readonly policyModel: Model<Policy>,
    @InjectModel(FamilyCharge.name)
    private readonly familyChargeModel: Model<FamilyCharge>,
    private readonly beneficiariesService: BeneficiariesService,
    private readonly usersService: UsersService,
  ) {}

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  }

  async createOrRenew(
    titularId: string,
    dto: CreatePolicyDto,
  ): Promise<Policy> {
    const { period, planId, beneficiaries } = dto;

    // Verificar si el titular ya cargó una propuesta para este mismo periodo
    const existingPolicy = await this.policyModel
      .findOne({ titularId: new Types.ObjectId(titularId), period })
      .exec();
    if (existingPolicy) {
      throw new BadRequestException(
        `Ya posee una solicitud de póliza registrada para el periodo ${period}.`,
      );
    }

    const structuredBeneficiaries: any[] = [];

    // Recorremos los familiares elegidos en los checkboxes del Front
    for (const b of beneficiaries) {
      // 1. Buscamos el expediente físico permanente en la tabla puente FamilyCharge
      const charge = await this.familyChargeModel
        .findOne({
          titular: new Types.ObjectId(titularId),
          beneficiary: new Types.ObjectId(b.beneficiaryId),
        })
        .populate('beneficiary')
        .exec();

      if (!charge) {
        throw new NotFoundException(
          'Uno de los familiares seleccionados no está asociado a su carga legal.',
        );
      }

      // 2. Control estricto de edad biográfica para exclusión de Hijos
      const beneficiaryData = charge.beneficiary as any;
      const ageAtSubscription = this.calculateAge(beneficiaryData.birthDate);
      const isSpecialChild =
        charge.onModel === 'Beneficiary' ? !!beneficiaryData?.isSpecial : false;

      if (
        charge.relationship === 'HIJO' &&
        ageAtSubscription >= 25 &&
        !isSpecialChild
      ) {
        throw new BadRequestException(
          `No se puede asegurar a ${beneficiaryData.firstName} ${beneficiaryData.lastName}. Supera el límite de edad permitido (25 años).`,
        );
      }

      // 3. Insertamos la foto inmutable en la póliza anual
      structuredBeneficiaries.push({
        beneficiary: new Types.ObjectId(b.beneficiaryId),
        onModel: charge.onModel,
        relationship: charge.relationship,
        ageAtSubscription,
      });
    }

    const newPolicy = new this.policyModel({
      period,
      titularId: new Types.ObjectId(titularId),
      planId: new Types.ObjectId(planId),
      status: 'PENDING_APPROVAL', // Entra en espera de validación masiva administrativa
      beneficiaries: structuredBeneficiaries,
    });

    return newPolicy.save();
  }

  // 📡 PANEL ADMINISTRATIVO: Obtener pólizas pendientes poblando los datos dinámicos con FamilyCharge
  async findAllPending(): Promise<any[]> {
    const pendingPolicies = await this.policyModel
      .find({ status: 'PENDING_APPROVAL' })
      .populate('planId', 'name')
      .populate('titular', 'firstName lastName nationalId email')
      .exec();

    const finalizedPolicies: any[] = [];

    // Cruzamos la póliza anual contra la carpeta física permanente de FamilyCharge para inyectarle a la UI los booleanos de los checkboxes
    for (const policy of pendingPolicies) {
      const formattedBeneficiaries: any[] = [];

      for (const b of policy.beneficiaries) {
        const chargeRecord = await this.familyChargeModel
          .findOne({
            titular: policy.titular._id,
            beneficiary: b.beneficiaryId,
          })
          .select('physicalDocuments isFolderComplete')
          .lean()
          .exec();

        // Buscamos dinámicamente los datos biográficos de la persona (User o Beneficiary)
        const targetModel = b.onModel === 'User' ? 'User' : 'Beneficiary';
        const bioData = await this.policyModel.db
          .model(targetModel)
          .findById(b.beneficiaryId)
          .select('firstName lastName nationalId civilRegistrySerial isSpecial')
          .lean()
          .exec();

        formattedBeneficiaries.push({
          relationship: b.relationship,
          ageAtSubscription: b.ageAtSubscription,
          isSpecial: bioData?.['isSpecial'] || false,
          hasAllDocuments: chargeRecord ? chargeRecord.isFolderComplete : false,
          beneficiaryId: bioData, // Se lo pasamos poblado de forma nativa al Front
          familyChargeDetails: chargeRecord, // Inyectamos el objeto con la traza de los recaudos e isFolderComplete
        });
      }

      const policyObj = policy.toObject();
      policyObj.beneficiaries = formattedBeneficiaries;
      finalizedPolicies.push(policyObj);
    }

    return finalizedPolicies;
  }

  // Consulta de cobertura unificada con Populates limpios y cruzados
  async getActiveCoverage(
    pacienteId: string,
    currentPeriod: string,
  ): Promise<Policy | null> {
    return this.policyModel
      .findOne({
        period: currentPeriod,
        status: 'ACTIVE',
        $or: [
          { titular: new Types.ObjectId(pacienteId) },
          { 'beneficiaries.beneficiaryId': new Types.ObjectId(pacienteId) },
        ],
      })
      .populate('planId')
      .populate('titular', 'firstName lastName nationalId')
      .populate('beneficiaries.beneficiaryId') // Mongoose sabe hacer populate dinámico gracias al refPath
      .exec();
  }

  // 🔒 Cambiar a verificado el expediente de un familiar individualmente dentro de una póliza
  async approveBeneficiaryDocuments(
    policyId: string,
    beneficiaryId: string,
  ): Promise<Policy> {
    // Validamos que los IDs tengan el formato correcto de MongoDB antes de pegarle a Atlas
    if (
      !Types.ObjectId.isValid(policyId) ||
      !Types.ObjectId.isValid(beneficiaryId)
    ) {
      throw new BadRequestException(
        'Los identificadores proporcionados no son válidos.',
      );
    }

    // Buscamos la póliza utilizando el operador posicional de filtros ($) de MongoDB
    const updatedPolicy = await this.policyModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(policyId),
          'beneficiaries.beneficiaryId': new Types.ObjectId(beneficiaryId),
        },
        {
          // El comodín $[elem] apunta al objeto exacto que cumple con la condición del arrayFilters
          $set: { 'beneficiaries.$[elem].hasAllDocuments': true },
        },
        {
          arrayFilters: [
            { 'elem.beneficiaryId': new Types.ObjectId(beneficiaryId) },
          ],
          new: true, // Nos retorna el documento modificado en tiempo real
        },
      )
      .populate('titularId', 'firstName lastName')
      .populate('beneficiaries.beneficiaryId')
      .exec();

    if (!updatedPolicy) {
      throw new NotFoundException(
        'No se encontró la póliza o el beneficiario especificado.',
      );
    }

    return updatedPolicy;
  }
}
