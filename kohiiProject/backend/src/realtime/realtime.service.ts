import { Injectable } from '@nestjs/common';
import { ADMIN_ROOM, RealtimeGateway, storeRoom } from './realtime.gateway.js';

/**
 * Gamitin ito sa ibang module (hal. InventoryService, OrdersService) para mag-push ng live update.
 * Hindi kailangang alamin ng caller ang Socket.IO mismo — tatlong event lang ang simula: stock, order, shift.
 */
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  /** Centralized ang inventory: pareho ang nakikita ng lahat ng konektadong device */
  emitStockUpdated(item: unknown) {
    this.gateway.server.emit('stock:updated', item);
  }

  emitStockLow(item: unknown) {
    this.gateway.server.emit('stock:low', item);
  }

  /** Order: admin (monitoring) + sariling store lang */
  emitOrderCreated(storeId: number, order: unknown) {
    this.gateway.server.to(ADMIN_ROOM).to(storeRoom(storeId)).emit('order:created', order);
  }

  emitShiftChanged(storeId: number, shift: unknown) {
    this.gateway.server.to(ADMIN_ROOM).to(storeRoom(storeId)).emit('shift:changed', shift);
  }
}
