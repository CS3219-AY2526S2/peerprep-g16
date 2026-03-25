import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import Redis from 'ioredis';

export interface Session {
    sessionId: string;
    userAId: string;
    userBId: string;
    matchId: string;
    topic: string;
    question: any;
    whiteboardElements: any[];
    code: string;
    language: string;
    revealedHints: number;
    status: 'waiting' | 'active' | 'ended';
    createdAt: Date;
}

const REDIS_PREFIX = 'collab:session:';
const FLUSH_DELAY_MS = 5000;
const DEFAULT_QUESTION_TIMEOUT_MS = 10000;

@Injectable()
export class SessionsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SessionsService.name);
    private sessions = new Map<string, Session>();
    private io: Server | null = null;
    private redis: Redis;
    private flushTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private questionTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

    constructor(private readonly configService: ConfigService) {
        const redisUrl = this.configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        this.redis = new Redis(redisUrl, { lazyConnect: true });
        this.redis.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
    }

    async onModuleInit() {
        try {
            await this.redis.connect();
            this.logger.log('Connected to Redis');
            await this.restoreFromRedis();
        } catch (err) {
            this.logger.warn(`Could not connect to Redis — running without persistence: ${err.message}`);
        }
    }

    async onModuleDestroy() {
        for (const timer of this.questionTimeouts.values()) clearTimeout(timer);
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
            this.flushToRedis(sessionId);
        }, FLUSH_DELAY_MS);
        this.flushTimers.set(sessionId, timer);
    }

    private async flushToRedis(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        try {
            await this.redis.set(`${REDIS_PREFIX}${sessionId}`, JSON.stringify(session));
        } catch (err) {
            this.logger.error(`Failed to persist session ${sessionId}: ${err.message}`);
        }
    }

    private async restoreFromRedis(): Promise<void> {
        try {
            const keys = await this.redis.keys(`${REDIS_PREFIX}*`);
            for (const key of keys) {
                const raw = await this.redis.get(key);
                if (!raw) continue;
                const session: Session = JSON.parse(raw);
                if (session.status === 'ended') {
                    await this.redis.del(key);
                    continue;
                }
                this.sessions.set(session.sessionId, session);
                this.logger.log(`Restored session from Redis: ${session.sessionId}`);
            }
            if (keys.length > 0) {
                this.logger.log(`Restored ${keys.length} session(s) from Redis`);
            }
        } catch (err) {
            this.logger.error(`Failed to restore sessions from Redis: ${err.message}`);
        }
    }

    // ─── Session lifecycle ────────────────────────────────────────────────────

    async create(data: {
        userAId: string;
        userBId: string;
        matchId: string;
        topic: string;
        userADifficulty: string;
        userBDifficulty: string;
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
            status: 'waiting',
            createdAt: new Date(),
        };

        this.sessions.set(data.matchId, session);
        this.logger.log(`Session created (waiting): ${data.matchId}`);

        // Persist immediately so a crash right after creation doesn't lose it
        await this.flushToRedis(data.matchId);

        // Fall back to mock question if Question Service doesn't respond in time
        const timeoutMs = this.configService.get<number>('QUESTION_TIMEOUT_MS') ?? DEFAULT_QUESTION_TIMEOUT_MS;
        const timer = setTimeout(async () => {
            this.questionTimeouts.delete(data.matchId);
            const s = this.sessions.get(data.matchId);
            if (!s || s.status !== 'waiting') return; // question already arrived
            this.logger.warn(`Question Service timed out for ${data.matchId} — using mock question`);
            await this.attachQuestion(data.matchId, this.getMockQuestion(data.topic));
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
    async attachQuestion(sessionId: string, question: any): Promise<void> {
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
        this.logger.log(`Question attached by Question Service, session active: ${sessionId}`);

        await this.flushToRedis(sessionId);

        if (this.io) {
            this.io.to(sessionId).emit('questionReady', { question });
        }
    }

    findOne(sessionId: string): Session | undefined {
        return this.sessions.get(sessionId);
    }

    async endSession(sessionId: string): Promise<Session | undefined> {
        const session = this.sessions.get(sessionId);
        if (!session) return undefined;

        session.status = 'ended';

        // Cancel question fallback timer if session ends before it fires
        const qTimer = this.questionTimeouts.get(sessionId);
        if (qTimer) {
            clearTimeout(qTimer);
            this.questionTimeouts.delete(sessionId);
        }

        // Cancel any pending flush and do a final immediate write, then clean up
        const timer = this.flushTimers.get(sessionId);
        if (timer) {
            clearTimeout(timer);
            this.flushTimers.delete(sessionId);
        }

        // TODO: send final state to User Service here before deleting
        // await this.saveAttemptToUserService(session);

        this.sessions.delete(sessionId);
        try {
            await this.redis.del(`${REDIS_PREFIX}${sessionId}`);
        } catch (err) {
            this.logger.error(`Failed to delete Redis key for ${sessionId}: ${err.message}`);
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
    }

    updateRevealedHints(sessionId: string, count: number): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        session.revealedHints = count;
        this.scheduleFlush(sessionId);
    }

    private getMockQuestion(topic: string): any {
        return {
            questionId: 'MOCK-001',
            title: `Mock ${topic} Question`,
            topic,
            difficulty: 'Easy',
            description: 'This is a placeholder question — Question Service did not respond in time.',
            constraints: ['1 ≤ n ≤ 10⁴'],
            examples: [],
            hints: ['Try a brute force approach first.', 'Can you improve the time complexity?'],
            testCases: {
                sample: [{ input: 'input1', expectedOutput: 'output1' }],
                hidden: [],
            },
        };
    }
}
