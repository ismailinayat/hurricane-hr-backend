import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AppConfig } from '../config/configuration';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(configService: ConfigService) {
    const { mail } = configService.get<AppConfig>('app')!;
    this.from = mail.from;

    this.transporter = mail.host
      ? nodemailer.createTransport({
          host: mail.host,
          port: mail.port,
          secure: mail.secure,
          auth: mail.user ? { user: mail.user, pass: mail.password } : undefined,
        })
      : null;
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const subject = 'Reset your password';
    const text = [
      'You requested a password reset.',
      `Open this link to choose a new password: ${resetUrl}`,
      'This link expires shortly and can only be used once.',
      "If you didn't request this, you can safely ignore this email.",
    ].join('\n\n');
    const html = `
      <p>You requested a password reset.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a></p>
      <p>Or copy this link into your browser: ${resetUrl}</p>
      <p>This link expires shortly and can only be used once.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `;

    if (!this.transporter) {
      this.logger.warn(
        `SMTP_HOST is not configured — skipping send and logging the reset email instead. To: ${to}, Link: ${resetUrl}`,
      );
      return;
    }

    await this.transporter.sendMail({ from: this.from, to, subject, text, html });
  }
}
