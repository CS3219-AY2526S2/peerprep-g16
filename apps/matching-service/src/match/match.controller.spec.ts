jest.mock('uuid', () => ({
  v4: jest.fn(() => '123e4567-e89b-42d3-a456-426614174000'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { RedisService } from '../redis/redis.service';

const mockMatchService = () => ({
  joinQueue: jest.fn(),
  peekQueueStatus: jest.fn(),
  getQueueStatus: jest.fn(),
  leaveQueue: jest.fn(),
});

const mockRedisService = () => ({
  ping: jest.fn(),
});

describe('MatchController', () => {
  let controller: MatchController;
  let matchService: ReturnType<typeof mockMatchService>;
  let redisService: ReturnType<typeof mockRedisService>;

  beforeEach(async () => {
    matchService = mockMatchService();
    redisService = mockRedisService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchController],
      providers: [
        { provide: MatchService, useValue: matchService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    controller = module.get<MatchController>(MatchController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST / — joinQueue', () => {
    it('calls matchService.joinQueue with correct args and returns result', async () => {
      matchService.joinQueue.mockResolvedValue({
        status: 'waiting',
        message: 'Waiting...',
      });

      const result = await controller.joinQueue({
        userId: 'user-a',
        username: 'Alice',
        topic: 'Arrays',
        difficulty: 'medium',
      });

      expect(matchService.joinQueue).toHaveBeenCalledWith(
        'user-a',
        'Alice',
        'Arrays',
        'medium',
      );
      expect(result).toEqual({
        status: 'waiting',
        message: 'Waiting...',
      });
    });

    it('defaults difficulty to Random when not provided in the body', async () => {
      matchService.joinQueue.mockResolvedValue({
        status: 'waiting',
        message: 'Waiting...',
      });

      await controller.joinQueue({
        userId: 'user-a',
        username: 'Alice',
        topic: 'Arrays',
      } as Parameters<MatchController['joinQueue']>[0]);

      expect(matchService.joinQueue).toHaveBeenCalledWith(
        'user-a',
        'Alice',
        'Arrays',
        'Random',
      );
    });

    it('returns validation error when userId is missing', async () => {
      const result = await controller.joinQueue({
        userId: '',
        username: 'Alice',
        topic: 'Arrays',
      });

      expect(result).toEqual({
        message: 'userId, username and topic are required',
      });
      expect(matchService.joinQueue).not.toHaveBeenCalled();
    });

    it('returns validation error when username is missing', async () => {
      const result = await controller.joinQueue({
        userId: 'user-a',
        username: '',
        topic: 'Arrays',
      });

      expect(result).toEqual({
        message: 'userId, username and topic are required',
      });
      expect(matchService.joinQueue).not.toHaveBeenCalled();
    });

    it('returns validation error when topic is missing', async () => {
      const result = await controller.joinQueue({
        userId: 'user-a',
        username: 'Alice',
        topic: '',
      });

      expect(result).toEqual({
        message: 'userId, username and topic are required',
      });
      expect(matchService.joinQueue).not.toHaveBeenCalled();
    });
  });

  describe('GET /peek/:userId — peekStatus', () => {
    it('delegates to matchService.peekQueueStatus and returns result', async () => {
      const payload = {
        status: 'waiting',
        elapsed: 5000,
        preferences: { topic: 'Arrays', difficulty: 'medium' },
      };
      matchService.peekQueueStatus.mockResolvedValue(payload);

      const result = await controller.peekStatus('user-a');

      expect(matchService.peekQueueStatus).toHaveBeenCalledWith('user-a');
      expect(result).toEqual(payload);
    });

    it('returns not_in_queue when user is not in queue', async () => {
      matchService.peekQueueStatus.mockResolvedValue({
        status: 'not_in_queue',
      });

      const result = await controller.peekStatus('unknown-user');

      expect(result).toEqual({ status: 'not_in_queue' });
    });
  });

  describe('GET /:userId — getStatus', () => {
    it('returns matched status with roomId and matchedWith details', async () => {
      const payload = {
        status: 'matched',
        roomId: 'room-xyz',
        matchedWith: { userId: 'user-b', username: 'Bob' },
        matchDetails: { topic: 'Arrays', difficulty: 'medium' },
      };
      matchService.getQueueStatus.mockResolvedValue(payload);

      const result = await controller.getStatus('user-a');

      expect(matchService.getQueueStatus).toHaveBeenCalledWith('user-a');
      expect(result).toEqual(payload);
    });

    it('returns waiting status with elapsed and preferences', async () => {
      const payload = {
        status: 'waiting',
        message: 'Searching for a match...',
        elapsed: 12000,
        preferences: { topic: 'Graphs', difficulty: 'hard' },
      };
      matchService.getQueueStatus.mockResolvedValue(payload);

      const result = await controller.getStatus('user-a');

      expect(result).toEqual(payload);
    });

    it('returns timeout status when search has exceeded limit', async () => {
      matchService.getQueueStatus.mockResolvedValue({
        status: 'timeout',
        message: 'No match found. Please try again later.',
        elapsed: 130000,
      });

      const result = await controller.getStatus('user-a');

      expect(result.status).toBe('timeout');
    });

    it('returns not_in_queue when no user or match data exists', async () => {
      matchService.getQueueStatus.mockResolvedValue({
        status: 'not_in_queue',
      });

      const result = await controller.getStatus('user-a');

      expect(result.status).toBe('not_in_queue');
    });
  });

  describe('DELETE /:userId — leaveQueue', () => {
    it('calls matchService.leaveQueue and returns success message', async () => {
      matchService.leaveQueue.mockResolvedValue(undefined);

      const result = await controller.leaveQueue('user-a');

      expect(matchService.leaveQueue).toHaveBeenCalledWith('user-a');
      expect(result).toEqual({ message: 'Left queue successfully' });
    });
  });

  describe('GET /health — healthCheck', () => {
    it('returns healthy with redis connected when ping returns PONG', async () => {
      redisService.ping.mockResolvedValue('PONG');

      const result = await controller.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        redis: 'connected',
      });
    });

    it('returns healthy with redis error when ping returns non-PONG', async () => {
      redisService.ping.mockResolvedValue('ERROR');

      const result = await controller.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        redis: 'error',
      });
    });

    it('returns unhealthy when ping throws an exception', async () => {
      redisService.ping.mockRejectedValue(new Error('Connection refused'));

      const result = await controller.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        redis: 'disconnected',
      });
    });
  });
});
