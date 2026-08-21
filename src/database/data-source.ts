import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Leave } from '../leaves/entities/leave.entity';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity';
import { TokenBlacklist } from '../auth/entities/token-blacklist.entity';

config();

const entities = [User, Attendance, Leave, PasswordResetToken, TokenBlacklist];

export const dataSourceOptions: DataSourceOptions = process.env.DATABASE_URL
  ? {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      entities,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: false,
    }
  : {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'attendance',
      password: process.env.DB_PASSWORD || 'attendance',
      database: process.env.DB_DATABASE || 'attendance',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      entities,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: false,
    };

export const AppDataSource = new DataSource(dataSourceOptions);
