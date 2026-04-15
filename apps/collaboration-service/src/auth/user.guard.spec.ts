/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { sign } from 'jsonwebtoken';
import { UserGuard } from './user.guard';

const JWT_SECRET = randomBytes(32).toString('hex');

const makeContext = (
  headers: Record<string, string>,
  request?: Record<string, unknown>,
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers, ...request }),
    }),
  }) as unknown as ExecutionContext;

describe('UserGuard', () => {
  let guard: UserGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGuard,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'JWT_SECRET' ? JWT_SECRET : undefined,
          },
        },
      ],
    }).compile();

    guard = module.get<UserGuard>(UserGuard);
  });

  // ── Missing / malformed header ────────────────────────────────────────────

  it('throws UnauthorizedException when Authorization header is absent', () => {
    const ctx = makeContext({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when header does not start with "Bearer "', () => {
    const ctx = makeContext({ authorization: 'Basic dXNlcjpwYXNz' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  // ── Invalid token ─────────────────────────────────────────────────────────

  it('throws UnauthorizedException for a malformed token', () => {
    const ctx = makeContext({ authorization: 'Bearer not.a.real.token' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for a token signed with the wrong secret', () => {
    const wrongSecret = randomBytes(32).toString('hex');
    const token = sign({ id: 'user-x', isAdmin: false }, wrongSecret);
    const ctx = makeContext({ authorization: `Bearer ${token}` });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for an expired token', () => {
    const token = sign({ id: 'user-x', isAdmin: false }, JWT_SECRET, {
      expiresIn: -1,
    });
    const ctx = makeContext({ authorization: `Bearer ${token}` });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  // ── Admin token ───────────────────────────────────────────────────────────

  it('throws ForbiddenException for a valid admin token', () => {
    const token = sign({ id: 'admin-1', isAdmin: true }, JWT_SECRET);
    const ctx = makeContext({ authorization: `Bearer ${token}` });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  // ── Valid user token ──────────────────────────────────────────────────────

  it('returns true for a valid non-admin token', () => {
    const token = sign({ id: 'user-a', isAdmin: false }, JWT_SECRET);
    const req: Record<string, unknown> = {};
    const ctx = makeContext({ authorization: `Bearer ${token}` }, req);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('attaches decoded user payload to the request object', () => {
    const token = sign({ id: 'user-a', isAdmin: false }, JWT_SECRET);
    // Use `any` so TypeScript does not restrict property assignment at compile time.
    // toMatchObject because jsonwebtoken.verify adds `iat` to the decoded payload.
    const mockReq: any = { headers: { authorization: `Bearer ${token}` } };
    const ctx = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockReq),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
    expect(mockReq.user).toMatchObject({ id: 'user-a', isAdmin: false });
  });
});
