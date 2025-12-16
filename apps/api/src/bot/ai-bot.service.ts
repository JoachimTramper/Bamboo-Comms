// apps/api/src/bot/ai-bot.service.ts
import { Injectable } from '@nestjs/common';
import { AI_BOT_USER_ID, AI_BOT_NAME } from './ai-bot.constants';

type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

@Injectable()
export class AiBotService {
  private readonly baseUrl =
    process.env.GROQ_BASE_URL?.replace(/\/$/, '') ||
    'https://api.groq.com/openai/v1'; // Groq OpenAI-compatible base URL :contentReference[oaicite:2]{index=2}

  private readonly model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'; // Groq supported model IDs :contentReference[oaicite:3]{index=3}

  private readonly apiKey = process.env.GROQ_API_KEY || '';

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

  async onUserMessage(payload: {
    channelId: string;
    content: string;
    authorId: string;
    isBotMentioned: boolean;
    history: string;
  }): Promise<{ reply: string } | null> {
    const text = (payload.content ?? '').trim();
    if (!text) return null;
    if (payload.authorId === AI_BOT_USER_ID) return null;

    // 1) Commands via "!"
    if (text.startsWith('!')) {
      const cmd = text.slice(1).trim().toLowerCase();

      switch (cmd) {
        case 'help':
          return {
            reply: [
              '👋 Kenny commands:',
              '- `!help` – show this list',
              '- `!rules` – channel rules',
              '- `!ping` – pong',
              '- `!whoami` – show your id',
              '- `!summarize` – summarize last messages',
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
            .filter(Boolean);

          const last = lines.slice(-10);
          if (last.length === 0) return { reply: 'Nothing to summarize yet.' };

          const formatted = last.map((l) => {
            // if the content is already a bullet, indent it
            if (l.startsWith('- ')) return `  ${l}`;
            return `- ${l}`;
          });

          return {
            reply: ['🧾 Last messages:', ...formatted].join('\n'),
          };
        }

        default:
          return { reply: `Unknown command. Type \`!help\`` };
      }
    }

    // 2) No command: only respond when bot is mentioned
    if (!payload.isBotMentioned) return null;

    if (!this.apiKey) {
      return { reply: 'Groq API key missing (GROQ_API_KEY).' };
    }

    // Strip mention from the user text (cleaner prompt)
    const cleanedUser = text.replaceAll(`@${AI_BOT_NAME}`, '').trim();

    // If user only mentioned the bot without a message
    if (!cleanedUser) {
      return { reply: `Yes? 🙂 Type \`!help\` to see what I can do.` };
    }

    const lower = cleanedUser.toLowerCase();
    const wantsSummary =
      lower.includes('samenvat') ||
      lower.includes('samenvatting') ||
      lower.includes('samenvatten') ||
      lower.includes('summarize') ||
      lower.includes('summary') ||
      lower.includes('tldr');

    // Trim history to avoid huge prompts (simple char limit)
    const history = (payload.history ?? '').slice(-6000);

    const system = wantsSummary ? this.summaryPrompt : this.systemPrompt;

    const messages: ChatMsg[] = [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Chat history:\n${history}\n\nUser message:\n${cleanedUser}`,
      },
    ];

    const reply = await this.groqChat(messages);
    return { reply };
  }

  private async groqChat(messages: ChatMsg[]): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`; // Groq chat completions endpoint :contentReference[oaicite:4]{index=4}

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.4,
          max_tokens: 300,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Groq error ${res.status}: ${txt}`);
      }

      const data: any = await res.json();
      return (
        data?.choices?.[0]?.message?.content?.trim() ??
        'Sorry, I did not receive a response.'
      );
    } catch (e) {
      return 'Sorry, I ran into a small issue with the AI. Please try again shortly.';
    } finally {
      clearTimeout(timeout);
    }
  }
}
