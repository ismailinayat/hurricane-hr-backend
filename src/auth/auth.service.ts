import { randomBytes, randomUUID, createHash } from 'crypto';
import { BadRequestException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AppConfig } from '../config/configuration';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/enums/error-code.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { parseDurationToMs } from '../common/utils/date.util';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_ROUNDS = 10;

export interface LoginResult {
  accessToken: string;
  user: Pick<User, 'id' | 'email' | 'role'>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(TokenBlacklist)
    private readonly tokenBlacklistRepository: Repository<TokenBlacklist>,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new AppException(
        'Invalid email or password',
        ErrorCode.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppException(
        'Invalid email or password',
        ErrorCode.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        'This account has been deactivated',
        ErrorCode.ACCOUNT_INACTIVE,
        HttpStatus.FORBIDDEN,
      );
    }

    const accessToken = this.signToken(user);
    return { accessToken, user: { id: user.id, email: user.email, role: user.role } };
  }

  async logout(jti: string, expiresAt: Date): Promise<void> {
    await this.tokenBlacklistRepository.save(
      this.tokenBlacklistRepository.create({ jti, expiresAt }),
    );
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new AppException(
        'Current password is incorrect',
        ErrorCode.INVALID_CURRENT_PASSWORD,
        HttpStatus.BAD_REQUEST,
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersService.save(user);
  }

  /**
   * Always resolves successfully, whether or not the email exists, so
   * enumeration attacks cannot distinguish registered from unregistered
   * accounts.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const { passwordReset, frontendUrl } = this.configService.get<AppConfig>('app')!;
    const expiresAt = new Date(Date.now() + parseDurationToMs(passwordReset.expiration));

    await this.resetTokenRepository.save(
      this.resetTokenRepository.create({ userId: user.id, tokenHash, expiresAt, used: false }),
    );

    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const resetToken = await this.resetTokenRepository.findOne({ where: { tokenHash } });

    if (!resetToken || resetToken.used) {
      throw new AppException(
        'Invalid or expired reset token',
        ErrorCode.INVALID_RESET_TOKEN,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (resetToken.expiresAt.getTime() < Date.now()) {
      throw new AppException(
        'Reset token has expired',
        ErrorCode.RESET_TOKEN_EXPIRED,
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.usersService.findById(resetToken.userId);
    if (!user) {
      throw new AppException(
        'Invalid or expired reset token',
        ErrorCode.INVALID_RESET_TOKEN,
        HttpStatus.BAD_REQUEST,
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersService.save(user);

    resetToken.used = true;
    await this.resetTokenRepository.save(resetToken);
  }

  async me(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  decodeExpiry(token: string): Date {
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;
    if (!decoded?.exp) {
      throw new BadRequestException('Invalid token');
    }
    return new Date(decoded.exp * 1000);
  }

  private signToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: randomUUID(),
    };
    return this.jwtService.sign(payload);
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
