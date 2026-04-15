import {
  redisClient,
  redisPublisher,
  redisSubscriber,
} from '../config/redis.js';

const ROLE_CHANGE_CHANNEL = 'privilege:change';
const BLACKLIST_PREFIX = 'blacklist:user:';

let initialized = false;

export async function initializeBlacklistService() {
  if (initialized) {
    return;
  }

  await redisSubscriber.subscribe(ROLE_CHANGE_CHANNEL);
  console.log('Subscribed to channel: ' + ROLE_CHANGE_CHANNEL);

  redisSubscriber.on('message', async (channel, message) => {
    if (channel === ROLE_CHANGE_CHANNEL) {
      try {
        const event = JSON.parse(message);
        console.log(
          'Privilege change event received for user: ' + event.userId,
        );
        await blacklistUser(event.userId, event.timestamp);
      } catch (err) {
        console.error('Failed to process privilege change event:', err);
      }
    }
  });

  initialized = true;
  console.log('Token blacklist service initialized');
}

async function blacklistUser(userId, timestamp) {
  const key = BLACKLIST_PREFIX + userId;
  const ttl = 24 * 60 * 60;

  await redisClient.set(key, timestamp.toString(), 'EX', ttl);
  console.log(
    'Blacklisted tokens for user ' +
      userId +
      ' issued before ' +
      new Date(timestamp * 1000).toISOString(),
  );
}

export async function isTokenBlacklisted(userId, tokenIssuedAt) {
  const key = BLACKLIST_PREFIX + userId;
  const blacklistTimestamp = await redisClient.get(key);

  if (!blacklistTimestamp) {
    return false;
  }

  return tokenIssuedAt < parseInt(blacklistTimestamp);
}

export async function publishPrivilegeChange(userId, oldIsAdmin, newIsAdmin) {
  const timestamp = Math.floor(Date.now() / 1000);

  const event = {
    userId,
    oldIsAdmin,
    newIsAdmin,
    timestamp,
  };

  await blacklistUser(userId, timestamp);

  await redisPublisher.publish(ROLE_CHANGE_CHANNEL, JSON.stringify(event));
  console.log(
    'Published privilege change: user ' +
      userId +
      ' isAdmin ' +
      oldIsAdmin +
      ' -> ' +
      newIsAdmin,
  );
}
