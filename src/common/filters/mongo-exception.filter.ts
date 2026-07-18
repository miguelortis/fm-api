import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Error } from 'mongoose';

// Dejar vacío para capturar cualquier tipo de excepción nativa o de librería sin problemas de tipado
@Catch()
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 1. Capturar el error 11000 de índices únicos (MongoServerError / Mongoose)
    if (exception && (exception.code === 11000 || exception.code === 11001)) {
      const keyValue = exception.keyValue || {};
      let customMessage = 'Registro duplicado en el sistema.';

      if (keyValue.relationship) {
        customMessage = `El titular ya tiene registrado un beneficiario con el parentesco: ${keyValue.relationship}.`;
      }

      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: customMessage,
        error: 'Bad Request',
      });
    }

    // 2. Capturar errores de validación de esquemas de Mongoose (Validation Errors)
    if (exception && exception.name === 'ValidationError') {
      const messages = Object.values(exception.errors as Error).map(
        (err: Error) => err.message,
      );
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message:
          messages.length > 0 ? messages : 'Error de validación en los datos.',
        error: 'Validation Error',
      });
    }

    // 3. Si el error no es de base de datos, dejar que NestJS use su manejo por defecto o responder 500
    const status = exception?.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception?.message || 'Error interno en el servidor.';

    return response.status(status as number).json({
      statusCode: status,
      message: typeof message === 'string' ? message : message.message,
      error: exception?.name || 'InternalServerError',
    });
  }
}
