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
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Comparar contraseñas
    const isMatch = await bcrypt.compare(pass, user.password as string);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    delete user.password; // Eliminar la contraseña del objeto antes de enviarlo
    // 3. Generar el JWT con los datos clave (Payload)
    const payload = {
      sub: user._id,
      email: user.email,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: user,
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, nationalId, password, ...rest } = registerDto;

    // 1. Verificar duplicados
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { nationalId }],
    });

    if (existingUser) {
      throw new BadRequestException(
        'La cédula o el correo ya están registrados',
      );
    }

    // 2. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Crear el usuario
    const newUser = new this.userModel({
      ...rest,
      email,
      nationalId,
      password: hashedPassword,
      roles: ['user'], // Roles por defecto
    });

    await newUser.save();

    // 4. Generar token para login automático (Opcional pero recomendado)
    const payload = { sub: newUser._id, username: newUser.nationalId };

    return {
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        nationalId: newUser.nationalId,
        role: newUser.role,
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
