import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';

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
    status: 'waiting' | 'active' | 'ended';  // added 'waiting'
    createdAt: Date;
}

@Injectable()
export class SessionsService {
    private readonly logger = new Logger(SessionsService.name);
    private sessions = new Map<string, Session>();

    // set by WhiteboardGateway once WebSocket server is ready
    private io: Server | null = null;

    constructor(private readonly configService: ConfigService) {}

    /**
     * Called by WhiteboardGateway after WebSocket server initialises.
     * Allows SessionsService to push events to session rooms.
     */
    setServer(io: Server) {
        this.io = io;
    }

    /**
     * Creates a session immediately with status 'waiting', then fetches
     * the question from Question Service in the background.
     * Once question is ready, emits 'questionReady' to both users in the room.
     *
     * Called by Matching Service (service-to-service, no auth needed).
     *
     * POST /sessions/create
     * Body: { userAId, userBId, matchId, topic, userADifficulty, userBDifficulty }
     * Returns: session with status 'waiting'
     *
     * Frontend should:
     * 1. Join the WebSocket room: socket.emit('joinSession', { sessionId, userId })
     * 2. Call GET /sessions/:sessionId to check current status
     * 3. If status === 'waiting', show loading screen
     * 4. Listen for 'questionReady' event to start the collab room
     */
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
            status: 'waiting',
            createdAt: new Date(),
        };

        this.sessions.set(data.matchId, session);
        this.logger.log(`Session created (waiting): ${data.matchId}`);

        // fetch question in background — don't block the response
        this.fetchAndAttachQuestion(data).catch(err =>
            this.logger.error(`Failed to fetch question for ${data.matchId}: ${err.message}`)
        );

        return session;
    }

    /**
     * Fetches question and attaches it to the session.
     * Emits 'questionReady' to the session room when done.
     */
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

        // push to both users in the room
        if (this.io) {
            this.io.to(data.matchId).emit('questionReady', { question });
        }
    }

    /**
     * Returns session by sessionId.
     * Called by Frontend on collab page load.
     *
     * GET /sessions/:sessionId
     * If status is 'waiting' → frontend shows loading screen and listens for 'questionReady'
     * If status is 'active' → frontend renders collab room immediately
     */
    findOne(sessionId: string): Session | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * Ends a session and saves final state.
     * Called by Frontend when user clicks "End Session".
     *
     * POST /sessions/:sessionId/end
     * TODO: send final code + whiteboardElements to User Service before deleting.
     */
    async endSession(sessionId: string): Promise<Session | undefined> {
        const session = this.sessions.get(sessionId);
        if (!session) return undefined;

        session.status = 'ended';

        // TODO: save attempt to User Service
        // await this.saveAttemptToUserService(session);

        this.sessions.delete(sessionId);
        this.logger.log(`Session ended: ${sessionId}`);
        return session;
    }

    /**
     * Updates whiteboard elements for a session.
     * Called internally by WhiteboardGateway on 'whiteboardUpdate' event.
     */
    updateWhiteboard(sessionId: string, elements: any[]): void {
        const session = this.sessions.get(sessionId);
        if (session) session.whiteboardElements = elements;
    }

    /**
     * Updates shared code editor content for a session.
     * Called internally by WhiteboardGateway on 'codeUpdate' event.
     */
    updateCode(sessionId: string, code: string, language?: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.code = code;
            if (language) session.language = language;
        }
    }

    /**
     * Fetches a question from Question Service.
     *
     * TODO: Question Service needs to implement:
     * GET /questions/match?topic=&userADifficulty=&userBDifficulty=&userAId=&userBId=
     *
     * Logic in Question Service:
     * - Filter questions not attempted by either user
     * - Match topic and lower of the two difficulty levels
     * - If no match, relax difficulty then recency window
     * - Randomly sample from eligible pool
     */
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