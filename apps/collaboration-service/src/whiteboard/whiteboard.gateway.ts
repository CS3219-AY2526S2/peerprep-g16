import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionsService } from '../sessions/sessions.service';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({ cors: { origin: '*' } })
export class WhiteboardGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly sessionsService: SessionsService,
        private readonly configService: ConfigService,
    ) {}

    afterInit(server: Server) {
        this.sessionsService.setServer(server);

        // verify JWT before allowing WebSocket connection
        server.use((socket, next) => {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error('No token provided'));
            }

            const secret = this.configService.get<string>('JWT_SECRET');
            if (!secret) return next(new Error('JWT_SECRET not configured'));

            try {
                const payload = jwt.verify(token, secret) as { id: string; isAdmin: boolean };

                if (payload.isAdmin) {
                    return next(new Error('Admins cannot access collaboration sessions'));
                }

                // attach user to socket for use in handlers
                (socket as any).user = payload;
                next();
            } catch (err) {
                return next(new Error('Invalid or expired token'));
            }
        });
    }

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('joinSession')
    handleJoinSession(
        @MessageBody() data: { sessionId: string; userId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const session = this.sessionsService.findOne(data.sessionId);
        if (!session) {
            client.emit('error', { message: 'Session not found' });
            return;
        }

        // check user belongs to this session
        const user = (client as any).user;
        if (session.userAId !== user.id && session.userBId !== user.id) {
            client.emit('error', { message: 'You are not part of this session' });
            return;
        }

        client.join(data.sessionId);
        console.log(`User ${user.id} joined session ${data.sessionId}`);
        client.emit('whiteboardState', { elements: session.whiteboardElements });
        client.emit('codeState', { code: session.code, language: session.language });
        client.emit('hintState', { revealedCount: session.revealedHints });
    }

    @SubscribeMessage('whiteboardUpdate')
    handleWhiteboardUpdate(
        @MessageBody() data: { sessionId: string; userId: string; elements: any[] },
        @ConnectedSocket() client: Socket,
    ) {
        this.sessionsService.updateWhiteboard(data.sessionId, data.elements);
        client.to(data.sessionId).emit('whiteboardUpdate', {
            elements: data.elements,
            userId: data.userId,
        });
    }

    @SubscribeMessage('codeUpdate')
    handleCodeUpdate(
        @MessageBody() data: { sessionId: string; userId: string; code: string; language?: string },
        @ConnectedSocket() client: Socket,
    ) {
        this.sessionsService.updateCode(data.sessionId, data.code, data.language);
        client.to(data.sessionId).emit('codeUpdate', {
            code: data.code,
            language: data.language,
            userId: data.userId,
        });
    }

    @SubscribeMessage('codeState')
    handleCodeState(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const session = this.sessionsService.findOne(data.sessionId);
        if (!session) {
            client.emit('error', { message: 'Session not found' });
            return;
        }
        client.emit('codeState', { code: session.code, language: session.language });
    }

    @SubscribeMessage('voice:offer')
    handleVoiceOffer(
        @MessageBody() data: { sessionId: string; offer: RTCSessionDescriptionInit },
        @ConnectedSocket() client: Socket,
    ) {
        client.to(data.sessionId).emit('voice:offer', { offer: data.offer });
    }

    @SubscribeMessage('voice:answer')
    handleVoiceAnswer(
        @MessageBody() data: { sessionId: string; answer: RTCSessionDescriptionInit },
        @ConnectedSocket() client: Socket,
    ) {
        client.to(data.sessionId).emit('voice:answer', { answer: data.answer });
    }

    @SubscribeMessage('voice:ice-candidate')
    handleIceCandidate(
        @MessageBody() data: { sessionId: string; candidate: RTCIceCandidateInit },
        @ConnectedSocket() client: Socket,
    ) {
        client.to(data.sessionId).emit('voice:ice-candidate', { candidate: data.candidate });
    }

    @SubscribeMessage('voice:end')
    handleVoiceEnd(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.to(data.sessionId).emit('voice:end');
    }

    @SubscribeMessage('hint:request')
    handleHintRequest(
        @MessageBody() data: { sessionId: string; hintIndex: number },
        @ConnectedSocket() client: Socket,
    ) {
        client.to(data.sessionId).emit('hint:request', { hintIndex: data.hintIndex });
    }

    @SubscribeMessage('hint:approve')
    handleHintApprove(
        @MessageBody() data: { sessionId: string; hintIndex: number },
        @ConnectedSocket() client: Socket,
    ) {
        this.sessionsService.updateRevealedHints(data.sessionId, data.hintIndex + 1);
        client.to(data.sessionId).emit('hint:approve', { hintIndex: data.hintIndex });
    }

    @SubscribeMessage('hint:decline')
    handleHintDecline(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.to(data.sessionId).emit('hint:decline');
    }

    @SubscribeMessage('code:run')
    handleCodeRun(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.to(data.sessionId).emit('code:run');
    }

    @SubscribeMessage('code:result')
    handleCodeResult(
        @MessageBody() data: { sessionId: string; output: any },
        @ConnectedSocket() client: Socket,
    ) {
        // Track how many test cases passed so it can be saved on session end
        if (data.output?.type === 'tests' && Array.isArray(data.output.results)) {
            const passed = data.output.results.filter((r: any) => r.passed).length;
            this.sessionsService.updateTestCasesPassed(data.sessionId, passed);
        }
        client.to(data.sessionId).emit('code:result', { output: data.output });
    }

    @SubscribeMessage('endSession:request')
    handleEndSessionRequest(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.to(data.sessionId).emit('endSession:request');
    }

    @SubscribeMessage('endSession:decline')
    handleEndSessionDecline(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.to(data.sessionId).emit('endSession:decline');
    }

    @SubscribeMessage('endSession:approve')
    async handleEndSessionApprove(
        @MessageBody() data: { sessionId: string },
    ) {
        await this.sessionsService.endSession(data.sessionId);
        this.server.to(data.sessionId).emit('endSession:confirmed');
    }
}