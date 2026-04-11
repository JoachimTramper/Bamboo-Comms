import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { InternalNotesService } from './internal-notes.service';

describe('InternalNotesService', () => {
  let service: InternalNotesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      conversation: {
        findUnique: jest.fn(),
      },
      internalNote: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new InternalNotesService(prisma);
  });

  it('lists notes for agent users only', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: Role.ADMIN });
    prisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });
    prisma.internalNote.findMany.mockResolvedValue([
      {
        id: 'note-1',
        conversationId: 'conv-1',
        content: 'Investigating refund path',
      },
    ]);

    const result = await service.list('conv-1', {
      sub: 'agent-1',
      email: 'agent@example.com',
      subjectType: 'user',
    });

    expect(prisma.internalNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId: 'conv-1' },
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('rejects customer principals', async () => {
    await expect(
      service.list('conv-1', {
        sub: 'customer-1',
        email: 'customer@example.com',
        subjectType: 'customer',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates and trims a note for an agent', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: Role.ADMIN });
    prisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });
    prisma.internalNote.create.mockResolvedValue({
      id: 'note-1',
      conversationId: 'conv-1',
      authorId: 'agent-1',
      content: 'Need billing history before reply',
    });

    const result = await service.create(
      'conv-1',
      {
        sub: 'agent-1',
        email: 'agent@example.com',
        subjectType: 'user',
      },
      '  Need billing history before reply  ',
    );

    expect(prisma.internalNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'conv-1',
          authorId: 'agent-1',
          content: 'Need billing history before reply',
        }),
      }),
    );
    expect(result.content).toBe('Need billing history before reply');
  });

  it('deletes a note only when it belongs to the requested conversation', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: Role.ADMIN });
    prisma.internalNote.findUnique.mockResolvedValue({
      id: 'note-1',
      conversationId: 'conv-1',
    });

    await service.remove(
      'conv-1',
      'note-1',
      {
        sub: 'agent-1',
        email: 'agent@example.com',
        subjectType: 'user',
      },
    );

    expect(prisma.internalNote.delete).toHaveBeenCalledWith({
      where: { id: 'note-1' },
    });
  });
});
