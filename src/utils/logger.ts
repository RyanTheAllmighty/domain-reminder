import type { LogLevel } from "./config";

export type Logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
};

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function safeJson(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '"<unserializable>"';
  }
}

export function createLogger(level: LogLevel): Logger {
  const threshold = LEVELS[level] ?? LEVELS.info;

  const write = (
    lvl: LogLevel,
    msg: string,
    meta?: Record<string, unknown>,
  ) => {
    if ((LEVELS[lvl] ?? 999) < threshold) return;
    const ts = new Date().toISOString();
    const metaPart = meta ? ` ${safeJson(meta)}` : "";
    // eslint-disable-next-line no-console
    console.log(`${ts} ${lvl.toUpperCase()} ${msg}${metaPart}`);
  };

  return {
    debug: (msg, meta) => write("debug", msg, meta),
    info: (msg, meta) => write("info", msg, meta),
    warn: (msg, meta) => write("warn", msg, meta),
    error: (msg, meta) => write("error", msg, meta),
  };
}
