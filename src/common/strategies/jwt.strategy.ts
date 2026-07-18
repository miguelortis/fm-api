import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from '@/modules/users/interfaces/user.interface';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { IPermission } from '@/modules/auth/interfaces/permission.interface';

interface JwtPayload {
  sub: string; // _id (userId)
  email: string;
  role: string; // <-- MUY IMPORTANTE para que el RolesGuard funcione
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'unefm_secret_key_2024',
    });
  }

  /**
   * @param payload El contenido decodificado del JWT
   * @returns El objeto que se inyectará en req.user
   */
  async validate(payload: JwtPayload) {
    // Buscamos al usuario y traemos su rol con los permisos populados
    const user = (await this.userModel
      .findById(payload.sub)
      .populate({
        path: 'role',
        populate: { path: 'permissions' },
      })
      .lean()) as IUser | null;

    if (!user || user.status === 'inactive') {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    // Retornamos una estructura limpia para los Guards
    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      nationalId: user.nationalId,
      role: user?.role?.['slug'],
      isRoot: user?.role?.['isRoot'],
      // Mapeamos solo los slugs de los permisos para facilitar la búsqueda
      permissions: user?.role?.['permissions']?.map((p: IPermission) => p.slug),
    };
  }
}
