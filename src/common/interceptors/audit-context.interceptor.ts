import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: {
      user?: any;
      headers: Record<string, any>;
      socket: { remoteAddress?: string };
      method: string;
    } = context.switchToHttp().getRequest();

    const user = request.user;

    if (user) {
      this.cls.set('audit_user', user);
      this.cls.set(
        'audit_ip',
        request.headers['x-forwarded-for'] ||
          request.socket.remoteAddress ||
          '127.0.0.1',
      );
      // 💡 GUARDAMOS EL VERBO HTTP REAL DE LA PETICIÓN
      this.cls.set('audit_method', request.method);
    }

    return next.handle();
  }
}
