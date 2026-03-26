import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AdminGuard } from './admin.guard';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  TokenExpiredError: class TokenExpiredError extends Error {
    expiredAt: Date;

    constructor(message: string, expiredAt: Date) {
      super(message);
      this.name = 'TokenExpiredError';
      this.expiredAt = expiredAt;
    }
  },
}));

describe('AdminGuard', () => {
  /**
   * Creates a mock HTTP request containing a valid authorization header.
   * This simulates a request coming from a client that includes a JWT token.
   */
  const getRequest = () =>
    ({
      headers: {
        authorization: 'Bearer token',
      },
    }) as any;

  /**
   * Creates a mock NestJS ExecutionContext containing the provided request.
   * Guards receive the ExecutionContext during request processing, so this
   * helper simulates the framework behavior during testing.
   *
   * @param request - mock HTTP request object
   * @returns mocked ExecutionContext
   */
  const createExecutionContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  /**
   * Creates a mock ConfigService that returns a predefined JWT_SECRET.
   *
   * @param jwtSecret - shared JWT secret used for token verification
   * @returns mocked ConfigService
   */
  const createConfigService = (jwtSecret?: string): ConfigService =>
    ({
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return jwtSecret;
        return undefined;
      }),
    }) as unknown as ConfigService;

  /**
   * Reset all mocked functions before each test case to prevent state leakage
   * between tests.
   */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Ensures that requests without an Authorization header are rejected.
   * The guard should immediately throw an UnauthorizedException.
   */
  it('rejects requests without an authorization header', async () => {
    const guard = new AdminGuard(createConfigService('secret'));
    const request = { headers: {} };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toThrow(UnauthorizedException);
  });

  /**
   * Ensures that valid admin users are allowed to proceed.
   * The guard should attach the verified user payload to the request object.
   */
  it('allows admin users and stores the verified user on the request', async () => {
    const guard = new AdminGuard(createConfigService('secret'));
    const request = getRequest();

    (jwt.verify as jest.Mock).mockReturnValue({
      id: '1',
      isAdmin: true,
    });

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);

    expect(request.user).toEqual({
      id: '1',
      isAdmin: true,
    });
  });

  /**
   * Ensures that authenticated users without admin privileges are rejected.
   * The guard should throw a ForbiddenException.
   */
  it('rejects authenticated non-admin users', async () => {
    const guard = new AdminGuard(createConfigService('secret'));

    (jwt.verify as jest.Mock).mockReturnValue({
      id: '2',
      isAdmin: false,
    } as any);

    await expect(
      guard.canActivate(createExecutionContext(getRequest())),
    ).rejects.toThrow(ForbiddenException);
  });

  /**
   * Ensures that invalid or expired tokens result in authentication failure.
   * The guard should throw an UnauthorizedException.
   */
  it('rejects invalid tokens', async () => {
    const guard = new AdminGuard(createConfigService('secret'));

    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid token');
    });


    await expect(
      guard.canActivate(createExecutionContext(getRequest())),
    ).rejects.toThrow(UnauthorizedException);
  });

  /**
   * Ensures that the guard throws an error when JWT_SECRET
   * is not configured.
   */
  it('throws an error when JWT_SECRET is not configured', async () => {
    const guard = new AdminGuard(createConfigService());

    await expect(
      guard.canActivate(createExecutionContext(getRequest())),
    ).rejects.toThrow('JWT_SECRET not configured');
  });

  /**
   * Ensures that expired tokens result in authentication failure.
   * The guard should throw an UnauthorizedException.
   */
  it('rejects expired tokens', async () => {
    const guard = new AdminGuard(createConfigService('secret'));

    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new jwt.TokenExpiredError('jwt expired', new Date());
    });

    await expect(
      guard.canActivate(createExecutionContext(getRequest())),
    ).rejects.toThrow(UnauthorizedException);
  });
});