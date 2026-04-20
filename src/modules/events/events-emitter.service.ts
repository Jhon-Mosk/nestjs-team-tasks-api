import { Injectable } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsEmitterService {
  constructor(private readonly gateway: EventsGateway) {}

  emitToUser<T>(userId: string, event: string, payload: T): void {
    this.gateway.emitToUser(userId, event, payload);
  }
}
