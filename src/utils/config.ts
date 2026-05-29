import { normalizeDomain } from "./domain";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type CheckTime = {
  hour: number;
  minute: number;
  value: string;
};

export type AppConfig = {
  domains: string[];
  checkTime: CheckTime;
  notifyThresholdDays: number[];
  dataDir: string;
  logLevel: LogLevel;
};

function requiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const val = env[key];
  if (!val || val.trim().length === 0) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return val.trim();
}

function optionalEnv(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const val = env[key];
  if (!val) return undefined;
  const trimmed = val.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function parseCheckTime(raw: string | undefined): CheckTime {
  const value = raw ?? "00:00";
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`CHECK_TIME must be HH:mm 24-hour time, got: ${value}`);
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  return {
    hour,
    minute,
    value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

export function parseThresholdDays(raw: string | undefined): number[] {
  const source = raw ?? "30,14,7";
  const thresholds = source
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const n = Number(part);
      if (!Number.isInteger(n) || n < 0) {
        throw new Error(`Invalid threshold day value: ${part}`);
      }
      return n;
    });

  if (thresholds.length === 0) {
    throw new Error("NOTIFY_THRESHOLDS_DAYS must contain at least one value");
  }

  return [...new Set(thresholds)].sort((a, b) => b - a);
}

export function parseConfigFromEnv(env: NodeJS.ProcessEnv): AppConfig {
  const domains = [
    ...new Set(
      requiredEnv(env, "DOMAINS")
        .split(",")
        .map((domain) => normalizeDomain(domain))
        .filter(Boolean),
    ),
  ];

  if (domains.length === 0) {
    throw new Error("DOMAINS must contain at least one domain");
  }

  const logLevel = (optionalEnv(env, "LOG_LEVEL") ?? "info") as LogLevel;
  if (!["debug", "info", "warn", "error"].includes(logLevel)) {
    throw new Error(`LOG_LEVEL must be debug, info, warn, or error: ${logLevel}`);
  }

  return {
    domains,
    checkTime: parseCheckTime(optionalEnv(env, "CHECK_TIME")),
    notifyThresholdDays: parseThresholdDays(
      optionalEnv(env, "NOTIFY_THRESHOLDS_DAYS"),
    ),
    dataDir: optionalEnv(env, "DATA_DIR") ?? "/data",
    logLevel,
  };
}
