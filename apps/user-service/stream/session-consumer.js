import Redis from 'ioredis';
import AttemptModel from '../model/attempt-model.js';

const STREAM = 'session.completed';
const GROUP = 'user-service-group';
const CONSUMER = `user-service-${process.pid}`;

function parseFields(fields) {
  const obj = {};
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1];
  }
  return obj;
}

async function saveAttempts(event) {
  const {
    userAId,
    userBId,
    questionId,
    questionTitle,
    topic,
    difficulty,
    code,
    language,
    hintsUsed,
    testCasesPassed,
    duration,
    whiteboardScreenshot,
  } = event;

  const sessionId = event.sessionId ?? '';
  const topicArray = topic
    ? topic
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const records = [
    { userId: userAId, partnerId: userBId },
    { userId: userBId, partnerId: userAId },
  ];

  await Promise.all(
    records.map(({ userId, partnerId }) =>
      AttemptModel.findOneAndUpdate(
        { collaborationSessionId: sessionId, userId },
        {
          partnerId,
          collaborationSessionId: sessionId,
          userId,
          questionId,
          questionTitle,
          topic: topicArray,
          difficulty,
          code: code ?? '',
          language,
          hintsUsed: Number(hintsUsed) || 0,
          testCasesPassed: Number(testCasesPassed) || 0,
          duration: Number(duration) || 0,
          whiteboardScreenshot: whiteboardScreenshot
            ? Buffer.from(
                whiteboardScreenshot.replace(/^data:image\/\w+;base64,/, ''),
                'base64',
              )
            : undefined,
        },
        { upsert: true, new: true },
      ),
    ),
  );

  console.log(
    `[SessionConsumer] Saved attempt records for session ${sessionId}`,
  );
}

export async function startSessionConsumer() {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const redis = new Redis(redisUrl);

  redis.on('error', (err) =>
    console.error('[SessionConsumer] Redis error:', err.message),
  );

  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM');
    console.log(
      `[SessionConsumer] Consumer group "${GROUP}" ready on "${STREAM}"`,
    );
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) {
      console.error(
        '[SessionConsumer] Failed to create consumer group:',
        err.message,
      );
      return;
    }
    console.log(
      `[SessionConsumer] Consumer group "${GROUP}" already exists — continuing`,
    );
  }

  console.log('[SessionConsumer] Polling for session.completed events…');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const results = await redis.xreadgroup(
        'GROUP',
        GROUP,
        CONSUMER,
        'COUNT',
        '10',
        'BLOCK',
        '5000',
        'STREAMS',
        STREAM,
        '>',
      );

      if (!results) {
        continue;
      }

      for (const [, messages] of results) {
        for (const [id, fields] of messages) {
          const event = parseFields(fields);
          try {
            await saveAttempts(event);
            await redis.xack(STREAM, GROUP, id);
          } catch (err) {
            console.error(
              `[SessionConsumer] Failed to process message ${id}:`,
              err.message,
            );
          }
        }
      }
    } catch (err) {
      console.error('[SessionConsumer] Poll error:', err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
