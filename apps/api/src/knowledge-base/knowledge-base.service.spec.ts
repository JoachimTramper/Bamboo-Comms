import { KnowledgeBaseService } from './knowledge-base.service';

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      knowledgeDocument: {
        findMany: jest.fn(),
      },
      conversation: {
        findUnique: jest.fn(),
      },
    };

    service = new KnowledgeBaseService(prisma);
  });

  it('retrieves ranked snippets using query and conversation context', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      subject: 'Billing update failed',
      priority: 'NORMAL',
      tags: ['billing'],
      customer: {
        name: 'Jamie',
        company: 'Acme',
        planTier: 'pro',
      },
    });

    prisma.knowledgeDocument.findMany.mockResolvedValue([
      {
        id: 'doc-1',
        title: 'Billing settings',
        content: 'Update payment details from Settings > Billing.',
        tags: ['billing', 'payments'],
        sourceUrl: 'https://help.example.com/billing',
        isPublished: true,
        createdAt: new Date('2026-04-01T09:00:00.000Z'),
        updatedAt: new Date('2026-04-01T10:00:00.000Z'),
      },
      {
        id: 'doc-2',
        title: 'Onboarding checklist',
        content: 'Unrelated onboarding steps.',
        tags: ['setup'],
        sourceUrl: null,
        isPublished: true,
        createdAt: new Date('2026-04-01T08:00:00.000Z'),
        updatedAt: new Date('2026-04-01T08:30:00.000Z'),
      },
    ]);

    const snippets = await service.retrieveRelevantSnippets({
      query: 'How do I update billing?',
      conversationId: 'conv-1',
      limit: 2,
    });

    expect(snippets).toHaveLength(1);
    expect(snippets[0]).toContain('Billing settings');
    expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      select: {
        subject: true,
        priority: true,
        tags: true,
        customer: {
          select: {
            name: true,
            company: true,
            planTier: true,
          },
        },
      },
    });
  });
});
