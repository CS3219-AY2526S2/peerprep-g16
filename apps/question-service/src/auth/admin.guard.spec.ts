import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

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
   * Creates a mock ConfigService that returns a predefined USER_SERVICE_URL.
   * This allows tests to control the authentication service endpoint without
   * relying on environment variables.
   *
   * @param userServiceUrl - base URL of the user-service
   * @returns mocked ConfigService
   */
  const createConfigService = (userServiceUrl?: string): ConfigService =>
    ({
      get: jest.fn().mockReturnValue(userServiceUrl),
    }) as unknown as ConfigService;

  /**
   * Reset all mocked functions before each test case to prevent state leakage
   * between tests.
   */
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Ensures that requests without an Authorization header are rejected.
   * The guard should immediately throw an UnauthorizedException.
   */
  it('rejects requests without an authorization header', async () => {
    const guard = new AdminGuard(createConfigService('http://user-service:3000'));
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
    const guard = new AdminGuard(createConfigService('http://user-service:3000'));
    const request = getRequest();

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: '1',
          username: 'admin',
          email: 'admin@example.com',
          isAdmin: true,
        },
      }),
    } as Response);

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);

    expect(request.user).toEqual({
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      isAdmin: true,
    });
  });

  /**
   * Ensures that authenticated users without admin privileges are rejected.
   * The guard should throw a ForbiddenException.
   */
  it('rejects authenticated non-admin users', async () => {
    const guard = new AdminGuard(createConfigService('http://user-service:3000'));

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: '2',
          username: 'user',
          email: 'user@example.com',
          isAdmin: false,
        },
      }),
    } as Response);

    await expect(
      guard.canActivate(createExecutionContext(getRequest())),
    ).rejects.toThrow(ForbiddenException);
  });

  /**
   * Ensures that invalid or expired tokens result in authentication failure.
   * The guard should throw an UnauthorizedException.
   */
  it('rejects invalid tokens', async () => {
    const guard = new AdminGuard(createConfigService('http://user-service:3000'));

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    await expect(
      guard.canActivate(createExecutionContext(getRequest())),
    ).rejects.toThrow(UnauthorizedException);
  });

  /**
   * Ensures that the guard throws an error when USER_SERVICE_URL
   * is not configured.
   */
  it('throws an error when USER_SERVICE_URL is not configured', async () => {
    const guard = new AdminGuard(createConfigService());

    await expect(
      guard.canActivate(createExecutionContext(getRequest())),
    ).rejects.toThrow('USER_SERVICE_URL not configured');
  });

  /**
   * Ensures that a non-OK response from the authentication service
   * results in a ServiceUnavailableException.
   */
  it('returns service unavailable when the auth service responds with a non-OK status', async () => {
    const guard = new AdminGuard(createConfigService('http://user-service:3000'));

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(
      guard.canActivate(createExecutionContext(getRequest())),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  /**
   * Ensures that network errors during token verification
   * result in a ServiceUnavailableException.
   */
  it('returns service unavailable when fetch throws a network error', async () => {
    const guard = new AdminGuard(createConfigService('http://user-service:3000'));

    jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('network unavailable'));

    await expect(
      guard.canActivate(createExecutionContext(getRequest())),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});