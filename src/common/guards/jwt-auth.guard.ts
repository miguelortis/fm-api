import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

interface JwtPayload {
  sub: string; // userId
  username: string;
  role: string; // <-- MUY IMPORTANTE para que el RolesGuard funcione
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Aquí puedes personalizar el manejo de errores si quieres
  handleRequest<TUser = any>(err: any, user: JwtPayload): TUser {
    if (err || !user) {
      throw (
        err || new UnauthorizedException('Debes iniciar sesión para acceder')
      );
    }
    return user as TUser;
  }
}
