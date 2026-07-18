import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(nationalId: string, pass: string) {
    // 1. Buscar al usuario (usaremos la cédula como username por ser única)
    const user = await this.usersService.findByNationalId(nationalId);

    if (!user) {
      throw new UnauthorizedException('Cedula inválida');
    }

    // 2. Comparar contraseñas
    if (!user.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Contraseña inválida');
    }

    delete (user as Partial<User>).password; // Eliminar la contraseña del objeto antes de enviarlo
    // 3. Generar el JWT con los datos clave (Payload)
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

  async register(registerDto: RegisterDto) {
    const { email, nationalId, password, ...rest } = registerDto;

    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { nationalId }],
    });

    const userData = {
      ...rest,
      nationalId,
      ...(email ? { email } : {}),
      ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
      isTitular: rest.isTitular ?? true,
      birthDate: rest.birthDate ? new Date(rest.birthDate) : undefined,
    };

    let userRecord: User | null;

    if (existingUser) {
      userRecord = await this.userModel.findByIdAndUpdate(
        existingUser._id,
        {
          $set: userData,
        },
        { new: true },
      );
    } else {
      userRecord = await new this.userModel(userData).save();
    }

    if (!userRecord) {
      throw new BadRequestException('No se pudo guardar el usuario');
    }

    const payload = { sub: userRecord._id, username: userRecord.nationalId };

    return {
      user: {
        id: userRecord._id,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        email: userRecord.email,
        nationalId: userRecord.nationalId,
        role: userRecord.role,
        isTitular: userRecord.isTitular,
      },
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  logout() {
    // En JWT, el logout se maneja del lado del cliente eliminando el token.
    // Opcionalmente, podrías implementar una lista negra de tokens en el servidor.
    return { message: 'Logout exitoso' };
  }
}
