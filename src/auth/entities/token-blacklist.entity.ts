import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * JWTs are stateless, so "logout" is implemented by denylisting the token's
 * jti until its natural expiry. JwtStrategy rejects any jti found here.
 */
@Entity('token_blacklist')
export class TokenBlacklist extends BaseEntity {
  @Index({ unique: true })
  @Column({ unique: true })
  jti: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
