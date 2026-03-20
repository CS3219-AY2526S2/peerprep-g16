import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

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

/**
 * Expected structure of the decoded JWT payload.
 */
type JwtPayload = {
  id: string;
  isAdmin: boolean;
};

/**
 * Expected structure of the response returned by the user-service
 * when verifying a token.
 */
type VerifyTokenResponse = {
  data?: {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
  };
};

/**
 * Guard that ensures the requesting user is authenticated and has admin privileges.
 *
 * This guard validates the Authorization header by verifying the JWT locally
 * using the shared JWT_SECRET, without making any network calls to user-service.
 * If the token is valid and the user has `isAdmin = true`, the request proceeds.
 *
 * The verified user information is attached to `request.user` so that downstream
 * controllers or services can access the authenticated user context.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Determines whether the current request is allowed to proceed.
   *
   * Extracts the Bearer token from the Authorization header, verifies its
   * signature and expiry locally, then checks for admin privileges.
   *
   * @param context - NestJS execution context containing request information
   * @returns true if the user is authenticated and is an admin
   * @throws UnauthorizedException if the token is missing, invalid, or expired
   * @throws ForbiddenException if the user is not an admin
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
      const payload = jwt.verify(token, secret) as JwtPayload;

      if (!payload.isAdmin) {
        throw new ForbiddenException('Not authorized to access this resource');
      }

      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
