import { MessagesRealtime } from './messages.realtime';

describe('MessagesRealtime', () => {
  let service: MessagesRealtime;
  let emit: jest.Mock;
  let to: jest.Mock;
  let ws: any;

  beforeEach(() => {
    emit = jest.fn();
    to = jest.fn().mockReturnValue({ emit, to: jest.fn().mockReturnValue({ emit }) });
    ws = {
      server: {
        to,
      },
    };

    service = new MessagesRealtime(ws);
  });

  it('emits message.created to both channel and conversation rooms when linked to a conversation', () => {
    service.emitMessageCreated({
      id: 'msg-1',
      channelId: 'chan-1',
      conversationId: 'conv-1',
      authorId: 'user-1',
      content: 'hello',
      createdAt: new Date().toISOString(),
      author: { id: 'user-1', displayName: 'Alex', avatarUrl: null },
      parent: null,
      reactions: [],
      mentions: [],
      attachments: [],
    });

    expect(to).toHaveBeenCalledWith('chan:chan-1');
    expect(to).toHaveBeenCalledWith('conv:conv-1');
    expect(emit).toHaveBeenCalledWith(
      'conversation.message.created',
      expect.objectContaining({
        id: 'msg-1',
        conversationId: 'conv-1',
      }),
    );
  });
});
