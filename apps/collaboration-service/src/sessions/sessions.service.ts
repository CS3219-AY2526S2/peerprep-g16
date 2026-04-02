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
    whiteboardScreenshot?: string;
    code: string;
    language: string;
    revealedHints: number;
    testCasesPassed: number;
    status: 'waiting' | 'active' | 'ended';
    createdAt: Date;
}

const REDIS_PREFIX = 'collab:session:';
const FLUSH_DELAY_MS = 5000;
const DEFAULT_QUESTION_TIMEOUT_MS = 10000;
const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

const DIFFICULTY_RANK: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
function minDifficulty(a: string, b: string): string {
    return (DIFFICULTY_RANK[a] ?? 0) <= (DIFFICULTY_RANK[b] ?? 0) ? a : b;
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
        for (const timer of this.idleTimers.values()) clearTimeout(timer);
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
            testCasesPassed: 0,
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

        // Cancel idle disconnect timer
        const idleTimer = this.idleTimers.get(sessionId);
        if (idleTimer) {
            clearTimeout(idleTimer);
            this.idleTimers.delete(sessionId);
        }

        // Cancel any pending flush and do a final immediate write, then clean up
        const timer = this.flushTimers.get(sessionId);
        if (timer) {
            clearTimeout(timer);
            this.flushTimers.delete(sessionId);
        }

        await this.publishSessionCompleted(session);

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

    updateTestCasesPassed(sessionId: string, count: number): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        session.testCasesPassed = count;
        this.scheduleFlush(sessionId);
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
        userADifficulty: string;
        userBDifficulty: string;
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
        ).catch((err) => this.logger.error(`fetchAndAttachQuestion error: ${err.message}`));
    }

    private async fetchAndAttachQuestion(
        sessionId: string,
        userAId: string,
        userBId: string,
        topic: string,
        userADifficulty: string,
        userBDifficulty: string,
    ): Promise<void> {
        // Step 2: Fetch both users' attempted question IDs (best-effort; failure → empty exclude list)
        const [historyA, historyB] = await Promise.all([
            this.fetchUserHistory(userAId),
            this.fetchUserHistory(userBId),
        ]);
        const attemptedQuestionIds = [...new Set([...historyA, ...historyB])];

        // Step 3: Fetch question from question service
        const questionServiceUrl = this.configService.get<string>('QUESTION_SERVICE_URL') ?? 'http://localhost:3002';
        const difficulty = minDifficulty(userADifficulty, userBDifficulty);

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
            const question = await res.json();

            // Guard: don't overwrite if timeout fallback already fired
            const session = this.sessions.get(sessionId);
            if (!session || session.status !== 'waiting') {
                this.logger.log(`Session ${sessionId} already active — skipping late question fetch`);
                return;
            }
            await this.attachQuestion(sessionId, question);
        } catch (err: any) {
            this.logger.warn(`Question fetch failed (${err.message}) — timeout fallback will handle it`);
        }
    }

    private async fetchUserHistory(userId: string): Promise<string[]> {
        const userServiceUrl = this.configService.get<string>('USER_SERVICE_URL') ?? 'http://localhost:3001';
        try {
            const res = await fetch(`${userServiceUrl}/users/${userId}/history`);
            if (!res.ok) return [];
            const data = await res.json() as any[];
            return data.map((a) => a.questionId).filter(Boolean);
        } catch {
            return [];
        }
    }

    private async publishSessionCompleted(session: Session): Promise<void> {
        const duration = Date.now() - new Date(session.createdAt).getTime();
        try {
            await this.redis.xadd(
                'session.completed', '*',
                'sessionId', session.sessionId,
                'userAId', session.userAId,
                'userBId', session.userBId,
                'questionId', session.question?.questionId ?? '',
                'questionTitle', session.question?.title ?? '',
                'topic', (session.question?.topic ?? []).join(','),
                'difficulty', session.question?.difficulty ?? '',
                'code', session.code,
                'language', session.language,
                'hintsUsed', String(session.revealedHints),
                'testCasesPassed', String(session.testCasesPassed),
                'duration', String(duration),
                'whiteboardScreenshot', session.whiteboardScreenshot ?? '',
            );
            this.logger.log(`Published session.completed for ${session.sessionId}`);
        } catch (err: any) {
            this.logger.warn(`Failed to publish session.completed: ${err.message}`);
        }
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
            this.logger.log(`Idle timer cancelled — user rejoined session ${sessionId}`);
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

        this.logger.log(`All users left session ${sessionId} — starting ${IDLE_TIMEOUT_MS / 1000}s idle timer`);
        const timer = setTimeout(async () => {
            this.idleTimers.delete(sessionId);
            this.logger.log(`Idle timeout reached — auto-terminating session ${sessionId}`);
            await this.endSession(sessionId);
            io.to(sessionId).emit('endSession:confirmed');
        }, IDLE_TIMEOUT_MS);
        this.idleTimers.set(sessionId, timer);
    }

    private getMockQuestion(_topic: string): any {
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
            description: 'Given an array of integers nums sorted in ascending order and an integer target, write a function to search for target in nums. If target exists return its index, otherwise return -1.',
            constraints: ['1 <= nums.length <= 10^4'],
            examples: [],
            hints: [
                'Compare the target with the middle element and eliminate half the array each time',
                '123',
            ],
            testCases: {
                sample: [
                    { input: '-1 0 3 5 9 12\n9', expectedOutput: '4' },
                ],
                hidden: [
                    { input: '-1 0 3 5 9 12\n2', expectedOutput: '-1' },
                ],
            },
        };
    }
}
