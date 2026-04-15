/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { sign } from 'jsonwebtoken';
import { SessionsController } from './sessions.controller';
import { SessionsService, Session } from './sessions.service';
import { UserGuard } from '../auth/user.guard';

const JWT_SECRET = randomBytes(32).toString('hex');

const makeSession = (overrides?: Partial<Session>): Session => ({
  sessionId: 'match-1',
  userAId: 'user-a',
  userBId: 'user-b',
  matchId: 'match-1',
  topic: 'Arrays',
  question: null,
  whiteboardElements: [],
  code: '',
  language: 'python',
  revealedHints: 0,
  testCasesPassed: 0,
  status: 'active',
  createdAt: new Date(),
  ...overrides,
});

const makeReq = (userId: string, isAdmin = false) => ({
  user: { id: userId, isAdmin },
  headers: {
    authorization: `Bearer ${sign({ id: userId, isAdmin }, JWT_SECRET)}`,
  },
});

describe('SessionsController', () => {
  let controller: SessionsController;
  let mockService: jest.Mocked<
    Pick<
      SessionsService,
      'create' | 'findOne' | 'endSession' | 'getActiveSessionForUser'
    >
  >;

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      findOne: jest.fn(),
      endSession: jest.fn(),
      getActiveSessionForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        { provide: SessionsService, useValue: mockService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'JWT_SECRET') return JWT_SECRET;
              if (key === 'COLLAB_SERVICE_URL') return 'http://localhost:3003';
              return undefined;
            },
          },
        },
        UserGuard,
      ],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
  });

  // ── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('delegates to service.create and returns the result', async () => {
      const session = makeSession({ status: 'waiting' });
      mockService.create.mockResolvedValue(session);

      const result = await controller.create({
        userAId: 'user-a',
        userBId: 'user-b',
        matchId: 'match-1',
        topic: 'Arrays',
        userADifficulty: 'Easy',
        userBDifficulty: 'Medium',
      });

      expect(result).toEqual(session);
      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({ matchId: 'match-1', userAId: 'user-a' }),
      );
    });
  });

  // ── getActiveSession() ────────────────────────────────────────────────────

  describe('getActiveSession()', () => {
    it('throws NotFoundException when no active session exists for user', async () => {
      mockService.getActiveSessionForUser.mockResolvedValue(null);

      await expect(
        controller.getActiveSession(makeReq('user-a') as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns active session info when found', async () => {
      const info = {
        sessionId: 'match-1',
        otherUserId: 'user-b',
        questionId: 'q-1',
        language: 'python',
        remainingMs: 60_000,
        startedAt: new Date(),
      };
      mockService.getActiveSessionForUser.mockResolvedValue(info);

      const result = await controller.getActiveSession(
        makeReq('user-a') as any,
      );
      expect(result).toEqual(info);
    });
  });

  // ── findOne() ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('throws NotFoundException when session does not exist', () => {
      mockService.findOne.mockReturnValue(undefined);

      expect(() =>
        controller.findOne('match-1', makeReq('user-a') as any),
      ).toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requesting user is not a participant', () => {
      mockService.findOne.mockReturnValue(makeSession());

      expect(() =>
        controller.findOne('match-1', makeReq('outsider') as any),
      ).toThrow(ForbiddenException);
    });

    it('returns the session for userA', () => {
      const session = makeSession();
      mockService.findOne.mockReturnValue(session);

      const result = controller.findOne('match-1', makeReq('user-a') as any);
      expect(result).toEqual(session);
    });

    it('returns the session for userB', () => {
      const session = makeSession();
      mockService.findOne.mockReturnValue(session);

      const result = controller.findOne('match-1', makeReq('user-b') as any);
      expect(result).toEqual(session);
    });
  });

  // ── endSession() ──────────────────────────────────────────────────────────

  describe('endSession()', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockService.findOne.mockReturnValue(undefined);

      await expect(
        controller.endSession('match-1', makeReq('user-a') as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for a non-participant', async () => {
      mockService.findOne.mockReturnValue(makeSession());

      await expect(
        controller.endSession('match-1', makeReq('outsider') as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ends the session and returns the success payload', async () => {
      mockService.findOne.mockReturnValue(makeSession());
      mockService.endSession.mockResolvedValue(
        makeSession({ status: 'ended' }),
      );

      const result = await controller.endSession(
        'match-1',
        makeReq('user-a') as any,
      );
      expect(result).toEqual({
        message: 'Session ended',
        redirectUrl: '/homepage',
      });
      expect(mockService.endSession).toHaveBeenCalledWith('match-1');
    });
  });

  // ── rejoinSession() ───────────────────────────────────────────────────────

  describe('rejoinSession()', () => {
    it('throws NotFoundException when session does not exist', () => {
      mockService.findOne.mockReturnValue(undefined);

      expect(() =>
        controller.rejoinSession('match-1', makeReq('user-a') as any),
      ).toThrow(NotFoundException);
    });

    it('throws ForbiddenException for a non-participant', () => {
      mockService.findOne.mockReturnValue(makeSession());

      expect(() =>
        controller.rejoinSession('match-1', makeReq('outsider') as any),
      ).toThrow(ForbiddenException);
    });

    it('throws NotFoundException when session is not active (ended)', () => {
      mockService.findOne.mockReturnValue(makeSession({ status: 'ended' }));

      expect(() =>
        controller.rejoinSession('match-1', makeReq('user-a') as any),
      ).toThrow(NotFoundException);
    });

    it('throws NotFoundException when session is not active (waiting)', () => {
      mockService.findOne.mockReturnValue(makeSession({ status: 'waiting' }));

      expect(() =>
        controller.rejoinSession('match-1', makeReq('user-a') as any),
      ).toThrow(NotFoundException);
    });

    it('returns rejoin credentials for a valid active participant', () => {
      mockService.findOne.mockReturnValue(makeSession());
      const token = sign({ id: 'user-a', isAdmin: false }, JWT_SECRET);
      const req = {
        user: { id: 'user-a', isAdmin: false },
        headers: { authorization: `Bearer ${token}` },
      } as any;

      const result = controller.rejoinSession('match-1', req);
      expect(result).toMatchObject({
        sessionId: 'match-1',
        token,
        wsUrl: 'http://localhost:3003',
      });
    });
  });
});
