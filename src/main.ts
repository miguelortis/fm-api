import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  try {
    console.log('--- INICIANDO BOOTSTRAP DE UNEFM SALUD ---');
    console.log('Verificando Puerto:', process.env.PORT);
    console.log('Verificando URI de Mongo existe:', !!process.env.MONGO_URI);

    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Elimina propiedades que no estén en el DTO
        forbidNonWhitelisted: true, // Lanza error si envían propiedades de más
        transform: true, // Convierte los tipos automáticamente
      }),
    );
    app.setGlobalPrefix('api');

    app.enableCors({
      origin: ['http://localhost:3000', '*'], // o un array de orígenes permitidos
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`Server is running on port ${port}`);
  } catch (error) {
    console.error('!!! ERROR CRÍTICO EN EL ARRANQUE DEL SERVIDOR !!!');
    console.error(error); // <-- Esto nos dirá la verdad en el log de Render
    process.exit(1);
  }
}
void bootstrap();
