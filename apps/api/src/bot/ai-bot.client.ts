// apps/api/src/bot/ai-bot.client.ts
import { Injectable, Logger } from '@nestjs/common';

export type ChatMsg = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};
export type AiLang = 'nl' | 'en';

export type AiChatMeta = {
  mode?: string;
  channelId?: string;
  authorId?: string;
  userText?: string;
};

export type AiChatErrorKey =
  | 'notConfigured'
  | 'rateLimited'
  | 'unavailable'
  | 'timeout'
  | 'generic';

export type MsgResolver = (lang: AiLang, key: AiChatErrorKey) => string;

@Injectable()
export class AiChatClient {
  private readonly logger = new Logger(AiChatClient.name);

  private readonly baseUrl =
    process.env.GROQ_BASE_URL?.replace(/\/$/, '') ||
    'https://api.groq.com/openai/v1';

  private readonly model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  private readonly apiKey = process.env.GROQ_API_KEY || '';

  hasApiKey() {
    return !!this.apiKey;
  }

  private safeSnippet(s: string, max = 300) {
    const t = (s ?? '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) + '…' : t;
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

  async chat(
    messages: ChatMsg[],
    meta: AiChatMeta | undefined,
    msg: MsgResolver,
  ): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    const started = Date.now();

    const lang = this.pickLang(meta?.userText);

    this.logger.log(
      `groq.request mode=${meta?.mode ?? 'unknown'} channel=${meta?.channelId ?? '-'} msgs=${messages.length}`,
    );

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
          temperature: 0.2,
          max_tokens: 300,
        }),
        signal: controller.signal,
      });

      const ms = Date.now() - started;

      if (!res.ok) {
        const bodyTxt = await res.text().catch(() => '');
        const snippet = this.safeSnippet(bodyTxt);

        if (res.status === 401 || res.status === 403) {
          this.logger.error(
            `groq.auth_error status=${res.status} ms=${ms} body="${snippet}"`,
          );
          return msg(lang, 'notConfigured');
        }

        if (res.status === 429) {
          this.logger.warn(`groq.rate_limited ms=${ms} body="${snippet}"`);
          return msg(lang, 'rateLimited');
        }

        if (res.status >= 500) {
          this.logger.warn(
            `groq.server_error status=${res.status} ms=${ms} body="${snippet}"`,
          );
          return msg(lang, 'unavailable');
        }

        this.logger.error(
          `groq.http_error status=${res.status} ms=${ms} body="${snippet}"`,
        );
        return msg(lang, 'generic');
      }

      const data: any = await res.json();
      const reply =
        data?.choices?.[0]?.message?.content?.trim() ??
        (lang === 'nl'
          ? 'Sorry, ik kreeg geen antwoord terug.'
          : 'Sorry, I did not receive a response.');

      this.logger.log(
        `groq.success mode=${meta?.mode ?? 'unknown'} channel=${meta?.channelId ?? '-'} ms=${ms}`,
      );

      return reply;
    } catch (e: any) {
      const ms = Date.now() - started;

      if (e?.name === 'AbortError') {
        this.logger.warn(
          `groq.timeout mode=${meta?.mode ?? 'unknown'} channel=${meta?.channelId ?? '-'} ms=${ms}`,
        );
        return msg(lang, 'timeout');
      }

      this.logger.error(
        `groq.fail mode=${meta?.mode ?? 'unknown'} channel=${meta?.channelId ?? '-'} ms=${ms} err=${String(e)}`,
      );
      return msg(lang, 'generic');
    } finally {
      clearTimeout(timeout);
    }
  }
}
