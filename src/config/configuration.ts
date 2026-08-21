export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
  database: {
    url?: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: boolean;
  };
  jwt: {
    secret: string;
    expiration: string;
  };
  passwordReset: {
    expiration: string;
  };
  throttle: {
    ttl: number;
    limit: number;
  };
  seed: {
    adminEmail: string;
    adminPassword: string;
  };
  mail: {
    host?: string;
    port: number;
    secure: boolean;
    user?: string;
    password?: string;
    from: string;
  };
  frontendUrl: string;
}

export default (): { app: AppConfig } => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4010', 10),
    corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map((o) => o.trim()),
    database: {
      url: process.env.DATABASE_URL,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'attendance',
      password: process.env.DB_PASSWORD || 'attendance',
      database: process.env.DB_DATABASE || 'attendance',
      ssl: process.env.DB_SSL === 'true',
    },
    jwt: {
      secret: process.env.JWT_SECRET as string,
      expiration: process.env.JWT_EXPIRATION || '1h',
    },
    passwordReset: {
      expiration: process.env.PASSWORD_RESET_EXPIRATION || '15m',
    },
    throttle: {
      ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
    },
    seed: {
      adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
      adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
    },
    mail: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.MAIL_FROM || 'Attendance <no-reply@attendance.local>',
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4020',
  },
});
