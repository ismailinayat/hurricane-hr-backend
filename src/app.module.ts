import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration, { AppConfig } from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { User } from './users/entities/user.entity';
import { Attendance } from './attendance/entities/attendance.entity';
import { Leave } from './leaves/entities/leave.entity';
import { PasswordResetToken } from './auth/entities/password-reset-token.entity';
import { TokenBlacklist } from './auth/entities/token-blacklist.entity';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeavesModule } from './leaves/leaves.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const throttleConfig = configService.get<AppConfig>('app')!.throttle;
        return { throttlers: [{ ttl: throttleConfig.ttl * 1000, limit: throttleConfig.limit }] };
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { database, nodeEnv } = configService.get<AppConfig>('app')!;
        return {
          type: 'postgres' as const,
          ...(database.url
            ? { url: database.url }
            : {
                host: database.host,
                port: database.port,
                username: database.username,
                password: database.password,
                database: database.database,
              }),
          ssl: database.ssl ? { rejectUnauthorized: false } : false,
          entities: [User, Attendance, Leave, PasswordResetToken, TokenBlacklist],
          synchronize: false,
          logging: nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
        };
      },
    }),
    AuthModule,
    UsersModule,
    EmployeesModule,
    AttendanceModule,
    LeavesModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
