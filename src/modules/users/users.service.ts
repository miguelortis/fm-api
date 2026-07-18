import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { IStatus, IUser } from './interfaces/user.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async updateProfile(userId: string, updateData: Partial<IUser>) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // campos no permitidos para actualizar
    const forbiddenFields = [
      '_id',
      'firstName',
      'lastName',
      'nationalId',
      'nationality',
      'email',
      'password',
      'role',
      'isTitular',
      'status',
      'refuseReason',
    ];

    // Eliminar los campos no permitidos
    Object.keys(updateData).forEach((key) => {
      if (forbiddenFields.includes(key)) {
        delete updateData[key];
      }
    });

    return await this.userModel.findByIdAndUpdate(userId, updateData, {
      returnDocument: 'after',
    });
  }

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

  async getProfile(_id: string) {
    const user = await this.userModel
      .findById(_id)
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

  async deleteUser(userId: string) {
    return await this.userModel.findByIdAndDelete(userId);
  }

  async updateStatusUser(userId: string, status: IStatus) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { status },
      {
        returnDocument: 'after',
      },
    );

    const payload = {
      sub: user?._id,
      status: user?.status,
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: user,
    };
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
