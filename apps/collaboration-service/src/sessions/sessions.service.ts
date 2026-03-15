import { Injectable } from '@nestjs/common';

export interface Session {
    sessionId: string;
    userId: string;
    peerId: string;
    matchId: string;
    question: any;           // will be typed properly once Question Service is ready
    whiteboardElements: any[]; // updated live from Excalidraw
    code: string;            // updated live from code editor
    language: string;
    status: 'active' | 'ended';
    createdAt: Date;
}

@Injectable()
export class SessionsService {
    // in-memory store — replace with Redis later
    private sessions = new Map<string, Session>();

    create(data: {
        userId: string;
        peerId: string;
        matchId: string;
        question: any;
        language: string;
    }): Session {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const session: Session = {
            sessionId,
            userId: data.userId,
            peerId: data.peerId,
            matchId: data.matchId,
            question: data.question,
            whiteboardElements: [],
            code: '',
            language: data.language,
            status: 'active',
            createdAt: new Date(),
        };
        this.sessions.set(sessionId, session);
        return session;
    }

    findOne(sessionId: string): Session | undefined {
        return this.sessions.get(sessionId);
    }

    updateWhiteboard(sessionId: string, elements: any[]): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.whiteboardElements = elements;
        }
    }

    updateCode(sessionId: string, code: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.code = code;
        }
    }

    endSession(sessionId: string): Session | undefined {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'ended';
            // TODO: send whiteboardElements + code to User Service here
            // then delete from map
            this.sessions.delete(sessionId);
        }
        return session;
    }
}