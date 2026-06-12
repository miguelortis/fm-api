import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Beneficiary } from './schemas/beneficiary.schema';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { IBirthCertificateDetails } from './types/beneficiary.interface';
import { FamilyCharge } from './schemas/family-charge.schema';
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
    @InjectModel(FamilyCharge.name)
    private readonly familyChargeModel: Model<FamilyCharge>,
    @InjectModel('User') private readonly userModel: Model<User>,
  ) {}

  // Helper para normalizar el serial de la partida de nacimiento de forma inmutable
  private generateCivilRegistrySerial(
    details: IBirthCertificateDetails,
  ): string {
    const raw = `VE-${details?.state}-${details?.municipality}-${details?.year}-${details?.book}-${details?.actNumber}`;
    return raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toUpperCase();
  }

  async createOrFind(
    createBeneficiaryDto: CreateBeneficiaryDto,
  ): Promise<Beneficiary> {
    const {
      nationalId,
      birthCertificateDetails,
      firstName,
      lastName,
      birthDate,
    } = createBeneficiaryDto;

    // Limpieza preventiva: Si viene un string vacío o nulo, lo eliminamos para no pisar el índice parcial
    if (!nationalId) {
      delete createBeneficiaryDto.nationalId;
    }

    // CASO A: El beneficiario tiene Cédula (Adultos o niños cedulados)
    if (nationalId && nationalId.trim() !== '') {
      const existing = await this.beneficiaryModel
        .findOne({ nationalId })
        .exec();
      if (existing) return existing;
    }
    // CASO B: Menor de edad sin cédula -> Validamos por el serial compuesto del registro civil
    else if (birthCertificateDetails) {
      const serial = this.generateCivilRegistrySerial(birthCertificateDetails);

      const existingBySerial = await this.beneficiaryModel
        .findOne({ civilRegistrySerial: serial })
        .exec();
      if (existingBySerial) return existingBySerial;

      // Doble check biográfico preventivo
      const existingByBio = await this.beneficiaryModel
        .findOne({
          firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
          birthDate,
        })
        .exec();

      if (existingByBio) return existingByBio;

      // Inyectamos el serial único calculado en la propiedad limpia
      createBeneficiaryDto.civilRegistrySerial = serial;
    } else {
      throw new BadRequestException(
        'Debe proporcionar el nationalId o los detalles del registro civil.',
      );
    }

    // Al guardar, gracias al delete de arriba, nationalId no existirá en el documento si era null
    const newBeneficiary = new this.beneficiaryModel(createBeneficiaryDto);
    return newBeneficiary.save();
  }

  async createOrFindAndLink(
    titularId: string,
    dto: CreateBeneficiaryDto & { relationship: string },
  ): Promise<FamilyCharge> {
    let targetId: Types.ObjectId | null = null;
    let onModel: 'User' | 'Beneficiary' = 'Beneficiary';

    // 1. ¿Tiene cédula? Verificamos si ya es un Usuario/Trabajador en el sistema
    if (dto.nationalId && dto.nationalId.trim() !== '') {
      const existingUser = await this.userModel
        .findOne({ nationalId: dto.nationalId })
        .exec();
      if (existingUser) {
        targetId = existingUser._id;
        onModel = 'User';
      }
    }

    // 2. Si no es un usuario, validamos en la colección de familiares independientes
    if (!targetId) {
      if (dto.nationalId && dto.nationalId.trim() !== '') {
        const existingBeneficiary = await this.beneficiaryModel
          .findOne({ nationalId: dto.nationalId })
          .exec();
        if (existingBeneficiary) targetId = existingBeneficiary._id;
      } else if (dto.birthCertificateDetails) {
        const serial = this.generateCivilRegistrySerial(
          dto.birthCertificateDetails,
        );
        const existingBySerial = await this.beneficiaryModel
          .findOne({ civilRegistrySerial: serial })
          .exec();
        if (existingBySerial) {
          targetId = existingBySerial._id;
        } else {
          dto.civilRegistrySerial = serial;
        }
      }

      // 3. Si no existe en ningún lado, se crea el familiar de forma física
      if (!targetId) {
        if (!dto.nationalId) delete dto.nationalId;
        const newBeneficiary = new this.beneficiaryModel(dto);
        const saved = await newBeneficiary.save();
        targetId = saved._id;
      }
    }

    // 4. Creamos el vínculo histórico en la tabla puente FamilyCharge
    try {
      return await this.familyChargeModel
        .findOneAndUpdate(
          { titular: new Types.ObjectId(titularId), beneficiary: targetId },
          {
            titular: new Types.ObjectId(titularId),
            beneficiary: targetId,
            onModel,
            relationship: dto.relationship,
          },
          { upsert: true, returnDocument: 'after' },
        )
        .populate('beneficiary');
    } catch {
      throw new BadRequestException(
        'Este familiar ya se encuentra asociado a su carga actual.',
      );
    }
  }

  // Retorna toda la carga familiar histórica de un trabajador
  async getMyCharge(titularId: string): Promise<any[]> {
    return this.familyChargeModel
      .find({ titular: new Types.ObjectId(titularId) })
      .populate('beneficiary') // Trae los datos dinámicos de Users o Beneficiaries automáticamente
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
  ): Promise<FamilyCharge> {
    // Buscamos la relación puente única de esa carpeta física
    const charge = await this.familyChargeModel
      .findOne({
        titular: new Types.ObjectId(titularId),
        beneficiary: new Types.ObjectId(beneficiaryId),
      })
      .populate('beneficiary') // Necesitamos saber si el beneficiario es especial para la validación de expediente completo
      .exec();

    if (!charge)
      throw new NotFoundException(
        'No existe este familiar en la carga del titular.',
      );

    if (!charge.physicalDocuments) charge.physicalDocuments = {};

    // Guardamos el recaudo físico y quién lo vio
    charge.physicalDocuments[documentKey] = {
      isProvided,
      verifiedBy: isProvided ? new Types.ObjectId(adminId) : null,
      verifiedAt: isProvided ? new Date() : null,
    };

    // 🧮 VALIDACIÓN DE EXPEDIENTE PERMANENTE
    const docs = charge.physicalDocuments;
    let complete = false;

    if (charge.relationship === 'PADRE' || charge.relationship === 'MADRE') {
      complete = !!(
        docs.parentBirthCertificate?.isProvided && docs.parentCedula?.isProvided
      );
    } else if (charge.relationship === 'HIJO') {
      // Nota: Aquí validamos si es hijo especial consultando el documento real si es necesario o guardando una bandera
      const beneficiaryData = charge.beneficiary as { isSpecial?: boolean };
      const isSpecialChild =
        charge.onModel === 'Beneficiary' ? !!beneficiaryData?.isSpecial : false;
      const baseDocs =
        docs.childBirthCertificate?.isProvided &&
        docs.titularCedula?.isProvided;
      complete = isSpecialChild
        ? !!(baseDocs && docs.specialProof?.isProvided)
        : !!baseDocs;
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
    // 1. Buscamos todas las relaciones de carga familiar en la tabla puente
    // Poblamos los datos del trabajador (titular) y de su familiar (beneficiary) de forma polimórfica
    const charges = await this.familyChargeModel
      .find()
      .populate('titular', 'firstName lastName nationalId email')
      .populate('beneficiary') // Mongoose deduce la colección correcta gracias a 'onModel'
      .lean()
      .exec();

    // 2. Estructuramos un mapa en memoria para agrupar los familiares bajo su respectivo Titular
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
      // Si por alguna razón el documento está huérfano de titular o beneficiario, lo ignoramos de forma segura
      if (!charge.titular || !charge.beneficiary) return;

      const titularId = String(charge.titular._id);

      // Si el titular aún no ha sido registrado en el mapa, inicializamos su "Carpeta Física"
      if (!groupedFoldersMap[titularId]) {
        groupedFoldersMap[titularId] = {
          _id: charge._id, // Usamos la ID de la traza para el key del Front
          period: 'EXPEDIENTE_PERMANENTE', // Mantenemos compatibilidad con el tipado del Front
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

      // 3. Inyectamos al familiar en el desglose de beneficiarios de este trabajador
      groupedFoldersMap[titularId].beneficiaries.push({
        relationship: charge.relationship,
        hasAllDocuments: charge.isFolderComplete, // El flag dinámico e instantáneo de Atlas
        beneficiaryId: {
          _id: charge.beneficiary._id,
          firstName: charge.beneficiary.firstName,
          lastName: charge.beneficiary.lastName,
          nationalId: charge.beneficiary.nationalId,
          civilRegistrySerial: charge.beneficiary.civilRegistrySerial || '',
          isSpecial:
            charge.onModel === 'Beneficiary'
              ? !!charge.beneficiary?.isSpecial
              : false,
        },
        familyChargeDetails: {
          physicalDocuments: charge.physicalDocuments || {},
          isFolderComplete: charge.isFolderComplete,
        },
      });
    });

    // 4. Convertimos el mapa de claves de strings a un arreglo plano ordenado por el apellido del trabajador
    return Object.values(groupedFoldersMap).sort(
      (a: FolderEntry, b: FolderEntry) =>
        a.titular.lastName.localeCompare(b.titular.lastName),
    );
  }
}
