import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { 
  TokenExpiredError, 
  type JwtPayload as BaseJwtPayload, 
  verify,
} from 'jsonwebtoken';
import { PrivilegeRevocationService } from './privilege-revocation.service';

/**
 * Extended Express request type that includes authenticated user information.
 * The user field is populated after successful authentication and authorization.
 */
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    isAdmin: boolean;
  };
};

type AuthJwtPayload = BaseJwtPayload & {
  id: string;
  isAdmin: boolean;
};

/**
 * Narrows a decoded JWT value to the application-specific payload shape.
 *
 * `jsonwebtoken.verify` may return either a string or a generic payload object.
 * This guard ensures the decoded value includes the fields required by this
 * service before it is treated as an authenticated user token.
 *
 * @param value Decoded JWT value returned by `verify`
 * @returns `true` when the payload contains a string `id` and boolean `isAdmin`
 */
function isAuthJwtPayload(
  value: string | BaseJwtPayload,
): value is AuthJwtPayload {
  return (
    typeof value !== 'string' &&
    typeof value.id === 'string' &&
    typeof value.isAdmin === 'boolean'
  );
}

/**
 * Guard that ensures the requesting user is authenticated with a non-revoked 
 * token and has admin privileges.
 *
 * Validation step:
 * 1. Extract Bearer token from the Authorization header
 * 2. Verify JWT signature and expiry locally
 * 3. Reject tokens invalidated by a privilege-change event
 * 4. Enforce `isAdmin === true`
 * 5. Attach the authenticated user to `request.user`
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly privilegeRevocationService: PrivilegeRevocationService,
  ) {}

  /**
   * Determines whether the current HTTP request may proceed.
   *
   * @param context Nest execution context containing the current request
   * @returns `true` when the request is authenticated and authorized
   * @throws UnauthorizedException when the token is missing, invalid, expired,
   * or revoked due to a privilege change
   * @throws ForbiddenException when the user is authenticated but not an admin
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication failed');
    }

    const token = authorization.split(' ')[1];
    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    try {
      // Verifies signature and expiry locally — no call to user-service needed
      const decoded = verify(token, secret);

      if (!isAuthJwtPayload(decoded)) {
        throw new UnauthorizedException('Authentication failed');
      }

      const payload = decoded;

      const revoked = 
        await this.privilegeRevocationService.isTokenRevoked(
          payload.id,
          payload.iat,
        );
      
      if (revoked) {
        throw new UnauthorizedException({
          message: 'Privilege changed. Please log in again.',
          code: 'PRIVILEGE_CHANGED',
        });
      }

      if (!payload.isAdmin) {
        throw new ForbiddenException('Not authorized to access this resource');
      }

      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
