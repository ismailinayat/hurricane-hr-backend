import { Role } from '../../common/enums/role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  jti: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  jti: string;
}
