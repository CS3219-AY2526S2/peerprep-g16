import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { MatchController } from '../src/match/match.controller';
import { MatchService } from '../src/match/match.service';
import { RedisService } from '../src/redis/redis.service';

jest.mock('uuid', () => ({ v4: () => 'match-id-1' }));

class InMemoryRedis {
  hashes = new Map<string, Record<string, string>>();
  sortedSets = new Map<string, Array<{ score: number; member: string }>>();

  hgetall(key: string) {
    return Promise.resolve(this.hashes.get(key) ?? {});
  }

  hset(key: string, fields: string[]) {
    const existing = this.hashes.get(key) ?? {};

    for (let index = 0; index < fields.length; index += 2) {
      existing[fields[index]] = String(fields[index + 1]);
    }

    this.hashes.set(key, existing);
    return Promise.resolve(fields.length / 2);
  }

  zadd(key: string, score: number, member: string) {
    const current = this.sortedSets.get(key) ?? [];
    const existing = current.filter((item) => item.member !== member);

    existing.push({ score: Number(score), member });
    existing.sort((a, b) => a.score - b.score);
    this.sortedSets.set(key, existing);

    return Promise.resolve(1);
  }

  zrange(key: string) {
    return Promise.resolve(
      (this.sortedSets.get(key) ?? []).map((item) => item.member),
    );
  }

  zrem(key: string, member: string) {
    const existing = this.sortedSets.get(key) ?? [];

    this.sortedSets.set(
      key,
      existing.filter((item) => item.member !== member),
    );

    return Promise.resolve(1);
  }

  del(key: string) {
    this.hashes.delete(key);
    this.sortedSets.delete(key);
    return Promise.resolve(1);
  }

  expire() {
    return Promise.resolve(1);
  }
}

type MatchResponseBody = {
  status: string;
};

describe('matching-service integration', () => {
  let app: INestApplication<App>;
  let redis: InMemoryRedis;
  let redisService: {
    getClient: jest.Mock;
    publishToStream: jest.Mock;
    ping: jest.Mock;
  };

  beforeEach(async () => {
    redis = new InMemoryRedis();
    redisService = {
      getClient: jest.fn(() => redis),
      publishToStream: jest.fn().mockResolvedValue('stream-message-1'),
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MatchController],
      providers: [
        MatchService,
        {
          provide: RedisService,
          useValue: redisService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('adds a user to the queue and rejects duplicate active requests', async () => {
    await request(app.getHttpServer())
      .post('/api/match')
      .send({
        userId: 'user-a',
        username: 'alice',
        topic: 'Arrays',
        difficulty: 'Easy',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'waiting',
          message: 'Waiting for a match...',
        });
      });

    await request(app.getHttpServer())
      .post('/api/match')
      .send({
        userId: 'user-a',
        username: 'alice',
        topic: 'Arrays',
        difficulty: 'Easy',
      })
      .expect(201)
      .expect(({ body }) => {
        expect((body as MatchResponseBody).status).toBe('already_in_queue');
      });
  });

  it('matches compatible users and publishes a match-found event', async () => {
    await request(app.getHttpServer()).post('/api/match').send({
      userId: 'user-a',
      username: 'alice',
      topic: 'Arrays',
      difficulty: 'easy',
    });

    await request(app.getHttpServer()).post('/api/match').send({
      userId: 'user-b',
      username: 'bob',
      topic: 'Arrays',
      difficulty: 'easy',
    });

    const firstStatus = await request(app.getHttpServer())
      .get('/api/match/user-a')
      .expect(200);

    expect(firstStatus.body as MatchResponseBody).toMatchObject({
      status: 'matched',
      roomId: 'match-id-1',
      matchedWith: { userId: 'user-b', username: 'bob' },
      matchDetails: { topic: 'Arrays' },
    });

    expect(redisService.publishToStream).toHaveBeenCalledWith(
      'match.found',
      expect.objectContaining({
        matchId: 'match-id-1',
        userAId: 'user-a',
        userBId: 'user-b',
        topic: 'Arrays',
      }),
    );

    const secondStatus = await request(app.getHttpServer())
      .get('/api/match/user-b')
      .expect(200);

    expect(secondStatus.body as MatchResponseBody).toMatchObject({
      status: 'matched',
      roomId: 'match-id-1',
      matchedWith: { userId: 'user-a', username: 'alice' },
    });
  });

  it('supports peek and cancellation without consuming queue state', async () => {
    await request(app.getHttpServer()).post('/api/match').send({
      userId: 'user-a',
      username: 'alice',
      topic: 'Graphs',
      difficulty: 'hard',
    });

    await request(app.getHttpServer())
      .get('/api/match/peek/user-a')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'waiting',
          preferences: { topic: 'Graphs', difficulty: 'hard' },
        });
      });

    await request(app.getHttpServer()).delete('/api/match/user-a').expect(200);

    await request(app.getHttpServer())
      .get('/api/match/user-a')
      .expect(200)
      .expect(({ body }) => {
        expect((body as MatchResponseBody).status).toBe('not_in_queue');
      });
  });
});
