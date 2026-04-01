import { Injectable } from '@nestjs/common';
import { AI_BOT_NAME } from './ai-bot.constants';
import { DigestService } from '../digest/digest.service';
import { AiAssistantService } from '../ai-assistant/ai-assistant.service';

@Injectable()
export class AiBotService {
  constructor(
    private digest: DigestService,
    private assistant: AiAssistantService,
  ) {}

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
    if (!text) return null;

    if (text.startsWith('!')) {
      const parts = text.slice(1).trim().split(/\s+/);
      const cmd = (parts[0] ?? '').toLowerCase();

      switch (cmd) {
        case 'help':
          return {
            reply: [
              '👋 BambooBob Commands:',
              '- `!help` - show this list',
              '- `!rules` - channel rules',
              '- `!ping` - pong',
              '- `!whoami` - show your id',
              '- `!summarize` - summarize last messages',
              '- `!digest` - summarize last 24 hours',
              '- `!digest on` - enable scheduled digest',
              '- `!digest off` - disable scheduled digest',
              '- `!digest status` - show digest status',
              '- `!digest HH:mm` (e.g. `!digest 19:30`) - set daily time + enable',
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
            .map((line) => line.trim())
            .filter(Boolean)
            .filter((line) => !new RegExp(`\\]\\s+${AI_BOT_NAME}:`).test(line))
            .map((line) =>
              line.replaceAll(`@${AI_BOT_NAME}`, '').replace(/\s+/g, ' ').trim(),
            )
            .filter((line) => !/:\s*$/.test(line));

          const last = lines.slice(-10);
          if (last.length === 0) return { reply: 'Nothing to summarize yet.' };

          const formatted = last.map((line) =>
            line.startsWith('- ') ? `  ${line}` : `- ${line}`,
          );

          return { reply: ['🧾 Last messages:', ...formatted].join('\n') };
        }

        case 'digest': {
          const sub = (parts[1] ?? '').toLowerCase();
          const arg = parts[2];

          if (!sub) {
            const reply = await this.generateDigestForChannel(payload.channelId, 24);
            return { reply };
          }

          if (sub === 'on') {
            await this.digest.ensure(payload.channelId);
            await this.digest.setEnabled(payload.channelId, true);
            const settings = await this.digest.get(payload.channelId);
            return {
              reply: `✅ Digest enabled. Scheduled at ${settings?.timeHHmm ?? '18:00'}.`,
            };
          }

          if (sub === 'off') {
            await this.digest.ensure(payload.channelId);
            await this.digest.setEnabled(payload.channelId, false);
            return { reply: '🛑 Digest disabled.' };
          }

          if (sub === 'status') {
            const settings =
              (await this.digest.get(payload.channelId)) ??
              (await this.digest.ensure(payload.channelId));

            const enabled = settings.enabled ? 'ON ✅' : 'OFF 🛑';
            const last = settings.lastRunAt
              ? settings.lastRunAt.toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'never';

            return {
              reply: `📬 Digest status: ${enabled}\n⏰ Time: ${settings.timeHHmm}\n🕒 Last run: ${last}`,
            };
          }

          const timeCandidate = sub === 'at' ? (arg ?? '') : sub;

          try {
            const time = this.digest.validateTimeOrThrow(timeCandidate);
            await this.digest.setTime(payload.channelId, time);
            return { reply: `✅ Digest time set to ${time}. (Enabled)` };
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
          return { reply: 'Unknown command. Type `!help`' };
      }
    }

    if (!payload.isBotMentioned) return null;

    const cleaned = text.replaceAll(`@${AI_BOT_NAME}`, '').trim();
    if (!cleaned) {
      return { reply: 'Yes? Type `!help` to see what I can do. 🙂' };
    }

    return this.assistant.generateReply({
      scope: { channelId: payload.channelId },
      authorId: payload.authorId,
      content: payload.content,
      history: payload.history,
      lastRead: payload.lastRead,
      lastReadOverride: payload.lastReadOverride ?? null,
      assistantName: AI_BOT_NAME,
    });
  }

  async generateDigestForChannel(
    channelId: string,
    hours = 24,
  ): Promise<string> {
    return this.assistant.generateDigestForChannel(channelId, hours);
  }
}
