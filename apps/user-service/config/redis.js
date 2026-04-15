import Redis from 'ioredis';

const isJest = process.env.JEST_WORKER_ID !== undefined;

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

const mockRedis = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 0,
  publish: async () => 0,
  subscribe: async () => 0,
  on: () => {},
  quit: async () => {},
  disconnect: () => {},
};

const redisClient = isJest ? mockRedis : new Redis(redisConfig);
const redisSubscriber = isJest ? mockRedis : new Redis(redisConfig);
const redisPublisher = isJest ? mockRedis : new Redis(redisConfig);

if (!isJest) {
  redisClient.on('connect', () => console.log('✅ Redis client connected'));
  redisClient.on('error', (err) =>
    console.error('❌ Redis client error:', err),
  );

  redisSubscriber.on('connect', () =>
    console.log('✅ Redis subscriber connected'),
  );
  redisSubscriber.on('error', (err) =>
    console.error('❌ Redis subscriber error:', err),
  );

  redisPublisher.on('connect', () =>
    console.log('✅ Redis publisher connected'),
  );
  redisPublisher.on('error', (err) =>
    console.error('❌ Redis publisher error:', err),
  );
}

export { redisClient, redisSubscriber, redisPublisher };
