import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

type AuthenticatedRequest = Request & {
    user?: { id: string; isAdmin: boolean };
};

/**
 * Guard that validates the JWT and ensures the user is not an admin.
 * Used on all collab service endpoints called by the frontend.
 */
@Injectable()
export class UserGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const authorization = request.headers.authorization;

        if (!authorization?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Authentication failed');
        }

        const token = authorization.split(' ')[1];
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET not configured');

        try {
            const payload = jwt.verify(token, secret) as { id: string; isAdmin: boolean };

            if (payload.isAdmin) {
                throw new ForbiddenException('Admins cannot access collaboration sessions');
            }

            request.user = payload;
            return true;
        } catch (error) {
            if (error instanceof ForbiddenException) throw error;
            throw new UnauthorizedException('Authentication failed');
        }
    }
}