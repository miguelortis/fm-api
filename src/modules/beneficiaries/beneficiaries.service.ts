import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Beneficiary } from './schemas/beneficiary.schema';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { User } from '../users/schemas/user.schema';

export type FolderEntrys = {
  _id: any;
  period: string;
  titular: {
    _id: any;
    firstName: string;
    lastName: string;
    nationalId?: string;
    email?: string;
  };
  beneficiaries: Array<any>;
};

@Injectable()
export class BeneficiariesService {
  constructor(
    @InjectModel(Beneficiary.name)
    private readonly beneficiaryModel: Model<Beneficiary>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private async addBeneficiary(dto: CreateBeneficiaryDto) {
    const identifier = dto.nationalId?.trim();

    const existingUser = await this.userModel.findOne({
      nationalId: identifier,
    });

    if (existingUser) {
      return existingUser;
    }

    const newBeneficiary = await new this.userModel({
      ...dto,
      nationalId: dto.nationalId,
      birthDate: dto.birthDate,
      isTitular: false,
    }).save();

    return newBeneficiary;
  }

  async createOrFindAndLink(
    titularId: string,
    nationalId: string,
    dto: CreateBeneficiaryDto & { relationship: string },
  ): Promise<Beneficiary> {
    if (nationalId === dto.nationalId) {
      throw new BadRequestException(
        'El titular no puede ser su propio familiar.',
      );
    }
    const beneficiary = await this.addBeneficiary(dto);

    if (!beneficiary?._id) {
      throw new BadRequestException(
        'No se pudo crear o actualizar al familiar.',
      );
    }

    const result = await this.beneficiaryModel
      .findOneAndUpdate(
        {
          titular: new Types.ObjectId(titularId),
          beneficiary: new Types.ObjectId(beneficiary._id),
        },
        {
          titular: new Types.ObjectId(titularId),
          beneficiary: new Types.ObjectId(beneficiary._id),
          relationship: dto.relationship,
          physicalDocuments: {},
          isFolderComplete: false,
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      )
      .populate('beneficiary');

    if (!result) {
      throw new BadRequestException(
        'No se pudo asociar el familiar. Verifique los datos o si ya se encuentra vinculado.',
      );
    }

    return result;
  }

  getMyCharge(titularId: string): Promise<any[]> {
    return this.beneficiaryModel
      .find({ titular: new Types.ObjectId(titularId) })
      .populate('beneficiary')
      .exec();
  }

  async findById(id: string): Promise<Beneficiary | null> {
    return this.beneficiaryModel.findById(id).lean().exec();
  }

  async toggleFolderDocument(
    titularId: string,
    beneficiaryId: string,
    documentKey: string,
    isProvided: boolean,
    adminId: Types.ObjectId,
  ): Promise<Beneficiary> {
    const charge = await this.beneficiaryModel
      .findOne({
        titular: new Types.ObjectId(titularId),
        beneficiary: new Types.ObjectId(beneficiaryId),
      })
      .populate('beneficiary')
      .exec();

    if (!charge) {
      throw new NotFoundException(
        'No existe este familiar en la carga del titular.',
      );
    }

    if (!charge.physicalDocuments) charge.physicalDocuments = {};

    charge.physicalDocuments[documentKey] = {
      isProvided,
      verifiedBy: isProvided ? new Types.ObjectId(adminId) : null,
      verifiedAt: isProvided ? new Date() : null,
    };

    const docs = charge.physicalDocuments;
    let complete = false;

    if (charge.relationship === 'PADRE' || charge.relationship === 'MADRE') {
      complete = !!(
        docs.parentBirthCertificate?.isProvided && docs.parentCedula?.isProvided
      );
    } else if (charge.relationship === 'HIJO') {
      const baseDocs =
        docs.childBirthCertificate?.isProvided &&
        docs.titularCedula?.isProvided;
      complete = !!baseDocs;
    } else if (charge.relationship === 'PAREJA') {
      complete = !!(
        docs.marriageCertificate?.isProvided &&
        docs.partnerCedula?.isProvided &&
        docs.titularCedula?.isProvided
      );
    }

    charge.isFolderComplete = complete;
    charge.markModified('physicalDocuments');

    return charge.save();
  }

  async getAllPendingFolders(): Promise<FolderEntrys[]> {
    const charges = await this.beneficiaryModel
      .find()
      .populate('titular', 'firstName lastName nationalId email')
      .populate('beneficiary')
      .lean()
      .exec();

    type FolderEntry = {
      _id: any;
      period: string;
      titular: {
        _id: any;
        firstName: string;
        lastName: string;
        nationalId?: string;
        email?: string;
      };
      beneficiaries: Array<any>;
    };

    const groupedFoldersMap: Record<string, FolderEntry> = {};

    charges.forEach((charge: any) => {
      if (!charge.titular || !charge.beneficiary) return;

      const titularId = String(charge.titular._id);

      if (!groupedFoldersMap[titularId]) {
        groupedFoldersMap[titularId] = {
          _id: charge._id,
          period: 'EXPEDIENTE_PERMANENTE',
          titular: {
            _id: charge.titular._id,
            firstName: charge.titular.firstName,
            lastName: charge.titular.lastName,
            nationalId: charge.titular.nationalId,
            email: charge.titular.email,
          },
          beneficiaries: [],
        };
      }

      groupedFoldersMap[titularId].beneficiaries.push({
        relationship: charge.relationship,
        hasAllDocuments: charge.isFolderComplete,
        beneficiaryId: {
          _id: charge.beneficiary._id,
          firstName: charge.beneficiary.firstName,
          lastName: charge.beneficiary.lastName,
          nationalId: charge.beneficiary.nationalId,
          isTitular: charge.beneficiary.isTitular || false,
        },
        familyChargeDetails: {
          physicalDocuments: charge.physicalDocuments || {},
          isFolderComplete: charge.isFolderComplete,
        },
      });
    });

    return Object.values(groupedFoldersMap).sort(
      (a: FolderEntry, b: FolderEntry) =>
        a.titular.lastName.localeCompare(b.titular.lastName),
    );
  }

  async delete(id: string) {
    // 1. Iniciamos la sesión global de MongoDB
    const session = await this.connection.startSession();

    // 2. Arrancamos la transacción manualmente
    session.startTransaction();

    try {
      // 3. Buscar y eliminar el beneficio pasando la sesión
      const beneficiaryDeleted = await this.beneficiaryModel
        .findByIdAndDelete(id)
        .session(session);

      if (!beneficiaryDeleted) {
        // Al lanzar un error aquí, saltamos directamente al catch, el cual abortará la transacción
        throw new NotFoundException('El beneficiario no existe.');
      }

      const userIdToDelete = beneficiaryDeleted.beneficiary;

      // 4. Buscar al usuario pasando la sesión
      const user = await this.userModel
        .findById(userIdToDelete)
        .session(session);

      if (user) {
        // 5. Verificar otras relaciones pasando la sesión
        const hasOtherRelations = await this.beneficiaryModel
          .exists({ beneficiary: userIdToDelete })
          .session(session);

        // 6. Aplicar reglas de negocio
        if (!user.isTitular && !hasOtherRelations) {
          await this.userModel
            .findByIdAndDelete(userIdToDelete)
            .session(session);
        }
      }

      // 7. SI TODO SALIÓ BIEN: Confirmamos los cambios de manera explícita
      await session.commitTransaction();

      return {
        success: true,
      };
    } catch (error) {
      // 8. SI ALGO FALLÓ: Cancelamos todo y restauramos el estado anterior de la base de datos
      await session.abortTransaction();

      // Controlamos si es un error de negocio mapeado por nosotros
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('Error en la transacción manual de eliminación:', error);
      throw new InternalServerErrorException(
        'No se pudo procesar la eliminación de forma segura.',
      );
    } finally {
      // 9. Cerramos la sesión obligatoriamente para liberar la conexión en el pool
      await session.endSession();
    }
  }
}
