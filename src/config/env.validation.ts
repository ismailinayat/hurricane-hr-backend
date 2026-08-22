import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(4010),
  CORS_ORIGINS: Joi.string().default('*'),

  DATABASE_URL: Joi.string().optional(),
  DB_HOST: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_PASSWORD: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_DATABASE: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_SSL: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRATION: Joi.string().default('1h'),

  PASSWORD_RESET_EXPIRATION: Joi.string().default('15m'),

  SEED_ADMIN_EMAIL: Joi.string().email().default('admin@example.com'),
  SEED_ADMIN_PASSWORD: Joi.string().default('Admin@123'),

  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  MAIL_FROM: Joi.string().default('Attendance <no-reply@attendance.local>'),

  FRONTEND_URL: Joi.string().default('http://localhost:4020'),
});
