import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KnowledgeBaseService {
  constructor(private prisma: PrismaService) {}

  async list(filters: {
    query?: string;
    tag?: string;
    publishedOnly?: boolean;
  }) {
    const trimmedQuery = filters.query?.trim();
    const trimmedTag = filters.tag?.trim();

    return this.prisma.knowledgeDocument.findMany({
      where: {
        ...(filters.publishedOnly ? { isPublished: true } : {}),
        ...(trimmedTag ? { tags: { has: trimmedTag } } : {}),
        ...(trimmedQuery
          ? {
              OR: [
                { title: { contains: trimmedQuery, mode: 'insensitive' } },
                { content: { contains: trimmedQuery, mode: 'insensitive' } },
                { tags: { has: trimmedQuery } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getById(id: string) {
    const document = await this.prisma.knowledgeDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Knowledge document not found');
    }

    return document;
  }

  create(data: {
    title: string;
    content: string;
    tags?: string[];
    sourceUrl?: string;
    isPublished?: boolean;
  }) {
    return this.prisma.knowledgeDocument.create({
      data: {
        title: data.title.trim(),
        content: data.content.trim(),
        tags: this.normalizeTags(data.tags),
        sourceUrl: data.sourceUrl?.trim() || null,
        isPublished: data.isPublished ?? true,
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      content?: string;
      tags?: string[];
      sourceUrl?: string;
      isPublished?: boolean;
    },
  ) {
    await this.getById(id);

    return this.prisma.knowledgeDocument.update({
      where: { id },
      data: {
        title: data.title === undefined ? undefined : data.title.trim(),
        content: data.content === undefined ? undefined : data.content.trim(),
        tags: data.tags === undefined ? undefined : this.normalizeTags(data.tags),
        sourceUrl:
          data.sourceUrl === undefined ? undefined : data.sourceUrl.trim() || null,
        isPublished: data.isPublished,
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.knowledgeDocument.delete({ where: { id } });
  }

  async retrieveRelevantSnippets(input: {
    query: string;
    conversationId?: string | null;
    limit?: number;
  }) {
    const query = input.query.trim();
    if (!query) return [];

    const conversation = input.conversationId
      ? await this.prisma.conversation.findUnique({
          where: { id: input.conversationId },
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
        })
      : null;

    const queryTerms = this.extractTerms([
      query,
      conversation?.subject ?? '',
      ...(conversation?.tags ?? []),
      conversation?.customer?.company ?? '',
      conversation?.customer?.planTier ?? '',
    ]);

    const candidates = await this.prisma.knowledgeDocument.findMany({
      where: {
        isPublished: true,
        ...(queryTerms.length > 0
          ? {
              OR: [
                ...queryTerms.map((term) => ({
                  title: { contains: term, mode: 'insensitive' as const },
                })),
                ...queryTerms.map((term) => ({
                  content: { contains: term, mode: 'insensitive' as const },
                })),
                ...queryTerms.map((term) => ({
                  tags: { has: term },
                })),
              ],
            }
          : {}),
      },
      take: 25,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const ranked = candidates
      .map((doc) => ({
        doc,
        score: this.scoreDocument(doc, queryTerms),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || b.doc.updatedAt.getTime() - a.doc.updatedAt.getTime())
      .slice(0, input.limit ?? 4);

    return ranked.map(({ doc }) => this.toSnippet(doc));
  }

  private normalizeTags(tags?: string[]) {
    if (!tags) return [];
    return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
  }

  private extractTerms(chunks: string[]) {
    return [...new Set(
      chunks
        .flatMap((chunk) => chunk.toLowerCase().split(/[^a-z0-9_-]+/))
        .map((term) => term.trim())
        .filter((term) => term.length >= 3),
    )];
  }

  private scoreDocument(
    doc: { title: string; content: string; tags: string[] },
    terms: string[],
  ) {
    const title = doc.title.toLowerCase();
    const content = doc.content.toLowerCase();
    const tags = doc.tags.map((tag) => tag.toLowerCase());

    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 5;
      if (tags.some((tag) => tag.includes(term))) score += 4;
      if (content.includes(term)) score += 2;
    }

    return score;
  }

  private toSnippet(doc: {
    title: string;
    content: string;
    tags: string[];
    sourceUrl: string | null;
  }) {
    const trimmedContent = doc.content.replace(/\s+/g, ' ').trim();
    const excerpt =
      trimmedContent.length > 320
        ? `${trimmedContent.slice(0, 320).trim()}...`
        : trimmedContent;

    const tags = doc.tags.length > 0 ? `Tags: ${doc.tags.join(', ')}.` : '';
    const source = doc.sourceUrl ? ` Source: ${doc.sourceUrl}` : '';

    return `${doc.title}. ${excerpt}${tags ? ` ${tags}` : ''}${source}`.trim();
  }
}
