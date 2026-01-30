// apps/api/src/bot/ai-bot.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AI_BOT_NAME } from './ai-bot.constants';
import { parseBotIntent, resolveBotMode } from './ai-bot.intent';
import { formatHistoryLine } from './ai-bot.format';
import { DigestService } from '../digest/digest.service';
import {
  AiChatClient,
  type AiChatErrorKey,
  type AiLang,
  type ChatMsg,
} from './ai-bot.client';

@Injectable()
export class AiBotService {
  constructor(
    private prisma: PrismaService,
    private digest: DigestService,
    private aiChat: AiChatClient,
  ) {}

  private readonly logger = new Logger(AiBotService.name);

  private readonly systemPrompt = [
    `You are ${AI_BOT_NAME}, a helpful assistant inside a chat application.`,
    'Answer concisely.',
    'Respond in the same language as the user message.',
    'Do NOT mention internal errors unless there is a real failure.',
    'Do NOT explain your reasoning.',
    'If the user asks to summarize, output ONLY the summary (no preface).',
    'If the user asks for commands, tell them to type !help.',
  ].join(' ');

  private readonly summaryPrompt = [
    `You are ${AI_BOT_NAME}, a helpful assistant inside a chat application.`,
    'Respond in the same language as the user message.',
    'Task: summarize the conversation.',
    'Output ONLY the summary.',
    'Format: every line must start with "- ".',
    'Use 3–6 bullet points. Keep it concise.',
  ].join(' ');

  private readonly sinceLastReadPrompt = [
    `You are ${AI_BOT_NAME}, a helpful assistant inside a chat application.`,
    'Respond in the same language as the user message.',
    'Task: give the user an update since their last read moment.',
    'You MUST ONLY use the provided messages. Do NOT invent names, roles, events, or facts.',
    'If the provided messages are empty or insufficient, say there is nothing new.',
    'Output ONLY the update.',
    'Format: every line must start with "- ".',
    'Use 3–7 bullet points maximum.',
  ].join(' ');

  private readonly digestPrompt = [
    `You are ${AI_BOT_NAME}, a helpful assistant inside a chat application.`,
    'Respond in the same language as the user message.',
    'Task: summarize the last 24 hours of messages in this channel.',
    'Output ONLY the summary.',
    'Format: every line must start with "- ".',
    'Use 3–6 bullet points. Keep it concise.',
  ].join(' ');

  private async getBotUserId() {
    const bot = await this.prisma.user.findFirst({
      where: { email: 'bot@ai.local' },
      select: { id: true },
    });
    return bot?.id ?? null;
  }

  private readonly throttle = new Map<string, number>();

  private throttleKey(meta?: {
    mode?: string;
    channelId?: string;
    authorId?: string;
  }) {
    const mode = meta?.mode ?? 'unknown';
    const ch = meta?.channelId ?? '-';
    // for chat is user-based fine; for digest is channel-based fine
    const userPart = mode === 'digest' ? '' : `:${meta?.authorId ?? '-'}`;
    return `${mode}:${ch}${userPart}`;
  }

  private shouldThrottle(key: string, windowMs: number) {
    const now = Date.now();
    const last = this.throttle.get(key) ?? 0;
    if (now - last < windowMs) return true;
    this.throttle.set(key, now);
    return false;
  }

  async onUserMessage(payload: {
    channelId: string;
    content: string;
    authorId: string;
    isBotMentioned: boolean;
    history: string;
    lastRead: Date | null;
    lastReadOverride?: Date | null;
  }): Promise<{ reply: string } | null> {
    const text = (payload.content ?? '').trim();

    // override wins; fallback to DB lastRead
    const effectiveLastRead =
      payload.lastReadOverride ?? payload.lastRead ?? null;

    if (!text) return null;

    const botId = await this.getBotUserId();
    if (botId && payload.authorId === botId) return null;

    // 1) Commands via "!"
    if (text.startsWith('!')) {
      const parts = text.slice(1).trim().split(/\s+/);
      const cmd = (parts[0] ?? '').toLowerCase();

      switch (cmd) {
        case 'help':
          return {
            reply: [
              '👋 BambooBob Commands:',
              '- `!help` – show this list',
              '- `!rules` – channel rules',
              '- `!ping` – pong',
              '- `!whoami` – show your id',
              '- `!summarize` – summarize last messages',
              '- `!digest` – summarize last 24 hours',
              '- `!digest on` – enable scheduled digest',
              '- `!digest off` – disable scheduled digest',
              '- `!digest status` – show digest status',
              '- `!digest HH:mm` (e.g. `!digest 19:30`) – set daily time + enable',
              '',
              `Tip: mention me for questions: \`@${AI_BOT_NAME} ...\``,
            ].join('\n'),
          };

        case 'rules':
          return {
            reply: [
              '📌 Rules:',
              '- Be respectful',
              '- No spam',
              '- Keep it on-topic',
            ].join('\n'),
          };

        case 'ping':
          return { reply: 'pong 🏓' };

        case 'whoami':
          return { reply: `You are: \`${payload.authorId}\`` };

        case 'summarize': {
          const lines = (payload.history ?? '')
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            // remove bot messages (works with "[hh:mm] Name: ..." format)
            .filter((l) => !new RegExp(`\\]\\s+${AI_BOT_NAME}:`).test(l))
            // remove bot mention noise
            .map((l) =>
              l.replaceAll(`@${AI_BOT_NAME}`, '').replace(/\s+/g, ' ').trim(),
            )
            // remove empty "Name:" lines after stripping mentions
            .filter((l) => !/:\s*$/.test(l));

          const last = lines.slice(-10);
          if (last.length === 0) return { reply: 'Nothing to summarize yet.' };

          const formatted = last.map((l) =>
            l.startsWith('- ') ? `  ${l}` : `- ${l}`,
          );

          return { reply: ['🧾 Last messages:', ...formatted].join('\n') };
        }

        case 'digest': {
          const sub = (parts[1] ?? '').toLowerCase(); // on/off/status/at/19:43
          const arg = parts[2];

          // default: run now
          if (!sub) {
            const reply = await this.generateDigestForChannel(
              payload.channelId,
              24,
            );
            return { reply };
          }

          if (sub === 'on') {
            await this.digest.ensure(payload.channelId);
            await this.digest.setEnabled(payload.channelId, true);
            const s = await this.digest.get(payload.channelId);
            return {
              reply: `✅ Digest enabled. Scheduled at ${s?.timeHHmm ?? '18:00'}.`,
            };
          }

          if (sub === 'off') {
            await this.digest.ensure(payload.channelId);
            await this.digest.setEnabled(payload.channelId, false);
            return { reply: `🛑 Digest disabled.` };
          }

          if (sub === 'status') {
            const s =
              (await this.digest.get(payload.channelId)) ??
              (await this.digest.ensure(payload.channelId));

            const enabled = s.enabled ? 'ON ✅' : 'OFF 🛑';
            const last = s.lastRunAt
              ? s.lastRunAt.toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'never';

            return {
              reply: `📬 Digest status: ${enabled}\n⏰ Time: ${s.timeHHmm}\n🕒 Last run: ${last}`,
            };
          }

          // support: "!digest 19:43" or "!digest at 19:43"
          const timeCandidate = sub === 'at' ? (arg ?? '') : sub;

          try {
            const t = this.digest.validateTimeOrThrow(timeCandidate);
            await this.digest.setTime(payload.channelId, t);
            return { reply: `✅ Digest time set to ${t}. (Enabled)` };
          } catch {
            return {
              reply:
                'Usage:\n' +
                '- `!digest` (run now)\n' +
                '- `!digest on`\n' +
                '- `!digest off`\n' +
                '- `!digest status`\n' +
                '- `!digest 18:00` or `!digest at 18:00`',
            };
          }
        }

        default:
          return { reply: `Unknown command. Type \`!help\`` };
      }
    }

    // 2) No command: only respond when bot is mentioned
    if (!payload.isBotMentioned) return null;

    if (!this.aiChat.hasApiKey()) {
      return { reply: 'Groq API key missing.' };
    }

    const intent = parseBotIntent(text, AI_BOT_NAME);

    // If user only mentioned the bot without a message
    if (!intent.cleaned) {
      return { reply: `Yes? Type \`!help\` to see what I can do. 🙂` };
    }

    // Determine mode (centralized)
    const resolved = resolveBotMode(intent, !!effectiveLastRead);

    // IMPORTANT: keep mode narrowed to what this file supports right now
    const mode: 'chat' | 'summary' | 'since_last_read' =
      resolved === 'since_last_read'
        ? 'since_last_read'
        : resolved === 'summary'
          ? 'summary'
          : 'chat';

    const lower = intent.cleaned.toLowerCase();

    // Trim history to avoid huge prompts (simple char limit)
    const history = (payload.history ?? '').slice(-6000);

    // If since_last_read but nothing new, short-circuit (no Groq call)
    if (mode === 'since_last_read') {
      const hasLines = (history ?? '').trim().length > 0;
      if (!hasLines) {
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
    }

    const system =
      mode === 'since_last_read'
        ? this.sinceLastReadPrompt
        : mode === 'summary'
          ? this.summaryPrompt
          : this.systemPrompt;

    const userContent =
      mode === 'since_last_read'
        ? `Messages since last read (${effectiveLastRead!.toISOString()}):\n${history}\n\nUser request:\n${intent.cleaned}`
        : `Chat history:\n${history}\n\nUser message:\n${intent.cleaned}`;

    const messages: ChatMsg[] = [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ];

    const throttleKey = this.throttleKey({
      mode,
      channelId: payload.channelId,
      authorId: payload.authorId,
    });

    const windowMs = mode === 'since_last_read' ? 8_000 : 5_000;

    if (this.shouldThrottle(throttleKey, windowMs)) {
      this.logger.warn(`bot.throttled key=${throttleKey} windowMs=${windowMs}`);
      return {
        reply:
          this.msg(this.pickLang(intent.cleaned), 'rateLimited') ||
          '⏳ Take it easy — try again in a few seconds.',
      };
    }

    const reply = await this.aiChat.chat(
      messages,
      {
        mode,
        channelId: payload.channelId,
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

  private pickLang(userText?: string): AiLang {
    const t = (userText ?? '').toLowerCase();
    // super simpele heuristiek is prima
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
    const M = {
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
        rateLimited: '⏳ Slow down. Please try again in a few seconds.',
        unavailable: 'AI is temporarily unavailable. Please try again shortly.',
        timeout: 'AI timed out. Please try again.',
        generic:
          'Sorry, I ran into a small issue with the AI. Please try again shortly.',
      },
    } as const;

    return (M as any)[lang][key] as string;
  }

  async generateDigestForChannel(
    channelId: string,
    hours = 24,
  ): Promise<string> {
    if (!this.aiChat.hasApiKey()) {
      return 'Groq API key missing.';
    }

    const history = await this.buildHistoryLast24h(channelId, hours);
    if (!history.trim()) {
      return 'Nothing to summarize in the last 24 hours.';
    }

    const messages: ChatMsg[] = [
      { role: 'system', content: this.digestPrompt },
      {
        role: 'user',
        content: `Messages (last ${hours}h):\n${history}\n\nCreate a digest.`,
      },
    ];

    return this.aiChat.chat(
      messages,
      { mode: 'digest', channelId, userText: 'digest' },
      (lang: AiLang, key: AiChatErrorKey) => this.msg(lang, key),
    );
  }
}
