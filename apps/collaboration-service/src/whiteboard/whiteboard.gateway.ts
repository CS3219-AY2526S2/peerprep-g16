import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionsService } from '../sessions/sessions.service';

@WebSocketGateway({
    cors: { origin: '*' }, // tighten this in production
})
export class WhiteboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly sessionsService: SessionsService) { }

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    // ── Frontend emits this on page load to join the session room ────────
    // socket.emit("joinSession", { sessionId, userId })
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
        client.join(data.sessionId); // puts user in the session room
        console.log(`User ${data.userId} joined session ${data.sessionId}`);

        // send current whiteboard state to the joining user
        // so they can restore the board if they rejoin
        client.emit('whiteboardState', { elements: session.whiteboardElements });
    }

    // ── Frontend emits this on every Excalidraw onChange ─────────────────
    // socket.emit("whiteboardUpdate", { sessionId, userId, elements })
    @SubscribeMessage('whiteboardUpdate')
    handleWhiteboardUpdate(
        @MessageBody() data: { sessionId: string; userId: string; elements: any[] },
        @ConnectedSocket() client: Socket,
    ) {
        // save to in-memory store (debounce handled client-side)
        this.sessionsService.updateWhiteboard(data.sessionId, data.elements);

        // broadcast to everyone else in the room, NOT the sender
        client.to(data.sessionId).emit('whiteboardUpdate', {
            elements: data.elements,
            userId: data.userId,
        });
    }
}