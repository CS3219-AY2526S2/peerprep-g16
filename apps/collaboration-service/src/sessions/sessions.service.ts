import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { SessionState, SessionStateDocument } from './session-state.schema';

export interface Question {
  questionId: string;
  title: string;
  topic: string[];
  difficulty: string;
  description: string;
  constraints: string[];
  examples: unknown[];
  hints: string[];
  testCases: {
    sample: { input: string; expectedOutput: string }[];
    hidden: { input: string; expectedOutput: string }[];
  };
}

export interface Session {
  sessionId: string;
  userAId: string;
  userBId: string;
  matchId: string;
  topic: string;
  question: Question | null;
  whiteboardElements: unknown[];
  whiteboardScreenshot?: string;
  code: string;
  language: string;
  revealedHints: number;
  testCasesPassed: number;
  status: 'waiting' | 'active' | 'ended';
  createdAt: Date;
  pendingEnd?: boolean;
  pendingEndSince?: number;
}

const REDIS_PREFIX = 'collab:session:';
const FLUSH_DELAY_MS = 1000;
const DEFAULT_QUESTION_TIMEOUT_MS = 10000;
const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const STATE_SAVE_DEBOUNCE_MS = 30 * 1000; // 30 seconds
const RECOVERY_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const PENDING_END_TIMEOUT_MS = 30 * 1000; // 30 seconds
const PENDING_END_RETRY_MS = 5 * 1000; // 5 seconds

const DIFFICULTY_RANK: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
function resolveDifficulty(
  a: string | null,
  b: string | null,
): string | undefined {
  const aValid = a && a in DIFFICULTY_RANK;
  const bValid = b && b in DIFFICULTY_RANK;
  if (aValid && bValid) return DIFFICULTY_RANK[a] <= DIFFICULTY_RANK[b] ? a : b;
  if (aValid) return a;
  if (bValid) return b;
  return undefined;
}

@Injectable()
export class SessionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionsService.name);
  private sessions = new Map<string, Session>();
  private io: Server | null = null;
  private redis: Redis;
  private flushTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private questionTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private idleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private idleTimerExpiry = new Map<string, number>();
  private readonly stateSaveTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly initialUpsertSent = new Set<string>();
  private recoveryInterval: ReturnType<typeof setInterval> | null = null;
  private readonly pendingEndRetryTimers = new Map<
    string,
    ReturnType<typeof setInterval>
  >();

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(SessionState.name)
    private readonly sessionStateModel: Model<SessionStateDocument>,
  ) {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (err) =>
      this.logger.error(`Redis error: ${err.message}`),
    );
    this.redis.on('ready', () => {
      this.logger.log('Redis reconnected — running recovery immediately');
      void this.recoverUnpublishedSessions().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`On-reconnect recovery failed: ${message}`);
      });
    });
  }

  async onModuleInit() {
    try {
      await this.redis.connect();
      this.logger.log('Connected to Redis');
      await this.restoreFromRedis();
      for (const [, session] of this.sessions) {
        if (session.pendingEnd) {
          this.logger.log(
            `Resuming pending end retry for restored session ${session.sessionId}`,
          );
          this.startPendingEndRetry(session.sessionId);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Could not connect to Redis — running without persistence: ${message}`,
      );
    }
    await this.recoverUnpublishedSessions();
    this.recoveryInterval = setInterval(() => {
      void this.recoverUnpublishedSessions().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Periodic recovery failed: ${message}`);
      });
    }, RECOVERY_INTERVAL_MS);
  }

  async onModuleDestroy() {
    if (this.recoveryInterval) clearInterval(this.recoveryInterval);
    for (const timer of this.pendingEndRetryTimers.values())
      clearInterval(timer);
    for (const timer of this.questionTimeouts.values()) clearTimeout(timer);
    for (const timer of this.idleTimers.values()) clearTimeout(timer);
    for (const timer of this.stateSaveTimers.values()) clearTimeout(timer);
    for (const [sessionId, timer] of this.flushTimers) {
      clearTimeout(timer);
      await this.flushToRedis(sessionId);
    }
    this.redis.disconnect();
  }

  setServer(io: Server) {
    this.io = io;
  }

  // ─── Redis helpers ────────────────────────────────────────────────────────

  private scheduleFlush(sessionId: string): void {
    const existing = this.flushTimers.get(sessionId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.flushTimers.delete(sessionId);
      void this.flushToRedis(sessionId);
    }, FLUSH_DELAY_MS);
    this.flushTimers.set(sessionId, timer);
  }

  private async flushToRedis(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    try {
      await this.redis.set(
        `${REDIS_PREFIX}${sessionId}`,
        JSON.stringify(session),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to persist session ${sessionId}: ${message}`);
    }
  }

  private async restoreFromRedis(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${REDIS_PREFIX}*`);
      for (const key of keys) {
        const raw = await this.redis.get(key);
        if (!raw) continue;
        const session = JSON.parse(raw) as Session;
        if (session.status === 'ended') {
          await this.redis.del(key);
          continue;
        }
        // Cross-check MongoDB: Redis may have a stale 'active' key for a session
        // that ended while Redis was down (del failed at that time)
        const mongoDoc = await this.sessionStateModel
          .findOne({ sessionId: session.sessionId }, { status: 1 })
          .lean();
        if (mongoDoc?.status === 'ended') {
          await this.redis.del(key);
          this.logger.log(
            `Discarded stale Redis key for ended session ${session.sessionId}`,
          );
          continue;
        }
        this.sessions.set(session.sessionId, session);
        this.logger.log(`Restored session from Redis: ${session.sessionId}`);
      }
      if (keys.length > 0) {
        this.logger.log(`Restored ${keys.length} session(s) from Redis`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to restore sessions from Redis: ${message}`);
    }
  }

  private async isRedisHealthy(): Promise<boolean> {
    try {
      await Promise.race([
        this.redis.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Redis ping timeout')), 2000),
        ),
      ]);
      console.log('[isRedisHealthy] Redis is healthy');
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[isRedisHealthy] Redis is DOWN: ${message}`);
      return false;
    }
  }

  // ─── Session lifecycle ────────────────────────────────────────────────────

  async create(data: {
    userAId: string;
    userBId: string;
    matchId: string;
    topic: string;
    userADifficulty: string | null;
    userBDifficulty: string | null;
  }): Promise<Session> {
    const session: Session = {
      sessionId: data.matchId,
      userAId: data.userAId,
      userBId: data.userBId,
      matchId: data.matchId,
      topic: data.topic,
      question: null,
      whiteboardElements: [],
      code: '',
      language: 'python',
      revealedHints: 0,
      testCasesPassed: 0,
      status: 'waiting',
      createdAt: new Date(),
    };

    this.sessions.set(data.matchId, session);
    this.logger.log(`Session created (waiting): ${data.matchId}`);

    // Persist immediately so a crash right after creation doesn't lose it
    await this.flushToRedis(data.matchId);

    // Write initial state to MongoDB (fire-and-forget)
    this.saveSessionState(session).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`saveSessionState on create failed: ${message}`);
    });

    // Fall back to mock question if Question Service doesn't respond in time
    const timeoutMs =
      this.configService.get<number>('QUESTION_TIMEOUT_MS') ??
      DEFAULT_QUESTION_TIMEOUT_MS;
    const timer = setTimeout(() => {
      this.questionTimeouts.delete(data.matchId);
      const s = this.sessions.get(data.matchId);
      if (!s || s.status !== 'waiting') return; // question already arrived
      this.logger.warn(
        `Question Service timed out for ${data.matchId} — using mock question`,
      );
      void this.attachQuestion(data.matchId, this.getMockQuestion());
    }, timeoutMs);
    this.questionTimeouts.set(data.matchId, timer);

    return session;
  }

  /**
   * Called by Question Service once it has selected a question for this session.
   * Sets session status to 'active' and pushes 'questionReady' to both users.
   *
   * POST /sessions/:id/question
   * Body: { question: Question }
   */
  async attachQuestion(sessionId: string, question: Question): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    // Cancel the fallback timer if Question Service responded in time
    const timer = this.questionTimeouts.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.questionTimeouts.delete(sessionId);
    }

    session.question = question;
    session.status = 'active';
    this.logger.log(
      `Question attached by Question Service, session active: ${sessionId}`,
    );

    await this.flushToRedis(sessionId);

    // Persist to MongoDB now that the question is known (fire-and-forget)
    this.saveSessionState(session).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `saveSessionState after attachQuestion failed: ${message}`,
      );
    });

    if (this.io) {
      this.io.to(sessionId).emit('questionReady', { question });
    }
  }

  findOne(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  async endSession(
    sessionId: string,
    opts?: { forceBypassRedis?: boolean; suppressConfirmedEmit?: boolean },
  ): Promise<
    Session | { blocked: true; reason: 'redis_unavailable' } | undefined
  > {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === 'ended') return undefined;

    if (!opts?.forceBypassRedis) {
      const redisHealthy = await this.isRedisHealthy();
      console.log(
        `[endSession] Redis health for session ${sessionId}: ${redisHealthy ? 'UP' : 'DOWN'}`,
      );
      if (!redisHealthy) {
        if (!session.pendingEnd) {
          session.pendingEnd = true;
          session.pendingEndSince = Date.now();
        }
        return { blocked: true, reason: 'redis_unavailable' };
      }
    }

    session.status = 'ended';

    // Cancel question fallback timer if session ends before it fires
    const qTimer = this.questionTimeouts.get(sessionId);
    if (qTimer) {
      clearTimeout(qTimer);
      this.questionTimeouts.delete(sessionId);
    }

    // Cancel idle disconnect timer
    const idleTimer = this.idleTimers.get(sessionId);
    if (idleTimer) {
      clearTimeout(idleTimer);
      this.idleTimers.delete(sessionId);
      this.idleTimerExpiry.delete(sessionId);
    }

    // Cancel any pending flush and do a final immediate write, then clean up
    const timer = this.flushTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(sessionId);
    }

    // Cancel pending debounced MongoDB save — we'll do a final synchronous one now
    const stateSaveTimer = this.stateSaveTimers.get(sessionId);
    if (stateSaveTimer) {
      clearTimeout(stateSaveTimer);
      this.stateSaveTimers.delete(sessionId);
    }

    const endedAt = new Date();
    // Write final state to MongoDB before publishing (publishedToStream starts false)
    await this.saveSessionState(session, { publishedToStream: false, endedAt });

    const published = await this.publishSessionCompleted(session);
    if (published) {
      await this.sessionStateModel
        .findOneAndUpdate({ sessionId }, { $set: { publishedToStream: true } })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Failed to mark publishedToStream for ${sessionId}: ${message}`,
          );
        });
    }

    this.initialUpsertSent.delete(sessionId);

    // Fetch model answer for the user to review
    let modelAnswerData: unknown = null;
    if (session.question?.questionId) {
      try {
        const questionServiceUrl =
          this.configService.get<string>('QUESTION_SERVICE_URL') ??
          'http://localhost:3002';
        const res = await fetch(
          `${questionServiceUrl}/questions/${session.question.questionId}/model-answer`,
        );
        this.logger.log(
          `Model answer fetch status: ${res.status} for questionId: ${session.question.questionId}`,
        );
        if (res.ok) modelAnswerData = (await res.json()) as unknown;
        this.logger.log(
          `Model answer data: ${JSON.stringify(modelAnswerData)}`,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to fetch model answer: ${message}`);
      }
    }

    // Emit session completion with model answer to both users
    if (this.io && !opts?.suppressConfirmedEmit) {
      this.io.to(sessionId).emit('endSession:confirmed', {
        ...session,
        modelAnswerData,
      });
    }

    this.sessions.delete(sessionId);
    try {
      await this.redis.del(`${REDIS_PREFIX}${sessionId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to delete Redis key for ${sessionId}: ${message}`,
      );
    }

    this.logger.log(`Session ended: ${sessionId}`);
    return session;
  }

  // ─── State mutations (each schedules a debounced Redis flush) ─────────────

  updateWhiteboard(sessionId: string, elements: any[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.whiteboardElements = elements;
    this.scheduleFlush(sessionId);
  }

  updateCode(sessionId: string, code: string, language?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.code = code;
    if (language) session.language = language;
    this.scheduleFlush(sessionId);
    this.scheduleStateSave(session);
  }

  updateRevealedHints(sessionId: string, count: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.revealedHints = count;
    this.scheduleFlush(sessionId);
    this.saveSessionState(session).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `saveSessionState after hint update failed: ${message}`,
      );
    });
  }

  updateTestCasesPassed(sessionId: string, count: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.testCasesPassed = count;
    this.scheduleFlush(sessionId);
    this.saveSessionState(session).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `saveSessionState after test result failed: ${message}`,
      );
    });
  }

  setWhiteboardScreenshot(sessionId: string, screenshot: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.whiteboardScreenshot = screenshot;
  }

  // ─── Redis Streams integration ────────────────────────────────────────────

  /**
   * Entry point called by MatchConsumerService when a match.found event arrives.
   * Creates the session then fetches user history + question in the background.
   */
  async createFromMatchEvent(data: {
    matchId: string;
    userAId: string;
    userBId: string;
    topic: string;
    userADifficulty: string | null;
    userBDifficulty: string | null;
  }): Promise<void> {
    await this.create(data);
    // Fetch question async — timeout fallback in create() handles the case where this is slow
    this.fetchAndAttachQuestion(
      data.matchId,
      data.userAId,
      data.userBId,
      data.topic,
      data.userADifficulty,
      data.userBDifficulty,
    ).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`fetchAndAttachQuestion error: ${message}`);
    });
  }

  private async fetchAndAttachQuestion(
    sessionId: string,
    userAId: string,
    userBId: string,
    topic: string,
    userADifficulty: string | null,
    userBDifficulty: string | null,
  ): Promise<void> {
    // Step 2: Fetch both users' attempted question IDs (best-effort; failure → empty exclude list)
    const [historyA, historyB] = await Promise.all([
      this.fetchUserHistory(userAId),
      this.fetchUserHistory(userBId),
    ]);
    const attemptedQuestionIds = [...new Set([...historyA, ...historyB])];

    // Step 3: Fetch question from question service
    const questionServiceUrl =
      this.configService.get<string>('QUESTION_SERVICE_URL') ??
      'http://localhost:3002';
    const difficulty = resolveDifficulty(userADifficulty, userBDifficulty);

    try {
      const res = await fetch(`${questionServiceUrl}/questions/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          difficulty,
          attemptedQuestionIds,
        }),
      });
      if (!res.ok) throw new Error(`Question service returned ${res.status}`);
      const question = (await res.json()) as Question;

      // Guard: don't overwrite if timeout fallback already fired
      const session = this.sessions.get(sessionId);
      if (!session || session.status !== 'waiting') {
        this.logger.log(
          `Session ${sessionId} already active — skipping late question fetch`,
        );
        return;
      }
      await this.attachQuestion(sessionId, question);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Question fetch failed (${message}) — timeout fallback will handle it`,
      );
    }
  }

  private async fetchUserHistory(userId: string): Promise<string[]> {
    const userServiceUrl =
      this.configService.get<string>('USER_SERVICE_URL') ??
      'http://localhost:3001';
    try {
      const res = await fetch(`${userServiceUrl}/users/${userId}/history`);
      if (!res.ok) return [];
      const data = (await res.json()) as { questionId?: string }[];
      return data
        .map((a) => a.questionId)
        .filter((id): id is string => Boolean(id));
    } catch {
      return [];
    }
  }

  // ─── MongoDB session state persistence ───────────────────────────────────

  private async saveSessionState(
    session: Session,
    extra?: { publishedToStream?: boolean; endedAt?: Date },
  ): Promise<void> {
    try {
      await this.sessionStateModel.findOneAndUpdate(
        { sessionId: session.sessionId },
        {
          $set: {
            sessionId: session.sessionId,
            user1Id: session.userAId,
            user2Id: session.userBId,
            questionId: session.question?.questionId ?? undefined,
            questionTitle: session.question?.title ?? undefined,
            questionTopics: session.question?.topic ?? undefined,
            questionDifficulty: session.question?.difficulty ?? undefined,
            language: session.language,
            code: session.code,
            hintsUsed: session.revealedHints,
            testCasesPassed: session.testCasesPassed,
            whiteboardState: { elements: session.whiteboardElements },
            whiteboardScreenshot: session.whiteboardScreenshot ?? undefined,
            status: session.status === 'ended' ? 'ended' : 'active',
            startedAt: session.createdAt,
            lastSavedAt: new Date(),
            ...(extra?.publishedToStream !== undefined && {
              publishedToStream: extra.publishedToStream,
            }),
            ...(extra?.endedAt !== undefined && { endedAt: extra.endedAt }),
          },
        },
        { upsert: true, new: true },
      );
      this.initialUpsertSent.add(session.sessionId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to save session state for ${session.sessionId}: ${message}`,
      );
    }
  }

  private scheduleStateSave(session: Session): void {
    const existing = this.stateSaveTimers.get(session.sessionId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.stateSaveTimers.delete(session.sessionId);
      this.saveSessionState(session).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Scheduled state save failed for ${session.sessionId}: ${message}`,
        );
      });
    }, STATE_SAVE_DEBOUNCE_MS);
    this.stateSaveTimers.set(session.sessionId, timer);
  }

  private async recoverUnpublishedSessions(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 5 * 1000);
      const unpublished = await this.sessionStateModel.find({
        status: 'ended',
        publishedToStream: false,
        endedAt: { $lt: cutoff },
      });

      if (unpublished.length === 0) return;
      this.logger.log(
        `Recovering ${unpublished.length} unpublished session(s)...`,
      );

      for (const doc of unpublished) {
        const session: Session = {
          sessionId: doc.sessionId,
          userAId: doc.user1Id,
          userBId: doc.user2Id,
          matchId: doc.sessionId,
          topic: '',
          question: doc.questionId
            ? ({
                questionId: doc.questionId,
                title: doc.questionTitle ?? '',
                topic: doc.questionTopics ?? [],
                difficulty: doc.questionDifficulty ?? '',
              } as Question)
            : null,
          whiteboardElements: [],
          whiteboardScreenshot: doc.whiteboardScreenshot ?? undefined,
          code: doc.code ?? '',
          language: doc.language ?? 'python',
          revealedHints: doc.hintsUsed,
          testCasesPassed: doc.testCasesPassed,
          status: 'ended',
          createdAt: doc.startedAt,
        };

        const published = await this.publishSessionCompleted(session);
        if (published) {
          await this.sessionStateModel.findOneAndUpdate(
            { sessionId: doc.sessionId },
            { $set: { publishedToStream: true } },
          );
          // Remove stale Redis key — it may still exist with status 'active'
          // if the session ended while Redis was down
          try {
            await this.redis.del(`${REDIS_PREFIX}${doc.sessionId}`);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(
              `Failed to clean up Redis key for recovered session ${doc.sessionId}: ${message}`,
            );
          }
          this.logger.log(`Recovered and republished session ${doc.sessionId}`);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`recoverUnpublishedSessions failed: ${message}`);
    }
  }

  private async publishSessionCompleted(session: Session): Promise<boolean> {
    const duration = Date.now() - new Date(session.createdAt).getTime();
    try {
      await this.redis.xadd(
        'session.completed',
        '*',
        'sessionId',
        session.sessionId,
        'userAId',
        session.userAId,
        'userBId',
        session.userBId,
        'questionId',
        session.question?.questionId ?? '',
        'questionTitle',
        session.question?.title ?? '',
        'topic',
        (session.question?.topic ?? []).join(','),
        'difficulty',
        session.question?.difficulty ?? '',
        'code',
        session.code,
        'language',
        session.language,
        'hintsUsed',
        String(session.revealedHints),
        'testCasesPassed',
        String(session.testCasesPassed),
        'duration',
        String(duration),
        'whiteboardScreenshot',
        session.whiteboardScreenshot ?? '',
      );
      this.logger.log(`Published session.completed for ${session.sessionId}`);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to publish session.completed: ${message}`);
      return false;
    }
  }

  startPendingEndRetry(sessionId: string): void {
    if (this.pendingEndRetryTimers.has(sessionId)) return;

    const timer = setInterval(() => {
      void (async () => {
        const session = this.sessions.get(sessionId);
        if (!session) {
          clearInterval(timer);
          this.pendingEndRetryTimers.delete(sessionId);
          return;
        }

        const redisHealthy = await this.isRedisHealthy();

        if (redisHealthy) {
          clearInterval(timer);
          this.pendingEndRetryTimers.delete(sessionId);
          await this.endSession(sessionId);
          // endSession:confirmed is emitted inside endSession()
          return;
        }

        const elapsed = Date.now() - (session.pendingEndSince ?? Date.now());
        if (elapsed >= PENDING_END_TIMEOUT_MS) {
          clearInterval(timer);
          this.pendingEndRetryTimers.delete(sessionId);
          await this.endSession(sessionId, {
            forceBypassRedis: true,
            suppressConfirmedEmit: true,
          });
          if (this.io) {
            this.io.to(sessionId).emit('endSession:forced', {
              message:
                'Session ended. Your attempt history will be saved shortly.',
            });
          }
        }
      })();
    }, PENDING_END_RETRY_MS);
    this.pendingEndRetryTimers.set(sessionId, timer);
  }

  // ─── Disconnect / reconnect handling ─────────────────────────────────────

  /**
   * Called when a user joins a session room. Cancels any pending idle timer.
   */
  onUserJoined(sessionId: string): void {
    const timer = this.idleTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(sessionId);
      this.idleTimerExpiry.delete(sessionId);
      this.logger.log(
        `Idle timer cancelled — user rejoined session ${sessionId}`,
      );
    }
  }

  /**
   * Called when a user disconnects. Checks if the room is now empty and, if so,
   * starts a 2-minute idle timer that auto-terminates the session.
   */
  onUserLeft(sessionId: string, io: Server): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === 'ended') return;

    // Count remaining sockets in the room
    const room = io.sockets.adapter.rooms.get(sessionId);
    const remaining = room ? room.size : 0;

    if (remaining > 0) return; // partner is still connected

    this.logger.log(
      `All users left session ${sessionId} — starting ${IDLE_TIMEOUT_MS / 1000}s idle timer`,
    );
    this.idleTimerExpiry.set(sessionId, Date.now() + IDLE_TIMEOUT_MS);
    const timer = setTimeout(() => {
      this.idleTimers.delete(sessionId);
      this.idleTimerExpiry.delete(sessionId);
      this.logger.log(
        `Idle timeout reached — auto-terminating session ${sessionId}`,
      );
      void this.endSession(sessionId);
    }, IDLE_TIMEOUT_MS);
    this.idleTimers.set(sessionId, timer);
  }

  // ─── Active session lookup (for rejoin flow) ──────────────────────────────

  async getActiveSessionForUser(userId: string): Promise<{
    sessionId: string;
    otherUserId: string;
    questionId?: string;
    language: string;
    remainingMs: number;
    startedAt: Date;
  } | null> {
    // 1. In-memory map
    for (const [, session] of this.sessions) {
      if (
        (session.userAId === userId || session.userBId === userId) &&
        session.status === 'active'
      ) {
        const otherUserId =
          session.userAId === userId ? session.userBId : session.userAId;
        const expiry = this.idleTimerExpiry.get(session.sessionId);
        const remainingMs = expiry
          ? Math.max(0, expiry - Date.now())
          : IDLE_TIMEOUT_MS;
        return {
          sessionId: session.sessionId,
          otherUserId,
          questionId: session.question?.questionId,
          language: session.language,
          remainingMs,
          startedAt: session.createdAt,
        };
      }
    }

    // 2. Redis fallback
    try {
      const keys = await this.redis.keys(`${REDIS_PREFIX}*`);
      for (const key of keys) {
        const raw = await this.redis.get(key);
        if (!raw) continue;
        const session = JSON.parse(raw) as Session;
        if (
          (session.userAId === userId || session.userBId === userId) &&
          session.status === 'active'
        ) {
          // Cross-check MongoDB: if the session isn't in memory, the Redis key
          // may be stale (e.g. ended while Redis was down, del failed)
          if (!this.sessions.has(session.sessionId)) {
            const mongoDoc = await this.sessionStateModel
              .findOne({ sessionId: session.sessionId }, { status: 1 })
              .lean();
            if (mongoDoc?.status === 'ended') {
              await this.redis.del(key).catch(() => {});
              continue;
            }
          }
          const otherUserId =
            session.userAId === userId ? session.userBId : session.userAId;
          return {
            sessionId: session.sessionId,
            otherUserId,
            questionId: session.question?.questionId,
            language: session.language,
            remainingMs: IDLE_TIMEOUT_MS,
            startedAt: new Date(session.createdAt),
          };
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Redis lookup failed in getActiveSessionForUser: ${message}`,
      );
    }

    // 3. MongoDB fallback — sessions saved within the last 2-minute idle window
    try {
      const cutoff = new Date(Date.now() - IDLE_TIMEOUT_MS);
      const doc = await this.sessionStateModel.findOne({
        $or: [{ user1Id: userId }, { user2Id: userId }],
        status: 'active',
        lastSavedAt: { $gte: cutoff },
      });
      if (doc) {
        const otherUserId = doc.user1Id === userId ? doc.user2Id : doc.user1Id;
        const remainingMs = Math.max(
          0,
          IDLE_TIMEOUT_MS - (Date.now() - doc.lastSavedAt.getTime()),
        );
        return {
          sessionId: doc.sessionId,
          otherUserId,
          questionId: doc.questionId,
          language: doc.language ?? 'python',
          remainingMs,
          startedAt: doc.startedAt,
        };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `MongoDB lookup failed in getActiveSessionForUser: ${message}`,
      );
    }

    return null;
  }

  private getMockQuestion(): Question {
    // return {
    //     questionId: 'MOCK-001',
    //     title: `Mock ${topic} Question`,
    //     topic,
    //     difficulty: 'Easy',
    //     description: 'This is a placeholder question — Question Service did not respond in time.',
    //     constraints: ['1 ≤ n ≤ 10⁴'],
    //     examples: [],
    //     hints: ['Try a brute force approach first.', 'Can you improve the time complexity?'],
    //     testCases: {
    //         sample: [{ input: 'input1', expectedOutput: 'output1' }],
    //         hidden: [],
    //     },
    // };
    return {
      questionId: 'binary-search',
      title: 'Binary Search',
      topic: ['Binary Search', 'Math'],
      difficulty: 'Easy',
      description:
        'Given an array of integers nums sorted in ascending order and an integer target, write a function to search for target in nums. If target exists return its index, otherwise return -1.',
      constraints: ['1 <= nums.length <= 10^4'],
      examples: [],
      hints: [
        'Compare the target with the middle element and eliminate half the array each time',
        '123',
      ],
      testCases: {
        sample: [{ input: '-1 0 3 5 9 12\n9', expectedOutput: '4' }],
        hidden: [{ input: '-1 0 3 5 9 12\n2', expectedOutput: '-1' }],
      },
    };
  }
}
