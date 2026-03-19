import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    isAdmin: boolean;
  };
};

/**
 * Guard that ensures the requesting user is authenticated.
 * Validates the JWT locally without requiring admin privileges.
 */
@Injectable()
export class UserGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

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
      const payload = jwt.verify(token, secret) as { id: string; isAdmin: boolean };
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}