/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { randomBytes } from 'crypto';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserGuard } from '../src/auth/user.guard';
import { SessionsController } from '../src/sessions/sessions.controller';
import { SessionsService } from '../src/sessions/sessions.service';

jest.mock('ioredis', () =>
  jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    keys: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
    xadd: jest.fn().mockResolvedValue('stream-message-1'),
    disconnect: jest.fn(),
  })),
);

const JWT_SECRET = randomBytes(32).toString('hex');

describe('collaboration-service integration', () => {
  let app: INestApplication<App>;
  let sessionsService: SessionsService;

  const userAToken = sign({ id: 'user-a', isAdmin: false }, JWT_SECRET);
  const userBToken = sign({ id: 'user-b', isAdmin: false }, JWT_SECRET);
  const outsiderToken = sign({ id: 'outsider', isAdmin: false }, JWT_SECRET);
  const adminToken = sign({ id: 'admin', isAdmin: true }, JWT_SECRET);

  beforeEach(async () => {
    const configService = {
      get: (key: string) => {
        if (key === 'JWT_SECRET') return JWT_SECRET;
        if (key === 'QUESTION_TIMEOUT_MS') return 60000;
        return undefined;
      },
    };
    const nullQuery = Object.assign(Promise.resolve(null), {
      lean: () => Promise.resolve(null),
    });
    const sessionStateModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockReturnValue(nullQuery),
      find: jest.fn().mockResolvedValue([]),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        UserGuard,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: SessionsService,
          useFactory: () => {
            const service = new SessionsService(
              configService as ConfigService,
              sessionStateModel as never,
            );
            service.onModuleInit = jest.fn();
            return service;
          },
        },
      ],
    }).compile();

    sessionsService = moduleFixture.get<SessionsService>(SessionsService);
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const createSession = () =>
    sessionsService.create({
      userAId: 'user-a',
      userBId: 'user-b',
      matchId: 'match-1',
      topic: 'Arrays',
      userADifficulty: 'Easy',
      userBDifficulty: 'Medium',
    });

  it('creates a collaboration session from a match handoff payload', async () => {
    const session = await createSession();

    expect(session).toMatchObject({
      sessionId: 'match-1',
      userAId: 'user-a',
      userBId: 'user-b',
      matchId: 'match-1',
      topic: 'Arrays',
      status: 'waiting',
      question: null,
      whiteboardElements: [],
      code: '',
      language: 'python',
    });
  });

  it('requires a valid non-admin participant token to fetch a session', async () => {
    await createSession();

    await request(app.getHttpServer()).get('/sessions/match-1').expect(401);

    await request(app.getHttpServer())
      .get('/sessions/match-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/sessions/match-1')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);

    const participant = await request(app.getHttpServer())
      .get('/sessions/match-1')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(participant.body.sessionId).toBe('match-1');
  });

  it('allows a participant to end a session and prevents later access', async () => {
    await createSession();

    await request(app.getHttpServer())
      .post('/sessions/match-1/end')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          message: 'Session ended',
          redirectUrl: '/homepage',
        });
      });

    await request(app.getHttpServer())
      .get('/sessions/match-1')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(404);
  });
});
