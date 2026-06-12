import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { UsersModule } from './modules/users/users.module';
import { InstitutionModule } from './modules/institution/institution.module';
import { LicenseGuard } from './common/guards/license.guard';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { MedicalModule } from './modules/medical/medical.module';
import { PlansModule } from './modules/plans/plans.module';
import { ServicesModule } from './modules/services/services.module';
import { AuditLog, AuditLogSchema } from './common/schemas/audit-log.schema';
import { ClsModule, ClsService } from 'nestjs-cls';
import { AuditLogPlugin } from './common/plugins/audit-log.plugin';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { BeneficiariesModule } from './modules/beneficiaries/beneficiaries.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true }, // Monta automáticamente un middleware para capturar el hilo
    }),
    MongooseModule.forRootAsync({
      imports: [ClsModule],
      inject: [ConfigService, ClsService],
      useFactory: (configService: ConfigService, cls: ClsService) => {
        const mongoUri = configService.get<string>('MONGODB_URI');

        return {
          uri: mongoUri,
          connectionFactory: (connection: Connection) => {
            connection.plugin((schema) => AuditLogPlugin(schema, cls));
            return connection;
          },
        };
      },
    }),
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    UsersModule,
    InstitutionModule,
    AuthModule,
    MedicalModule,
    PlansModule,
    ServicesModule,
    AuditLogsModule,
    PoliciesModule,
    BeneficiariesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: LicenseGuard,
    },
  ],
})
export class AppModule {}
