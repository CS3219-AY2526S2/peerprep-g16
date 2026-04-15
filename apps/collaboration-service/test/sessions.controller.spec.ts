/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SessionsController } from '../src/sessions/sessions.controller';
import { ConfigService } from '@nestjs/config';
import {
  SessionsService,
  Question,
  Session,
} from '../src/sessions/sessions.service';
import { UserGuard } from '../src/auth/user.guard';

const makeQuestion = (overrides: Partial<Question> = {}): Question => ({
  questionId: 'two-sum',
  title: 'Two Sum',
  topic: ['Arrays'],
  difficulty: 'Easy',
  description: 'Find two numbers that add up to target.',
  constraints: ['2 <= nums.length <= 10^4'],
  examples: [],
  hints: ['Use a hash map.'],
  testCases: {
    sample: [{ input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' }],
    hidden: [],
  },
  ...overrides,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    sessionId: 'session-1',
    userAId: 'user-a',
    userBId: 'user-b',
    matchId: 'session-1',
    topic: 'Arrays',
    question: makeQuestion(),
    whiteboardElements: [],
    code: 'print(1)',
    language: 'python',
    revealedHints: 0,
    testCasesPassed: 2,
    status: 'active',
    createdAt: new Date(),
    ...overrides,
  };
}

// Bypass JWT guard for controller unit tests
const mockUserGuard = { canActivate: jest.fn().mockReturnValue(true) };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SessionsController', () => {
  let app: INestApplication;
  let sessionsService: jest.Mocked<SessionsService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<SessionsService>> = {
      findOne: jest.fn(),
      endSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        { provide: SessionsService, useValue: mockService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'COLLAB_SERVICE_URL' ? 'http://localhost:3003' : undefined,
          },
        },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue(mockUserGuard)
      .compile();

    app = module.createNestApplication();
    // Attach a mock user to every request (simulates a valid JWT)
    app.use((req: any, _res: any, next: any) => {
      req.user = { id: 'user-a', isAdmin: false };
      next();
    });
    await app.init();

    sessionsService = module.get(SessionsService);
  });

  afterEach(async () => {
    await app.close();
  });

  // ─── GET /sessions/:id ─────────────────────────────────────────────────────

  describe('GET /sessions/:id', () => {
    it('returns the session for an authorised user', async () => {
      sessionsService.findOne.mockReturnValue(makeSession());

      const res = await request(app.getHttpServer())
        .get('/sessions/session-1')
        .expect(200);

      expect(res.body.sessionId).toBe('session-1');
      expect(res.body.code).toBe('print(1)');
    });

    it('returns 404 when session does not exist', async () => {
      sessionsService.findOne.mockReturnValue(undefined);

      await request(app.getHttpServer())
        .get('/sessions/no-such-session')
        .expect(404);
    });

    it('returns 403 when user is not part of the session', async () => {
      // session belongs to user-a and user-b, but request user is user-c
      sessionsService.findOne.mockReturnValue(
        makeSession({ userAId: 'user-x', userBId: 'user-y' }),
      );

      // Override the middleware user for this test
      const moduleRef = await Test.createTestingModule({
        controllers: [SessionsController],
        providers: [
          { provide: SessionsService, useValue: sessionsService },
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) =>
                key === 'COLLAB_SERVICE_URL'
                  ? 'http://localhost:3003'
                  : undefined,
            },
          },
        ],
      })
        .overrideGuard(UserGuard)
        .useValue(mockUserGuard)
        .compile();

      const altApp = moduleRef.createNestApplication();
      altApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'user-c', isAdmin: false };
        next();
      });
      await altApp.init();

      await request(altApp.getHttpServer())
        .get('/sessions/session-1')
        .expect(403);

      await altApp.close();
    });
  });

  // ─── POST /sessions/:id/end ────────────────────────────────────────────────

  describe('POST /sessions/:id/end', () => {
    it('ends the session and returns a redirect URL', async () => {
      sessionsService.findOne.mockReturnValue(makeSession());
      sessionsService.endSession.mockResolvedValue(
        makeSession({ status: 'ended' }),
      );

      const res = await request(app.getHttpServer())
        .post('/sessions/session-1/end')
        .expect(201);

      expect(res.body.message).toBe('Session ended');
      expect(res.body.redirectUrl).toBe('/homepage');
      expect(sessionsService.endSession).toHaveBeenCalledWith('session-1');
    });

    it('returns 404 when session does not exist', async () => {
      sessionsService.findOne.mockReturnValue(undefined);

      await request(app.getHttpServer())
        .post('/sessions/no-such-session/end')
        .expect(404);
    });

    it('returns 403 when user is not part of the session', async () => {
      sessionsService.findOne.mockReturnValue(
        makeSession({ userAId: 'user-x', userBId: 'user-y' }),
      );

      const moduleRef = await Test.createTestingModule({
        controllers: [SessionsController],
        providers: [
          { provide: SessionsService, useValue: sessionsService },
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) =>
                key === 'COLLAB_SERVICE_URL'
                  ? 'http://localhost:3003'
                  : undefined,
            },
          },
        ],
      })
        .overrideGuard(UserGuard)
        .useValue(mockUserGuard)
        .compile();

      const altApp = moduleRef.createNestApplication();
      altApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'user-c', isAdmin: false };
        next();
      });
      await altApp.init();

      await request(altApp.getHttpServer())
        .post('/sessions/session-1/end')
        .expect(403);

      await altApp.close();
    });
  });
});
