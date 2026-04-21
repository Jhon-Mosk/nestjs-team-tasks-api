import { EventsEmitterService } from './events-emitter.service';

describe('EventsEmitterService', () => {
  it('delegates to gateway.emitToUser', () => {
    const emitToUser = jest.fn();
    const gateway = { emitToUser } as never;

    const service = new EventsEmitterService(gateway);
    service.emitToUser('u1', 'evt', { ok: true });

    expect(emitToUser).toHaveBeenCalledWith('u1', 'evt', { ok: true });
  });
});
