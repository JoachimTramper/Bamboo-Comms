import { ConversationsRealtime } from './conversations.realtime';

describe('ConversationsRealtime', () => {
  let service: ConversationsRealtime;
  let emit: jest.Mock;
  let serverEmit: jest.Mock;
  let to: jest.Mock;

  beforeEach(() => {
    emit = jest.fn();
    serverEmit = jest.fn();
    to = jest.fn().mockReturnValue({ emit });

    service = new ConversationsRealtime({
      server: { to, emit: serverEmit },
    } as any);
  });

  it('emits status updates to the conversation room', () => {
    service.emitConversationStatusUpdated({
      id: 'conv-1',
      status: 'PENDING',
      previousStatus: 'OPEN',
    });

    expect(to).toHaveBeenCalledWith('conv:conv-1');
    expect(emit).toHaveBeenCalledWith(
      'conversation.status.updated',
      expect.objectContaining({
        id: 'conv-1',
        status: 'PENDING',
        previousStatus: 'OPEN',
      }),
    );
    expect(emit).toHaveBeenCalledWith(
      'conversation.updated',
      expect.objectContaining({
        id: 'conv-1',
      }),
    );
  });

  it('can fan conversation updates out to specific user rooms', () => {
    service.emitConversationUpdated({ id: 'conv-1' }, ['user-1', 'user-2']);

    expect(to).toHaveBeenCalledWith('conv:conv-1');
    expect(to).toHaveBeenCalledWith('user:user-1');
    expect(to).toHaveBeenCalledWith('user:user-2');
    expect(emit).toHaveBeenCalledWith(
      'conversation.updated',
      expect.objectContaining({
        id: 'conv-1',
      }),
    );
  });
});
