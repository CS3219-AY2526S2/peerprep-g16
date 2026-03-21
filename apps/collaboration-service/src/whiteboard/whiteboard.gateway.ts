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

@WebSocketGateway({ cors: { origin: '*' } })
export class WhiteboardGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly sessionsService: SessionsService) {}

    // called once WebSocket server is ready — pass server ref to SessionsService
    afterInit(server: Server) {
        this.sessionsService.setServer(server);
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
        client.join(data.sessionId);
        console.log(`User ${data.userId} joined session ${data.sessionId}`);
        client.emit('whiteboardState', { elements: session.whiteboardElements });
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
}