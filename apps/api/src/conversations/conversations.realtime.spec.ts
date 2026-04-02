import { ConversationsRealtime } from './conversations.realtime';

describe('ConversationsRealtime', () => {
  let service: ConversationsRealtime;
  let emit: jest.Mock;
  let to: jest.Mock;

  beforeEach(() => {
    emit = jest.fn();
    to = jest.fn().mockReturnValue({ emit });

    service = new ConversationsRealtime({
      server: { to },
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
});
