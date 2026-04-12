import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SessionsService } from '../src/sessions/sessions.service';

// ─── Redis mock ───────────────────────────────────────────────────────────────

const redisMock = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    xadd: jest.fn().mockResolvedValue('stream-id'),
    on: jest.fn(),
};

jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => redisMock);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSessionData(overrides: Partial<{
    userAId: string;
    userBId: string;
    matchId: string;
    topic: string;
    userADifficulty: string | null;
    userBDifficulty: string | null;
}> = {}) {
    return {
        userAId: 'user-a',
        userBId: 'user-b',
        matchId: 'match-123',
        topic: 'Arrays',
        userADifficulty: null,
        userBDifficulty: null,
        ...overrides,
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SessionsService', () => {
    let service: SessionsService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionsService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            const config: Record<string, string | number> = {
                                REDIS_URL: 'redis://localhost:6379',
                                JWT_SECRET: 'test-secret',
                                QUESTION_TIMEOUT_MS: 99999, // prevent fallback from firing during tests
                            };
                            return config[key];
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<SessionsService>(SessionsService);
        // Skip Redis connection in tests
        await service.onModuleInit();
    });

    afterEach(async () => {
        await service.onModuleDestroy();
    });

    // ─── create ───────────────────────────────────────────────────────────────

    describe('create', () => {
        it('creates a session with waiting status and default fields', async () => {
            const data = makeSessionData();
            const session = await service.create(data);

            expect(session.sessionId).toBe('match-123');
            expect(session.userAId).toBe('user-a');
            expect(session.userBId).toBe('user-b');
            expect(session.status).toBe('waiting');
            expect(session.code).toBe('');
            expect(session.language).toBe('python');
            expect(session.revealedHints).toBe(0);
            expect(session.testCasesPassed).toBe(0);
            expect(session.question).toBeNull();
            expect(session.whiteboardElements).toEqual([]);
        });

        it('persists session to Redis immediately on creation', async () => {
            await service.create(makeSessionData());
            expect(redisMock.set).toHaveBeenCalledWith(
                'collab:session:match-123',
                expect.stringContaining('"sessionId":"match-123"'),
            );
        });

        it('makes the session findable after creation', async () => {
            await service.create(makeSessionData());
            const found = service.findOne('match-123');
            expect(found).toBeDefined();
            expect(found?.sessionId).toBe('match-123');
        });

        it('returns undefined for a non-existent session', () => {
            const found = service.findOne('does-not-exist');
            expect(found).toBeUndefined();
        });
    });

    // ─── attachQuestion ───────────────────────────────────────────────────────

    describe('attachQuestion', () => {
        const mockQuestion = {
            questionId: 'two-sum',
            title: 'Two Sum',
            topic: ['Arrays'],
            difficulty: 'Easy',
        };

        it('sets question and transitions status to active', async () => {
            await service.create(makeSessionData());
            await service.attachQuestion('match-123', mockQuestion);

            const session = service.findOne('match-123');
            expect(session?.question).toEqual(mockQuestion);
            expect(session?.status).toBe('active');
        });

        it('flushes to Redis after attaching a question', async () => {
            await service.create(makeSessionData());
            redisMock.set.mockClear();

            await service.attachQuestion('match-123', mockQuestion);
            expect(redisMock.set).toHaveBeenCalledWith(
                'collab:session:match-123',
                expect.stringContaining('"status":"active"'),
            );
        });

        it('throws if session does not exist', async () => {
            await expect(
                service.attachQuestion('no-such-session', mockQuestion),
            ).rejects.toThrow('Session not found: no-such-session');
        });
    });

    // ─── updateCode ───────────────────────────────────────────────────────────

    describe('updateCode', () => {
        it('updates code on the session', async () => {
            await service.create(makeSessionData());
            service.updateCode('match-123', 'print("hello")', 'python');

            const session = service.findOne('match-123');
            expect(session?.code).toBe('print("hello")');
            expect(session?.language).toBe('python');
        });

        it('updates language when provided', async () => {
            await service.create(makeSessionData());
            service.updateCode('match-123', 'console.log(1)', 'javascript');

            expect(service.findOne('match-123')?.language).toBe('javascript');
        });

        it('does not change language when not provided', async () => {
            await service.create(makeSessionData());
            service.updateCode('match-123', 'some code');

            expect(service.findOne('match-123')?.language).toBe('python');
        });

        it('does nothing for a non-existent session', () => {
            expect(() => service.updateCode('ghost', 'code')).not.toThrow();
        });
    });

    // ─── updateRevealedHints ──────────────────────────────────────────────────

    describe('updateRevealedHints', () => {
        it('updates the revealed hints count', async () => {
            await service.create(makeSessionData());
            service.updateRevealedHints('match-123', 2);

            expect(service.findOne('match-123')?.revealedHints).toBe(2);
        });

        it('does nothing for a non-existent session', () => {
            expect(() => service.updateRevealedHints('ghost', 1)).not.toThrow();
        });
    });

    // ─── updateTestCasesPassed ────────────────────────────────────────────────

    describe('updateTestCasesPassed', () => {
        it('updates the test cases passed count', async () => {
            await service.create(makeSessionData());
            service.updateTestCasesPassed('match-123', 3);

            expect(service.findOne('match-123')?.testCasesPassed).toBe(3);
        });

        it('does nothing for a non-existent session', () => {
            expect(() => service.updateTestCasesPassed('ghost', 1)).not.toThrow();
        });
    });

    // ─── updateWhiteboard ─────────────────────────────────────────────────────

    describe('updateWhiteboard', () => {
        it('updates whiteboard elements', async () => {
            await service.create(makeSessionData());
            const elements = [{ type: 'rect', x: 0, y: 0 }];
            service.updateWhiteboard('match-123', elements);

            expect(service.findOne('match-123')?.whiteboardElements).toEqual(elements);
        });

        it('does nothing for a non-existent session', () => {
            expect(() => service.updateWhiteboard('ghost', [])).not.toThrow();
        });
    });

    // ─── endSession ───────────────────────────────────────────────────────────

    describe('endSession', () => {
        it('marks session as ended and removes it from memory', async () => {
            await service.create(makeSessionData());
            await service.endSession('match-123');

            expect(service.findOne('match-123')).toBeUndefined();
        });

        it('deletes the Redis key when session ends', async () => {
            await service.create(makeSessionData());
            await service.endSession('match-123');

            expect(redisMock.del).toHaveBeenCalledWith('collab:session:match-123');
        });

        it('publishes session.completed event to Redis stream', async () => {
            await service.create(makeSessionData());
            await service.attachQuestion('match-123', {
                questionId: 'two-sum', title: 'Two Sum', topic: ['Arrays'], difficulty: 'Easy',
            });
            service.updateCode('match-123', 'print(1)', 'python');

            await service.endSession('match-123');

            expect(redisMock.xadd).toHaveBeenCalledWith(
                'session.completed', '*',
                expect.anything(), expect.anything(), // sessionId
                expect.anything(), expect.anything(), // userAId
                expect.anything(), expect.anything(), // userBId
                expect.anything(), expect.anything(), // questionId
                expect.anything(), expect.anything(), // questionTitle
                expect.anything(), expect.anything(), // topic
                expect.anything(), expect.anything(), // difficulty
                'code', 'print(1)',
                'language', 'python',
                expect.anything(), expect.anything(), // hintsUsed
                expect.anything(), expect.anything(), // testCasesPassed
                expect.anything(), expect.anything(), // duration
                expect.anything(), expect.anything(), // whiteboardScreenshot
            );
        });

        it('returns undefined for a non-existent session', async () => {
            const result = await service.endSession('no-such-session');
            expect(result).toBeUndefined();
        });
    });

    // ─── onUserJoined / onUserLeft ────────────────────────────────────────────

    describe('onUserJoined', () => {
        it('does not throw when called for a session with no idle timer', async () => {
            await service.create(makeSessionData());
            expect(() => service.onUserJoined('match-123')).not.toThrow();
        });
    });
});
