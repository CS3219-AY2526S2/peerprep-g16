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

/**
 * Extended Express request type that includes authenticated user information.
 * The user field is populated after successful authentication and authorization.
 */
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
  };
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
 * This guard validates the Authorization header by calling the user-service
 * `/auth/verify-token` endpoint. If the token is valid and the user has
 * `isAdmin = true`, the request is allowed to proceed.
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
   * The guard extracts the Authorization header and attempts to validate the
   * token against one of several possible user-service endpoints.
   *
   * If the token is valid and the user has admin privileges, the user payload
   * is attached to the request object and access is granted.
   *
   * @param context - NestJS execution context containing request information
   * @returns true if the user is authenticated and authorized
   * @throws UnauthorizedException if authentication fails
   * @throws ForbiddenException if the user is not an admin
   * @throws ServiceUnavailableException if the authentication service cannot be reached
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Authentication failed');
    }

    const verifyTokenUrl = this.getVerifyTokenUrl();

    try {
      const response = await fetch(verifyTokenUrl, {
        method: 'GET',
        headers: {
          authorization,
        },
      });

      if (response.status === 401) {
        throw new UnauthorizedException('Authentication failed');
      }

      if (!response.ok) {
        throw new ServiceUnavailableException(
          'Authentication service unavailable',
        );
      }

      const payload = (await response.json()) as VerifyTokenResponse;

      if (!payload.data?.isAdmin) {
        throw new ForbiddenException(
          'Not authorized to access this resource',
        );
      }

      request.user = payload.data;
      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
    }

    throw new ServiceUnavailableException('Authentication service unavailable');
  }

  /**
   * Returns the configured user-service token verification endpoint.
   *
   * @returns Fully-qualified verification endpoint URL
   * @throws Error if USER_SERVICE_URL is not configured
   */
  private getVerifyTokenUrl(): string {
  const baseUrl = this.configService.get<string>('USER_SERVICE_URL');

    if (!baseUrl) {
      throw new Error('USER_SERVICE_URL not configured');
    }

    return `${baseUrl}/auth/verify-token`;
  }
}
