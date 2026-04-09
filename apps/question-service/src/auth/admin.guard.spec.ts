import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenExpiredError, verify } from 'jsonwebtoken';
import { AdminGuard } from './admin.guard';


type MockUser = {
  id: string;
  isAdmin: boolean;
};

type MockRequest = {
  headers: {
    authorization?: string;
  };
  user?: MockUser;
};

type MockPrivilegeRevocationService = {
  isTokenRevoked: jest.Mock<Promise<boolean>, [string, number | undefined]>;
};

type MockJwtPayload = {
  id: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
};

const decodedToken: MockJwtPayload = {
  id: '1',
  isAdmin: true,
};

const mockedVerify = jest.mocked(verify);

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
   * Builds a minimal mock HTTP request containing a bearer token header.
   *
   * The returned object mirrors the subset of the Express request shape that the
   * guard reads and mutates during authentication.
   *
   * @returns Mock request object for guard unit tests
   */
  const getRequest = (): MockRequest => ({
    headers: {
      authorization: 'Bearer token',
    },
  });

  /**
   * Creates a mock Nest execution context that returns the supplied request.
   *
   * This allows the guard to be tested without bootstrapping the Nest runtime.
   *
   * @param request Mock HTTP request passed into the guard
   * @returns Mock execution context wrapping the request
   */
  const createExecutionContext = (request: MockRequest): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: <T>() => request as T,
      }),
    }) as ExecutionContext;

  /**
   * Creates a mock privilege revocation service for guard unit tests.
   *
   * By default, the mocked service treats tokens as still valid unless a test
   * overrides the return value.
   *
   * @returns Mocked privilege revocation service
   */
  const createPrivilegeRevocationService = (): MockPrivilegeRevocationService => ({
    isTokenRevoked: jest.fn().mockResolvedValue(false),
  });

  /**
   * Creates a mock config service that resolves the JWT secret used in tests.
   *
   * @param jwtSecret Shared secret returned when the guard requests `JWT_SECRET`
   * @returns Mocked config service instance
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
    const guard = new AdminGuard(
      createConfigService(),
      createPrivilegeRevocationService() as never,
    );
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
    const guard = new AdminGuard(
      createConfigService('secret'),
      createPrivilegeRevocationService() as never,
    );
    const request = getRequest();

    mockedVerify.mockReturnValue({
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
    const guard = new AdminGuard(
      createConfigService('secret'),
      createPrivilegeRevocationService() as never,
    );

    (mockedVerify).mockReturnValue({
      id: '2',
      isAdmin: false,
    });

    await expect(
      guard.canActivate(createExecutionContext(getRequest())),
    ).rejects.toThrow(ForbiddenException);
  });

  /**
   * Ensures that invalid or expired tokens result in authentication failure.
   * The guard should throw an UnauthorizedException.
   */
  it('rejects invalid tokens', async () => {
    const guard = new AdminGuard(
      createConfigService('secret'),
      createPrivilegeRevocationService() as never,
    );

    (mockedVerify).mockImplementation(() => {
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
    const guard = new AdminGuard(
      createConfigService('secret'),
      createPrivilegeRevocationService() as never,
    );

    await expect(
      guard.canActivate(createExecutionContext(getRequest())),
    ).rejects.toThrow('Authentication failed');
  });

  /**
   * Ensures that expired tokens result in authentication failure.
   * The guard should throw an UnauthorizedException.
   */
  it('rejects expired tokens', async () => {
    const guard = new AdminGuard(
      createConfigService('secret'),
      createPrivilegeRevocationService() as never,
    );

    (mockedVerify).mockImplementation(() => {
      throw new TokenExpiredError('jwt expired', new Date());
    });

    await expect(
      guard.canActivate(createExecutionContext(getRequest())),
    ).rejects.toThrow(UnauthorizedException);
  });
});