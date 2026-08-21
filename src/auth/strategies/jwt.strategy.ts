import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AppConfig } from '../../config/configuration';
import { UserStatus } from '../../common/enums/user-status.enum';
import { TokenBlacklist } from '../entities/token-blacklist.entity';
import { UsersService } from '../../users/users.service';
import { AuthenticatedUser, JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(TokenBlacklist)
    private readonly tokenBlacklistRepository: Repository<TokenBlacklist>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<AppConfig>('app')!.jwt.secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const blacklisted = await this.tokenBlacklistRepository.findOne({
      where: { jti: payload.jti },
    });
    if (blacklisted) {
      throw new UnauthorizedException('Session has been invalidated');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is inactive or no longer exists');
    }

    return { id: user.id, email: user.email, role: user.role, jti: payload.jti };
  }
}
