import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { PrivilegeRevocationService } from './privilege-revocation.service';

/**
 * Express request type extended with authenticated user context.
 *
 * The guard populates `request.user` after successful token verification.
 */
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    isAdmin: boolean;
  };
};

/**
 * Expected JWT payload shape used by this service.
 *
 * `iat` and `exp` are standard JWT claims returned by `jsonwebtoken`.
 */
type JwtPayload = {
  id: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
};

/**
 * Guard that ensures the requester is authenticated with a valid, non-revoked token.
 *
 * Validation steps:
 * 1. Extract Bearer token from the Authorization header
 * 2. Verify JWT signature and expiry locally
 * 3. Reject tokens invalidated by a privilege-change event
 * 4. Attach the authenticated user to `request.user`
 */
@Injectable()
export class UserGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly privilegeRevocationService: PrivilegeRevocationService,
  ) {}

  /**
   * Determines whether the current HTTP request may proceed.
   *
   * @param context Nest execution context containing the current request
   * @returns `true` when the request is authenticated
   * @throws UnauthorizedException when the token is missing, invalid, expired,
   * or revoked due to a privilege change
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
      const payload = jwt.verify(token, secret) as JwtPayload;
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

      request.user = {
        id: payload.id,
        isAdmin: payload.isAdmin,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      
      throw new UnauthorizedException('Authentication failed');
    }
  }
}