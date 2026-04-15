jest.mock('uuid', () => ({
  v4: jest.fn(() => '123e4567-e89b-42d3-a456-426614174000'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { MatchService } from './match.service';
import { RedisService } from '../redis/redis.service';

const mockRedisClient = () => ({
  hgetall: jest.fn(),
  hset: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  zrem: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
});

const mockRedisService = () => ({
  getClient: jest.fn(),
  publishToStream: jest.fn(),
  ping: jest.fn(),
});

const makeUser = (
  overrides: Record<string, string> = {},
): Record<string, string> => ({
  userId: 'user-a',
  username: 'Alice',
  topic: 'Arrays',
  difficulty: 'medium',
  originalDifficulty: 'medium',
  joinedAt: Date.now().toString(),
  ...overrides,
});

describe('MatchService', () => {
  let service: MatchService;
  let redisService: ReturnType<typeof mockRedisService>;
  let client: ReturnType<typeof mockRedisClient>;

  beforeEach(async () => {
    client = mockRedisClient();
    redisService = mockRedisService();
    redisService.getClient.mockReturnValue(client);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<MatchService>(MatchService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('joinQueue', () => {
    it('returns already_in_queue when user hash already exists', async () => {
      client.hgetall
        .mockResolvedValueOnce({ userId: 'user-a' });

      const result = await service.joinQueue(
        'user-a',
        'Alice',
        'Arrays',
        'medium',
      );

      expect(result).toEqual({
        status: 'already_in_queue',
        message: 'You are already in the queue.',
      });
    });

    it('returns already_matched when a matched record exists', async () => {
      client.hgetall
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ status: 'matched' });

      const result = await service.joinQueue(
        'user-a',
        'Alice',
        'Arrays',
        'medium',
      );

      expect(result).toEqual({
        status: 'already_matched',
        message: 'You already have a pending match.',
      });
    });

    it('stores user data and adds to sorted set on fresh join', async () => {
      client.hgetall
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      client.hset.mockResolvedValue(1);
      client.zadd.mockResolvedValue(1);

      const result = await service.joinQueue(
        'user-a',
        'Alice',
        'Arrays',
        'medium',
      );

      expect(client.hset).toHaveBeenCalledWith(
        'user:user-a',
        expect.arrayContaining([
          'userId',
          'user-a',
          'username',
          'Alice',
          'topic',
          'Arrays',
          'difficulty',
          'medium',
          'originalDifficulty',
          'medium',
        ]),
      );
      expect(client.zadd).toHaveBeenCalledWith(
        'matchmaking:queue',
        expect.any(Number),
        'user-a',
      );
      expect(result).toEqual({
        status: 'waiting',
        message: 'Waiting for a match...',
      });
    });

    it('defaults topic and difficulty to Random when not provided', async () => {
      client.hgetall
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      client.hset.mockResolvedValue(1);
      client.zadd.mockResolvedValue(1);

      await service.joinQueue('user-a', 'Alice', '', '');

      expect(client.hset).toHaveBeenCalledWith(
        'user:user-a',
        expect.arrayContaining([
          'topic',
          'Random',
          'difficulty',
          'Random',
          'originalDifficulty',
          'Random',
        ]),
      );
    });
  });

  describe('findMatch', () => {
    const setupQueue = (currentUser: Record<string, string>, otherUsers: Record<string, string>[]) => {
      const ids = otherUsers.map((u) => u.userId);
      client.zrange.mockResolvedValue(['user-a', ...ids]);
      client.hgetall.mockImplementation(async (key: string) => {
        if (key === 'user:user-a') return currentUser;
        const found = otherUsers.find((u) => key === `user:${u.userId}`);
        return found ?? {};
      });
      client.zrem.mockResolvedValue(1);
      client.del.mockResolvedValue(1);
      client.hset.mockResolvedValue(1);
      client.expire.mockResolvedValue(1);
      redisService.publishToStream.mockResolvedValue('stream-msg-id');
    };

    it('returns waiting when no other users are in the queue', async () => {
      client.zrange.mockResolvedValue(['user-a']);
      client.hgetall.mockResolvedValue(makeUser());

      const result = await service.findMatch(
        'user-a',
        'Alice',
        'Arrays',
        'medium',
      );

      expect(result.status).toBe('waiting');
    });

    it('matches on exact topic + difficulty', async () => {
      const alice = makeUser({
        topic: 'Arrays',
        difficulty: 'medium',
        originalDifficulty: 'medium',
      });
      const bob = makeUser({
        userId: 'user-b',
        username: 'Bob',
        topic: 'Arrays',
        difficulty: 'medium',
        originalDifficulty: 'medium',
      });

      setupQueue(alice, [bob]);

      const result = await service.findMatch(
        'user-a',
        'Alice',
        'Arrays',
        'medium',
      );

      expect(result.status).toBe('matched');
      expect((result as any).matchedWith).toMatchObject({ userId: 'user-b' });
    });

    it('does not match when topic differs and no Random fallback', async () => {
      const alice = makeUser({
        topic: 'Arrays',
        difficulty: 'medium',
        originalDifficulty: 'medium',
      });
      const bob = makeUser({
        userId: 'user-b',
        topic: 'Graphs',
        difficulty: 'medium',
        originalDifficulty: 'medium',
      });

      setupQueue(alice, [bob]);

      const result = await service.findMatch(
        'user-a',
        'Alice',
        'Arrays',
        'medium',
      );

      expect(result.status).toBe('waiting');
    });

    it('matches when current user has Random topic', async () => {
      const alice = makeUser({
        topic: 'Random',
        difficulty: 'medium',
        originalDifficulty: 'medium',
      });
      const bob = makeUser({
        userId: 'user-b',
        topic: 'Graphs',
        difficulty: 'medium',
        originalDifficulty: 'medium',
      });

      setupQueue(alice, [bob]);

      const result = await service.findMatch(
        'user-a',
        'Alice',
        'Random',
        'medium',
      );

      expect(result.status).toBe('matched');
    });

    it('matches when current user has Random difficulty', async () => {
      const alice = makeUser({
        topic: 'Arrays',
        difficulty: 'Random',
        originalDifficulty: 'hard',
      });
      const bob = makeUser({
        userId: 'user-b',
        topic: 'Arrays',
        difficulty: 'hard',
        originalDifficulty: 'hard',
      });

      setupQueue(alice, [bob]);

      const result = await service.findMatch(
        'user-a',
        'Alice',
        'Arrays',
        'Random',
      );

      expect(result.status).toBe('matched');
    });

    it('fully-random user matches anyone', async () => {
      const alice = makeUser({
        topic: 'Random',
        difficulty: 'Random',
        originalDifficulty: 'Random',
      });
      const bob = makeUser({
        userId: 'user-b',
        topic: 'Trees',
        difficulty: 'easy',
        originalDifficulty: 'easy',
      });

      setupQueue(alice, [bob]);

      const result = await service.findMatch(
        'user-a',
        'Alice',
        'Random',
        'Random',
      );

      expect(result.status).toBe('matched');
    });

    it('matches a Random topic other user when priority 3 applies', async () => {
      const alice = makeUser({
        topic: 'Arrays',
        difficulty: 'medium',
        originalDifficulty: 'medium',
      });
      const bob = makeUser({
        userId: 'user-b',
        topic: 'Random',
        difficulty: 'medium',
        originalDifficulty: 'medium',
      });

      setupQueue(alice, [bob]);

      const result = await service.findMatch(
        'user-a',
        'Alice',
        'Arrays',
        'medium',
      );

      expect(result.status).toBe('matched');
    });

    it('matches a fully-random other user as last priority', async () => {
      const alice = makeUser({
        topic: 'Arrays',
        difficulty: 'medium',
        originalDifficulty: 'medium',
      });
      const bob = makeUser({
        userId: 'user-b',
        topic: 'Random',
        difficulty: 'Random',
        originalDifficulty: 'easy',
      });

      setupQueue(alice, [bob]);

      const result = await service.findMatch(
        'user-a',
        'Alice',
        'Arrays',
        'medium',
      );

      expect(result.status).toBe('matched');
    });

    it('removes both users from queue and deletes their hashes on match', async () => {
      const alice = makeUser();
      const bob = makeUser({
        userId: 'user-b',
        username: 'Bob',
        topic: 'Arrays',
        difficulty: 'medium',
        originalDifficulty: 'medium',
      });

      setupQueue(alice, [bob]);

      await service.findMatch('user-a', 'Alice', 'Arrays', 'medium');

      expect(client.zrem).toHaveBeenCalledWith('matchmaking:queue', 'user-a');
      expect(client.zrem).toHaveBeenCalledWith('matchmaking:queue', 'user-b');
      expect(client.del).toHaveBeenCalledWith('user:user-a');
      expect(client.del).toHaveBeenCalledWith('user:user-b');
    });

    it('creates match hashes with 60s expiry for both users', async () => {
      const alice = makeUser();
      const bob = makeUser({
        userId: 'user-b',
        username: 'Bob',
        topic: 'Arrays',
        difficulty: 'medium',
        originalDifficulty: 'medium',
      });

      setupQueue(alice, [bob]);

      await service.findMatch('user-a', 'Alice', 'Arrays', 'medium');

      expect(client.expire).toHaveBeenCalledWith('match:user-a', 60);
      expect(client.expire).toHaveBeenCalledWith('match:user-b', 60);
    });

    it('publishes a match.found stream event on successful match', async () => {
      const alice = makeUser();
      const bob = makeUser({
        userId: 'user-b',
        username: 'Bob',
        topic: 'Arrays',
        difficulty: 'medium',
        originalDifficulty: 'medium',
      });

      setupQueue(alice, [bob]);

      await service.findMatch('user-a', 'Alice', 'Arrays', 'medium');

      expect(redisService.publishToStream).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userAId: 'user-a',
          userBId: 'user-b',
        }),
      );
    });
  });

  describe('getQueueStatus', () => {
    it('returns matched status and clears match hash when match record exists', async () => {
      client.hgetall.mockResolvedValueOnce({
        status: 'matched',
        roomId: 'room-1',
        matchedWith_userId: 'user-b',
        matchedWith_username: 'Bob',
        topic: 'Arrays',
        difficulty: 'medium',
      });
      client.del.mockResolvedValue(1);

      const result = await service.getQueueStatus('user-a');

      expect(result.status).toBe('matched');
      expect((result as any).roomId).toBe('room-1');
      expect(client.del).toHaveBeenCalledWith('match:user-a');
    });

    it('returns not_in_queue when neither match nor user hash exists', async () => {
      client.hgetall
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const result = await service.getQueueStatus('user-a');

      expect(result.status).toBe('not_in_queue');
    });

    it('returns timeout and cleans up when elapsed >= STAGE2_TIMEOUT', async () => {
      const oldTimestamp = (Date.now() - 125_000).toString();

      client.hgetall
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce(makeUser({ joinedAt: oldTimestamp }));
      client.zrem.mockResolvedValue(1);
      client.del.mockResolvedValue(1);

      const result = await service.getQueueStatus('user-a');

      expect(result.status).toBe('timeout');
      expect(client.zrem).toHaveBeenCalledWith('matchmaking:queue', 'user-a');
      expect(client.del).toHaveBeenCalledWith('user:user-a');
    });

    it('expands difficulty to Random after STAGE1_TIMEOUT when no match found', async () => {
      const oldTimestamp = (Date.now() - 65_000).toString();
      const userData = makeUser({ joinedAt: oldTimestamp });

      client.hgetall.mockImplementation(async (key: string) => {
        if (key === 'match:user-a') return {};
        if (key === 'user:user-a') return userData;
        return {};
      });

      client.zrange.mockResolvedValue(['user-a']);
      client.hset.mockResolvedValue(1);

      const result = await service.getQueueStatus('user-a');

      expect(result.status).toBe('expand_search_difficulty');
      expect(client.hset).toHaveBeenCalledWith('user:user-a', [
        'difficulty',
        'Random',
      ]);
    });

    it('returns waiting with elapsed and preferences when under STAGE1_TIMEOUT', async () => {
      const recentTimestamp = (Date.now() - 10_000).toString();
      const userData = makeUser({ joinedAt: recentTimestamp });

      client.hgetall.mockImplementation(async (key: string) => {
        if (key === 'match:user-a') return {};
        if (key === 'user:user-a') return userData;
        return {};
      });

      client.zrange.mockResolvedValue(['user-a']);

      const result = await service.getQueueStatus('user-a');

      expect(result.status).toBe('waiting');
      expect((result as any).elapsed).toBeGreaterThan(0);
      expect((result as any).preferences).toMatchObject({
        topic: 'Arrays',
        difficulty: 'medium',
      });
    });
  });

  describe('peekQueueStatus', () => {
    it('returns not_in_queue when no user hash exists', async () => {
      client.hgetall.mockResolvedValue({});

      const result = await service.peekQueueStatus('user-a');

      expect(result.status).toBe('not_in_queue');
    });

    it('returns waiting when elapsed < STAGE1_TIMEOUT', async () => {
      client.hgetall.mockResolvedValue(
        makeUser({ joinedAt: (Date.now() - 10_000).toString() }),
      );

      const result = await service.peekQueueStatus('user-a');

      expect(result.status).toBe('waiting');
    });

    it('returns expand_search_difficulty when elapsed >= STAGE1_TIMEOUT', async () => {
      client.hgetall.mockResolvedValue(
        makeUser({ joinedAt: (Date.now() - 65_000).toString() }),
      );

      const result = await service.peekQueueStatus('user-a');

      expect(result.status).toBe('expand_search_difficulty');
    });

    it('includes elapsed and preferences in response', async () => {
      client.hgetall.mockResolvedValue(
        makeUser({
          topic: 'Trees',
          difficulty: 'hard',
          joinedAt: (Date.now() - 5_000).toString(),
        }),
      );

      const result = await service.peekQueueStatus('user-a');

      expect((result as any).elapsed).toBeGreaterThan(0);
      expect((result as any).preferences).toMatchObject({
        topic: 'Trees',
        difficulty: 'hard',
      });
    });
  });

  describe('leaveQueue', () => {
    it('removes user from sorted set and deletes user hash', async () => {
      client.zrem.mockResolvedValue(1);
      client.del.mockResolvedValue(1);

      await service.leaveQueue('user-a');

      expect(client.zrem).toHaveBeenCalledWith('matchmaking:queue', 'user-a');
      expect(client.del).toHaveBeenCalledWith('user:user-a');
    });
  });

  describe('publishMatchFound', () => {
    it('publishes to stream and returns a valid matchId', async () => {
      redisService.publishToStream.mockResolvedValue('stream-id-123');

      const result = await service.publishMatchFound(
        'user-a',
        'user-b',
        'Arrays',
        'medium',
        'hard',
      );

      expect(result.matchId).toBe('123e4567-e89b-42d3-a456-426614174000');
      expect(result.userAId).toBe('user-a');
      expect(result.userBId).toBe('user-b');
      expect(result.topic).toBe('Arrays');
      expect(result.streamMessageId).toBe('stream-id-123');
    });

    it('includes all required fields in the stream payload', async () => {
      redisService.publishToStream.mockResolvedValue('msg-id');

      await service.publishMatchFound(
        'user-a',
        'user-b',
        'Graphs',
        'easy',
        'medium',
      );

      expect(redisService.publishToStream).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          matchId: '123e4567-e89b-42d3-a456-426614174000',
          userAId: 'user-a',
          userBId: 'user-b',
          topic: 'Graphs',
          userADifficulty: 'easy',
          userBDifficulty: 'medium',
          timestamp: expect.any(String),
        }),
      );
    });
  });
});