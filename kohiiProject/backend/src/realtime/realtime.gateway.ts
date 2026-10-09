import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { Role } from '../common/enums/role.enum.js';

/** Admin lang ang nakikinig dito; naririnig niya ang lahat ng store */
export const ADMIN_ROOM = 'role:admin';
export const storeRoom = (storeId: number) => `store:${storeId}`;

/**
 * Iisang gateway para sa lahat ng live update (stock, order, shift).
 * Parehong JWT token ng REST API ang ginagamit sa socket handshake (`auth.token` o `?token=`).
 */
@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);

    try {
      if (!token) throw new Error('No token');
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      client.data.user = payload;

      // Admin: naririnig ang lahat ng store. Clerk/Cashier: sariling store lang.
      if (payload.role === Role.ADMIN) {
        await client.join(ADMIN_ROOM);
      }
      if (payload.storeId) {
        await client.join(storeRoom(payload.storeId));
      }
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }
}
