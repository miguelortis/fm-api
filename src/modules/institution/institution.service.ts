import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Institution } from './schemas/institution.schema';

@Injectable()
export class InstitutionService implements OnModuleInit {
  constructor(
    @InjectModel(Institution.name) private institutionModel: Model<Institution>,
  ) {}

  async getFirstInstitution() {
    return await this.institutionModel.findOne().exec();
  }

  // Esto se ejecuta cuando el módulo se inicia
  async onModuleInit() {
    const count = await this.institutionModel.countDocuments();
    if (count === 0) {
      await this.institutionModel.create({
        name: 'Fondo de Mutualidad UNEFM',
        slug: 'unefm',
        license: {
          licenseType: 'unlimited',
          isActive: true,
        },
        enabledModules: [
          'recepcion',
          'consultas',
          'farmacia',
          'laboratorio',
          'cobranzas',
        ],
      });
      console.log('✅ Institución inicial creada: Fondo de Mutualidad UNEFM');
    }
  }
}
