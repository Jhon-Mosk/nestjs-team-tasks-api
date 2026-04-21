import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { userRoom } from './events.constants';
import { EventsGateway } from './events.gateway';

describe('EventsGateway', () => {
  it('disconnects when no token provided', async () => {
    const verifyAsync = jest.fn();
    const jwtService = { verifyAsync } as unknown as JwtService;
    const gateway = new EventsGateway(jwtService);

    const disconnect = jest.fn();
    const client = {
      id: 's1',
      handshake: { auth: {}, headers: {} },
      disconnect,
    } as unknown as Socket;

    await gateway.handleConnection(client);

    expect(disconnect).toHaveBeenCalledWith(true);
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('joins room when token is valid', async () => {
    const verifyAsync = jest.fn().mockResolvedValue({ sub: 'u1' });
    const jwtService = { verifyAsync } as unknown as JwtService;
    const gateway = new EventsGateway(jwtService);

    const join = jest.fn().mockResolvedValue(undefined);
    const disconnect = jest.fn();
    const client = {
      id: 's2',
      handshake: { auth: { token: 't' }, headers: {} },
      join,
      disconnect,
    } as unknown as Socket;

    await gateway.handleConnection(client);

    expect(verifyAsync).toHaveBeenCalledWith('t');
    expect(join).toHaveBeenCalledWith(userRoom('u1'));
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('emits to user room', () => {
    const jwtService = { verifyAsync: jest.fn() } as unknown as JwtService;
    const gateway = new EventsGateway(jwtService);

    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    gateway.server = { to } as unknown as Server;

    gateway.emitToUser('u1', 'evt', { a: 1 });

    expect(to).toHaveBeenCalledWith(userRoom('u1'));
    expect(emit).toHaveBeenCalledWith('evt', { a: 1 });
  });
});
