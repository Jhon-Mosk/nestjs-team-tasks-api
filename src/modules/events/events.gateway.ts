import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { userRoom } from './events.constants';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  private readonly logger = new Logger(EventsGateway.name);

  private extractAccessToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.['token'] as string | undefined;
    if (typeof fromAuth === 'string' && fromAuth.length > 0) return fromAuth;

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string') {
      const [scheme, token] = header.split(' ');
      if (scheme?.toLowerCase() === 'bearer' && token) return token;
    }

    return null;
  }

  emitToUser<T>(userId: string, event: string, payload: T): void {
    this.server.to(userRoom(userId)).emit(event, payload);
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractAccessToken(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      await client.join(userRoom(payload.sub));
      this.logger.debug(`WS connected user=${payload.sub} socket=${client.id}`);
    } catch (error) {
      this.logger.warn({ error }, 'WS auth failed');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`WS disconnected socket=${client.id}`);
  }
}
