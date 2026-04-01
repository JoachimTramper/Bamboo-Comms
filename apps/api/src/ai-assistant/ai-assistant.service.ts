import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DigestService } from '../digest/digest.service';
import { AI_BOT_NAME } from '../bot/ai-bot.constants';
import { parseBotIntent, resolveBotMode } from '../bot/ai-bot.intent';
import { formatHistoryLine } from '../bot/ai-bot.format';
import {
  AiChatClient,
  type AiChatErrorKey,
  type AiLang,
  type ChatMsg,
} from '../bot/ai-bot.client';
import type { GenerateAssistantReplyParams } from './ai-assistant.types';

@Injectable()
export class AiAssistantService {
  constructor(
    private prisma: PrismaService,
    private digest: DigestService,
    private aiChat: AiChatClient,
  ) {}

  private readonly logger = new Logger(AiAssistantService.name);

  private readonly chatSystemPrompt = [
    `You are ${AI_BOT_NAME}, a helpful assistant inside a chat and customer support application.`,
    'Answer concisely.',
    'Respond in the same language as the user message.',
    'Do NOT mention internal errors unless there is a real failure.',
    'Do NOT explain your reasoning.',
    'If the user asks for commands, tell them to type !help.',
  ].join(' ');

  private readonly summaryPrompt = [
    `You are ${AI_BOT_NAME}, a helpful assistant inside a chat and customer support application.`,
    'Respond in the same language as the user message.',
    'Task: summarize the conversation.',
    'Output ONLY the summary.',
    'Format: every line must start with "- ".',
    'Use 3-6 bullet points. Keep it concise.',
  ].join(' ');

  private readonly sinceLastReadPrompt = [
    `You are ${AI_BOT_NAME}, a helpful assistant inside a chat and customer support application.`,
    'Respond in the same language as the user message.',
    'Task: give the user an update since their last read moment.',
    'You MUST ONLY use the provided messages. Do NOT invent names, roles, events, or facts.',
    'If the provided messages are empty or insufficient, say there is nothing new.',
    'Output ONLY the update.',
    'Format: every line must start with "- ".',
    'Use 3-7 bullet points maximum.',
  ].join(' ');

  private readonly digestPrompt = [
    `You are ${AI_BOT_NAME}, a helpful assistant inside a chat and customer support application.`,
    'Respond in the same language as the user message.',
    'Task: summarize the last 24 hours of messages in this context.',
    'Output ONLY the summary.',
    'Format: every line must start with "- ".',
    'Use 3-6 bullet points. Keep it concise.',
  ].join(' ');

  private readonly throttle = new Map<string, number>();

  hasApiKey() {
    return this.aiChat.hasApiKey();
  }

  private async getBotUserId() {
    const bot = await this.prisma.user.findFirst({
      where: { email: 'bot@ai.local' },
      select: { id: true },
    });
    return bot?.id ?? null;
  }

  private throttleKey(meta: {
    mode: string;
    scope?: { channelId?: string | null; conversationId?: string | null };
    authorId?: string;
  }) {
    const scopeType = meta.scope?.conversationId
      ? 'conversation'
      : meta.scope?.channelId
        ? 'channel'
        : 'context';
    const scopeId = meta.scope?.conversationId ?? meta.scope?.channelId ?? '-';
    const userPart = meta.mode === 'digest' ? '' : `:${meta.authorId ?? '-'}`;
    return `${meta.mode}:${scopeType}:${scopeId}${userPart}`;
  }

  private shouldThrottle(key: string, windowMs: number) {
    const now = Date.now();
    const last = this.throttle.get(key) ?? 0;
    if (now - last < windowMs) return true;
    this.throttle.set(key, now);
    return false;
  }

  private pickLang(userText?: string): AiLang {
    const t = (userText ?? '').toLowerCase();
    const nlHints = [
      'wat',
      'samenvat',
      'gemist',
      'bijgepraat',
      'alsjeblieft',
      'kan je',
      'kun je',
    ];
    return nlHints.some((h) => t.includes(h)) ? 'nl' : 'en';
  }

  private msg(lang: AiLang, key: AiChatErrorKey) {
    const messages = {
      nl: {
        notConfigured: 'AI is niet goed geconfigureerd (API key ongeldig).',
        rateLimited: 'AI is even druk (rate limit). Probeer het zo nog eens.',
        unavailable:
          'AI is tijdelijk niet beschikbaar. Probeer het straks nog eens.',
        timeout: 'AI deed er te lang over (timeout). Probeer opnieuw.',
        generic:
          'Sorry, er ging iets mis met de AI. Probeer het straks nog eens.',
      },
      en: {
        notConfigured: 'AI is not configured correctly (invalid API key).',
        rateLimited: 'Slow down. Please try again in a few seconds.',
        unavailable: 'AI is temporarily unavailable. Please try again shortly.',
        timeout: 'AI timed out. Please try again.',
        generic:
          'Sorry, I ran into a small issue with the AI. Please try again shortly.',
      },
    } as const;

    return messages[lang][key];
  }

  private buildKnowledgeSection(knowledgeContext?: string[]) {
    const snippets = (knowledgeContext ?? []).map((x) => x.trim()).filter(Boolean);
    if (snippets.length === 0) return '';

    return `\n\nKnowledge snippets:\n${snippets
      .slice(0, 8)
      .map((snippet, index) => `[${index + 1}] ${snippet}`)
      .join('\n')}`;
  }

  async generateReply(
    params: GenerateAssistantReplyParams,
  ): Promise<{ reply: string } | null> {
    const text = (params.content ?? '').trim();
    if (!text) return null;

    const botId = await this.getBotUserId();
    if (botId && params.authorId === botId) return null;

    if (!this.aiChat.hasApiKey()) {
      return { reply: 'Groq API key missing.' };
    }

    const effectiveLastRead =
      params.lastReadOverride ?? params.lastRead ?? null;
    const intent = parseBotIntent(text, params.assistantName ?? AI_BOT_NAME);

    if (!intent.cleaned) {
      return null;
    }

    const resolved = resolveBotMode(intent, !!effectiveLastRead);
    const mode: 'chat' | 'summary' | 'since_last_read' =
      resolved === 'since_last_read'
        ? 'since_last_read'
        : resolved === 'summary'
          ? 'summary'
          : 'chat';

    const history = (params.history ?? '').slice(-6000);
    const lower = intent.cleaned.toLowerCase();

    if (mode === 'since_last_read' && !history.trim()) {
      const isDutch =
        lower.includes('wat') ||
        lower.includes('gemist') ||
        lower.includes('bijgepraat') ||
        lower.includes('sinds');

      return {
        reply: isDutch
          ? 'Niets nieuws sinds je laatste bezoek.'
          : 'Nothing new since your last read.',
      };
    }

    const system =
      mode === 'since_last_read'
        ? this.sinceLastReadPrompt
        : mode === 'summary'
          ? this.summaryPrompt
          : this.chatSystemPrompt;

    const scopeLabel = params.scope?.conversationId
      ? `Conversation ID: ${params.scope.conversationId}`
      : params.scope?.channelId
        ? `Channel ID: ${params.scope.channelId}`
        : 'Context ID: unknown';

    const knowledgeSection = this.buildKnowledgeSection(params.knowledgeContext);
    const userContent =
      mode === 'since_last_read'
        ? `${scopeLabel}\nMessages since last read (${effectiveLastRead!.toISOString()}):\n${history}\n\nUser request:\n${intent.cleaned}${knowledgeSection}`
        : `${scopeLabel}\nChat history:\n${history}\n\nUser message:\n${intent.cleaned}${knowledgeSection}`;

    const messages: ChatMsg[] = [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ];

    const throttleKey = this.throttleKey({
      mode,
      scope: params.scope,
      authorId: params.authorId,
    });
    const windowMs = mode === 'since_last_read' ? 8_000 : 5_000;

    if (this.shouldThrottle(throttleKey, windowMs)) {
      this.logger.warn(
        `assistant.throttled key=${throttleKey} windowMs=${windowMs}`,
      );
      return {
        reply:
          this.msg(this.pickLang(intent.cleaned), 'rateLimited') ||
          'Take it easy, try again in a few seconds.',
      };
    }

    const reply = await this.aiChat.chat(
      messages,
      {
        mode,
        channelId: params.scope?.channelId ?? undefined,
        conversationId: params.scope?.conversationId ?? undefined,
        authorId: params.authorId,
        userText: intent.cleaned,
      },
      (lang: AiLang, key: AiChatErrorKey) => this.msg(lang, key),
    );

    return { reply };
  }

  private async buildHistoryLast24h(channelId: string, hours: number) {
    const now = new Date();
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const botId = await this.getBotUserId();

    const context = await this.prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        createdAt: { gte: from, lte: now },
        ...(botId ? { NOT: { authorId: botId } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: {
        createdAt: true,
        content: true,
        author: { select: { displayName: true } },
        parent: { select: { author: { select: { displayName: true } } } },
        mentions: { select: { user: { select: { displayName: true } } } },
      },
    });

    return context.map((m) => formatHistoryLine(m as any)).join('\n');
  }

  async generateDigestForChannel(
    channelId: string,
    hours = 24,
  ): Promise<string> {
    if (!this.aiChat.hasApiKey()) {
      return 'Groq API key missing.';
    }

    await this.digest.ensure(channelId);

    const history = await this.buildHistoryLast24h(channelId, hours);
    if (!history.trim()) {
      return 'Nothing to summarize in the last 24 hours.';
    }

    const messages: ChatMsg[] = [
      { role: 'system', content: this.digestPrompt },
      {
        role: 'user',
        content: `Channel ID: ${channelId}\nMessages (last ${hours}h):\n${history}\n\nCreate a digest.`,
      },
    ];

    return this.aiChat.chat(
      messages,
      {
        mode: 'digest',
        channelId,
        userText: 'digest',
      },
      (lang: AiLang, key: AiChatErrorKey) => this.msg(lang, key),
    );
  }
}
