export type TelegramNotifier = {
  sendMessage: (
    text: string,
    opts?: { parseMode?: "HTML" | "MarkdownV2"; disablePreview?: boolean },
  ) => Promise<void>;
};

export function escapeTelegramHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const val = env[key];
  if (!val || val.trim().length === 0) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return val.trim();
}

export function createTelegramNotifierFromEnv(
  env: NodeJS.ProcessEnv,
): TelegramNotifier {
  const token = requiredEnv(env, "TELEGRAM_BOT_TOKEN");
  const chatId = requiredEnv(env, "TELEGRAM_CHAT_ID");

  const url = `https://api.telegram.org/bot${encodeURIComponent(
    token,
  )}/sendMessage`;

  return {
    sendMessage: async (
      text: string,
      opts?: { parseMode?: "HTML" | "MarkdownV2"; disablePreview?: boolean },
    ) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: opts?.parseMode,
          disable_web_page_preview: opts?.disablePreview ?? true,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "<failed to read body>");
        throw new Error(
          `Telegram sendMessage failed: HTTP ${res.status} ${res.statusText} ${body}`,
        );
      }
    },
  };
}

export async function sendTelegramChunks(
  telegram: TelegramNotifier,
  text: string,
): Promise<void> {
  const max = 3500; // keep headroom under Telegram's 4096 char limit
  if (text.length <= max) {
    await telegram.sendMessage(text, { parseMode: "HTML", disablePreview: true });
    return;
  }

  const lines = text.split("\n");
  let chunk = "";

  for (const line of lines) {
    const next = chunk.length === 0 ? line : `${chunk}\n${line}`;
    if (next.length > max) {
      if (chunk.length > 0) {
        await telegram.sendMessage(chunk, {
          parseMode: "HTML",
          disablePreview: true,
        });
      }
      chunk = line;
      continue;
    }
    chunk = next;
  }

  if (chunk.length > 0) {
    await telegram.sendMessage(chunk, { parseMode: "HTML", disablePreview: true });
  }
}
