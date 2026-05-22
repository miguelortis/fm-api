import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findByNationalId(nationalId: string) {
    return this.userModel
      .findOne({ nationalId })
      .populate({
        path: 'role',
        populate: { path: 'permissions' },
      })
      .populate('coverage.planId')
      .exec();
  }

  async findById(id: string): Promise<User | null> {
    // El populate es vital para que el PlansService pueda leer los beneficios del plan
    return this.userModel.findById(id).populate('coverage.planId').exec();
  }

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate({
        path: 'role',
        populate: { path: 'permissions' },
      })
      .populate('coverage.planId')
      .select('-password')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async createAdmin(userData: {
    firstName: string;
    lastName: string;
    nationalId: string;
    password: string;
  }) {
    const { password } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new this.userModel({
      ...userData,
      password: hashedPassword,
      roles: ['admin'],
      permissions: ['*'], // Permiso total para el creador
    });
    return newAdmin.save();
  }

  /* async onModuleInit() {
    const adminExists = await this.userModel.findOne({ roles: 'admin' });
    if (!adminExists) {
      await this.createAdmin({
        firstName: 'Admin',
        lastName: 'Principal',
        nationalId: '12345678', // Úsala para loguearte
        password: 'admin1234', // Cambiala luego
      });
      console.log('👤 Usuario Administrador inicial creado.');
    }
  } */
}
