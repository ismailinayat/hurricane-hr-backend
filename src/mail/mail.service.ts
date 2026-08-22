import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { AppConfig } from '../config/configuration';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(configService: ConfigService) {
    const { mail } = configService.get<AppConfig>('app')!;
    this.from = mail.from;
    // Sends via Resend's HTTPS API rather than raw SMTP: some hosts (e.g.
    // Render) block or silently drop outbound SMTP ports, but a normal
    // HTTPS request to api.resend.com always goes through. `mail.password`
    // holds the Resend API key (same value previously used as the SMTP
    // password), so no env var changes are needed to switch transports.
    this.resend = mail.password ? new Resend(mail.password) : null;
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

    if (!this.resend) {
      this.logger.warn(
        `Resend API key is not configured — skipping send and logging the reset email instead. To: ${to}, Link: ${resetUrl}`,
      );
      return;
    }

    const { error } = await this.resend.emails.send({ from: this.from, to, subject, text, html });
    if (error) {
      throw new Error(`Resend API error: ${error.name} - ${error.message}`);
    }
  }
}
