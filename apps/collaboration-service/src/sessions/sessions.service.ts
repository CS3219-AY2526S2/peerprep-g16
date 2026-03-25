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

@Injectable()
export class SessionsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SessionsService.name);
    private sessions = new Map<string, Session>();
    private io: Server | null = null;
    private redis: Redis;
    private flushTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
        // Flush all pending timers before shutdown
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

        this.fetchAndAttachQuestion(data).catch(err =>
            this.logger.error(`Failed to fetch question for ${data.matchId}: ${err.message}`)
        );

        return session;
    }

    findOne(sessionId: string): Session | undefined {
        return this.sessions.get(sessionId);
    }

    async endSession(sessionId: string): Promise<Session | undefined> {
        const session = this.sessions.get(sessionId);
        if (!session) return undefined;

        session.status = 'ended';

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

    // ─── Question fetching ────────────────────────────────────────────────────

    private async fetchAndAttachQuestion(data: {
        matchId: string;
        topic: string;
        userADifficulty: string;
        userBDifficulty: string;
        userAId: string;
        userBId: string;
    }): Promise<void> {
        const question = await this.fetchQuestion(
            data.topic,
            data.userADifficulty,
            data.userBDifficulty,
            data.userAId,
            data.userBId,
        );

        const session = this.sessions.get(data.matchId);
        if (!session) return;

        session.question = question;
        session.status = 'active';
        this.logger.log(`Question attached, session active: ${data.matchId}`);

        await this.flushToRedis(data.matchId);

        if (this.io) {
            this.io.to(data.matchId).emit('questionReady', { question });
        }
    }

    private async fetchQuestion(
        topic: string,
        userADifficulty: string,
        userBDifficulty: string,
        userAId: string,
        userBId: string,
    ): Promise<any> {
        const questionServiceUrl = this.configService.get<string>('QUESTION_SERVICE_URL');

        if (!questionServiceUrl) {
            this.logger.warn('QUESTION_SERVICE_URL not set — using mock question');
            return this.getMockQuestion(topic);
        }

        try {
            const url = `${questionServiceUrl}/questions/match?topic=${topic}&userADifficulty=${userADifficulty}&userBDifficulty=${userBDifficulty}&userAId=${userAId}&userBId=${userBId}`;
            const response = await fetch(url);
            if (!response.ok) {
                this.logger.warn('Question Service error — falling back to mock');
                return this.getMockQuestion(topic);
            }
            return await response.json();
        } catch (err) {
            this.logger.warn('Could not reach Question Service — falling back to mock');
            return this.getMockQuestion(topic);
        }
    }

    private getMockQuestion(topic: string): any {
        return {
            questionId: 'MOCK-001',
            title: `Mock ${topic} Question`,
            topic,
            difficulty: 'Easy',
            description: 'This is a placeholder question. Question Service is not yet connected.',
            constraints: ['Constraint 1', 'Constraint 2'],
            examples: ['Example 1', 'Example 2'],
            hints: ['Hint 1', 'Hint 2'],
            testCases: {
                sample: [
                    { input: 'input1', expectedOutput: 'output1' },
                    { input: 'input2', expectedOutput: 'output2' },
                ],
                hidden: [
                    { input: 'hiddenInput1', expectedOutput: 'hiddenOutput1' },
                    { input: 'hiddenInput2', expectedOutput: 'hiddenOutput2' },
                ],
            },
        };
    }
}
