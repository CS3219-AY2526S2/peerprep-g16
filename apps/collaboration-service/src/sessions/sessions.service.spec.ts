/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { SessionsService, Question } from './sessions.service';
import { SessionState } from './session-state.schema';

jest.mock('ioredis', () =>
  jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    keys: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    xadd: jest.fn().mockResolvedValue('stream-id-1'),
    disconnect: jest.fn(),
  })),
);

const MOCK_QUESTION: Question = {
  questionId: 'q-1',
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
};

const SESSION_DATA = {
  userAId: 'user-a',
  userBId: 'user-b',
  matchId: 'match-1',
  topic: 'Arrays',
  userADifficulty: 'Easy' as string | null,
  userBDifficulty: 'Medium' as string | null,
};

describe('SessionsService', () => {
  let service: SessionsService;
  let mockModel: {
    findOneAndUpdate: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    mockModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockReturnValue({ lean: () => Promise.resolve(null) }),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'REDIS_URL') return 'redis://localhost:6379';
              if (key === 'QUESTION_TIMEOUT_MS') return 60_000;
              return undefined;
            },
          },
        },
        {
          provide: getModelToken(SessionState.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    // Skip real Redis/Mongo init
    jest.spyOn(service, 'onModuleInit').mockResolvedValue(undefined);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  // ── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('returns a session with status "waiting" and correct fields', async () => {
      const session = await service.create(SESSION_DATA);

      expect(session.sessionId).toBe('match-1');
      expect(session.userAId).toBe('user-a');
      expect(session.userBId).toBe('user-b');
      expect(session.matchId).toBe('match-1');
      expect(session.topic).toBe('Arrays');
      expect(session.status).toBe('waiting');
      expect(session.question).toBeNull();
      expect(session.code).toBe('');
      expect(session.language).toBe('python');
      expect(session.whiteboardElements).toEqual([]);
      expect(session.revealedHints).toBe(0);
      expect(session.testCasesPassed).toBe(0);
    });

    it('stores the session so findOne can retrieve it', async () => {
      const created = await service.create(SESSION_DATA);
      expect(service.findOne('match-1')).toBe(created);
    });

    it('creates distinct sessions for different matchIds', async () => {
      await service.create({ ...SESSION_DATA, matchId: 'match-a' });
      await service.create({ ...SESSION_DATA, matchId: 'match-b' });
      expect(service.findOne('match-a')).toBeDefined();
      expect(service.findOne('match-b')).toBeDefined();
    });
  });

  // ── findOne() ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns undefined for an unknown sessionId', () => {
      expect(service.findOne('nonexistent')).toBeUndefined();
    });

    it('returns the session after creation', async () => {
      await service.create(SESSION_DATA);
      expect(service.findOne('match-1')).toBeDefined();
    });
  });

  // ── attachQuestion() ──────────────────────────────────────────────────────

  describe('attachQuestion()', () => {
    beforeEach(() => service.create(SESSION_DATA));

    it('sets question and transitions status to "active"', async () => {
      await service.attachQuestion('match-1', MOCK_QUESTION);
      const session = service.findOne('match-1');
      expect(session?.status).toBe('active');
      expect(session?.question).toEqual(MOCK_QUESTION);
    });

    it('emits "questionReady" to the socket room', async () => {
      const mockEmit = jest.fn();
      const mockIo = {
        to: jest.fn().mockReturnValue({ emit: mockEmit }),
      } as any;
      service.setServer(mockIo);

      await service.attachQuestion('match-1', MOCK_QUESTION);

      expect(mockIo.to).toHaveBeenCalledWith('match-1');
      expect(mockEmit).toHaveBeenCalledWith('questionReady', {
        question: MOCK_QUESTION,
      });
    });

    it('throws when session does not exist', async () => {
      await expect(
        service.attachQuestion('no-such', MOCK_QUESTION),
      ).rejects.toThrow('Session not found: no-such');
    });
  });

  // ── updateWhiteboard() ────────────────────────────────────────────────────

  describe('updateWhiteboard()', () => {
    it('replaces whiteboard elements', async () => {
      await service.create(SESSION_DATA);
      const elements = [{ id: 1, type: 'rect' }];
      service.updateWhiteboard('match-1', elements);
      expect(service.findOne('match-1')?.whiteboardElements).toEqual(elements);
    });

    it('is a no-op for an unknown session', () => {
      expect(() => service.updateWhiteboard('nope', [])).not.toThrow();
    });
  });

  // ── updateCode() ──────────────────────────────────────────────────────────

  describe('updateCode()', () => {
    beforeEach(() => service.create(SESSION_DATA));

    it('updates both code and language', () => {
      service.updateCode('match-1', 'print("hi")', 'python');
      const s = service.findOne('match-1')!;
      expect(s.code).toBe('print("hi")');
      expect(s.language).toBe('python');
    });

    it('updates code without changing language when language is omitted', () => {
      service.updateCode('match-1', 'console.log(1)');
      expect(service.findOne('match-1')?.language).toBe('python');
    });

    it('changes language when provided', () => {
      service.updateCode('match-1', 'int x = 0;', 'java');
      expect(service.findOne('match-1')?.language).toBe('java');
    });
  });

  // ── updateRevealedHints() ─────────────────────────────────────────────────

  describe('updateRevealedHints()', () => {
    it('sets the revealed hint count', async () => {
      await service.create(SESSION_DATA);
      service.updateRevealedHints('match-1', 2);
      expect(service.findOne('match-1')?.revealedHints).toBe(2);
    });

    it('is a no-op for an unknown session', () => {
      expect(() => service.updateRevealedHints('nope', 1)).not.toThrow();
    });
  });

  // ── updateTestCasesPassed() ───────────────────────────────────────────────

  describe('updateTestCasesPassed()', () => {
    it('sets the test cases passed count', async () => {
      await service.create(SESSION_DATA);
      service.updateTestCasesPassed('match-1', 3);
      expect(service.findOne('match-1')?.testCasesPassed).toBe(3);
    });

    it('is a no-op for an unknown session', () => {
      expect(() => service.updateTestCasesPassed('nope', 1)).not.toThrow();
    });
  });

  // ── setWhiteboardScreenshot() ─────────────────────────────────────────────

  describe('setWhiteboardScreenshot()', () => {
    it('stores the screenshot string', async () => {
      await service.create(SESSION_DATA);
      service.setWhiteboardScreenshot('match-1', 'data:image/png;base64,abc');
      expect(service.findOne('match-1')?.whiteboardScreenshot).toBe(
        'data:image/png;base64,abc',
      );
    });

    it('is a no-op for an unknown session', () => {
      expect(() =>
        service.setWhiteboardScreenshot('nope', 'img'),
      ).not.toThrow();
    });
  });

  // ── endSession() ──────────────────────────────────────────────────────────

  describe('endSession()', () => {
    beforeEach(async () => {
      await service.create(SESSION_DATA);
      await service.attachQuestion('match-1', MOCK_QUESTION);
    });

    it('marks the session as ended and removes it from memory', async () => {
      const result = await service.endSession('match-1');
      expect((result as any)?.status).toBe('ended');
      expect(service.findOne('match-1')).toBeUndefined();
    });

    it('returns undefined for a nonexistent session', async () => {
      expect(await service.endSession('nope')).toBeUndefined();
    });

    it('returns undefined when called a second time on the same session', async () => {
      await service.endSession('match-1');
      expect(await service.endSession('match-1')).toBeUndefined();
    });

    it('returns { blocked: true, reason: "redis_unavailable" } when Redis is down', async () => {
      jest.spyOn(service as any, 'isRedisHealthy').mockResolvedValue(false);

      const result = await service.endSession('match-1');
      expect(result).toEqual({ blocked: true, reason: 'redis_unavailable' });
      // Session stays in memory while blocked
      expect(service.findOne('match-1')).toBeDefined();
    });

    it('sets pendingEnd flag when blocked', async () => {
      jest.spyOn(service as any, 'isRedisHealthy').mockResolvedValue(false);
      await service.endSession('match-1');
      expect(service.findOne('match-1')?.pendingEnd).toBe(true);
    });

    it('bypasses Redis check when forceBypassRedis is true', async () => {
      jest.spyOn(service as any, 'isRedisHealthy').mockResolvedValue(false);
      const result = await service.endSession('match-1', {
        forceBypassRedis: true,
        suppressConfirmedEmit: true,
      });
      expect((result as any)?.status).toBe('ended');
    });
  });

  // ── onUserJoined() ────────────────────────────────────────────────────────

  describe('onUserJoined()', () => {
    it('does not throw when no idle timer exists', async () => {
      await service.create(SESSION_DATA);
      expect(() => service.onUserJoined('match-1')).not.toThrow();
    });

    it('cancels an active idle timer', async () => {
      await service.create(SESSION_DATA);
      // Start an idle timer by simulating an empty room
      const mockIo = {
        sockets: { adapter: { rooms: new Map() } }, // no sockets in room
      } as any;
      service.onUserLeft('match-1', mockIo);

      // Rejoin should cancel the timer without error
      expect(() => service.onUserJoined('match-1')).not.toThrow();
    });
  });

  // ── onUserLeft() ──────────────────────────────────────────────────────────

  describe('onUserLeft()', () => {
    it('does nothing when session does not exist', () => {
      const mockIo = { sockets: { adapter: { rooms: new Map() } } } as any;
      expect(() => service.onUserLeft('nope', mockIo)).not.toThrow();
    });

    it('does nothing when another user is still in the room', async () => {
      await service.create(SESSION_DATA);
      const room = new Set(['other-socket-id']);
      const mockIo = {
        sockets: { adapter: { rooms: new Map([['match-1', room]]) } },
      } as any;
      // Should start no idle timer — no error expected
      expect(() => service.onUserLeft('match-1', mockIo)).not.toThrow();
    });

    it('does nothing for an already-ended session', async () => {
      await service.create(SESSION_DATA);
      await service.attachQuestion('match-1', MOCK_QUESTION);
      jest.spyOn(service as any, 'isRedisHealthy').mockResolvedValue(true);
      await service.endSession('match-1', { suppressConfirmedEmit: true });

      const mockIo = { sockets: { adapter: { rooms: new Map() } } } as any;
      expect(() => service.onUserLeft('match-1', mockIo)).not.toThrow();
    });
  });

  // ── getActiveSessionForUser() ─────────────────────────────────────────────

  describe('getActiveSessionForUser()', () => {
    it('returns null when user has no session at all', async () => {
      const result = await service.getActiveSessionForUser('unknown-user');
      expect(result).toBeNull();
    });

    it('returns null for a waiting (not yet active) session', async () => {
      await service.create(SESSION_DATA);
      const result = await service.getActiveSessionForUser('user-a');
      expect(result).toBeNull();
    });

    it('returns active session info for userA', async () => {
      await service.create(SESSION_DATA);
      await service.attachQuestion('match-1', MOCK_QUESTION);

      const result = await service.getActiveSessionForUser('user-a');
      expect(result).not.toBeNull();
      expect(result?.sessionId).toBe('match-1');
      expect(result?.otherUserId).toBe('user-b');
      expect(result?.questionId).toBe('q-1');
      expect(result?.language).toBe('python');
    });

    it('returns active session info for userB with correct otherUserId', async () => {
      await service.create(SESSION_DATA);
      await service.attachQuestion('match-1', MOCK_QUESTION);

      const result = await service.getActiveSessionForUser('user-b');
      expect(result?.sessionId).toBe('match-1');
      expect(result?.otherUserId).toBe('user-a');
    });

    it('returns null after the session has ended', async () => {
      await service.create(SESSION_DATA);
      await service.attachQuestion('match-1', MOCK_QUESTION);
      await service.endSession('match-1', { suppressConfirmedEmit: true });

      const result = await service.getActiveSessionForUser('user-a');
      expect(result).toBeNull();
    });
  });
});
