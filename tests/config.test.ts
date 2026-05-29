import { describe, expect, test } from "bun:test";

import { parseCheckTime, parseConfigFromEnv, parseThresholdDays } from "../src/utils/config";
import { normalizeDomain } from "../src/utils/domain";

describe("config parsing", () => {
  test("parses required domains and default optional values", () => {
    const config = parseConfigFromEnv({
      DOMAINS: "Example.COM, example.net",
      TELEGRAM_BOT_TOKEN: "token",
      TELEGRAM_CHAT_ID: "chat",
    });

    expect(config.domains).toEqual(["example.com", "example.net"]);
    expect(config.checkTime.value).toBe("00:00");
    expect(config.notifyThresholdDays).toEqual([30, 14, 7]);
    expect(config.dataDir).toBe("/data");
    expect(config.logLevel).toBe("info");
  });

  test("dedupes and sorts thresholds descending", () => {
    expect(parseThresholdDays("7,30,14,7")).toEqual([30, 14, 7]);
  });

  test("normalizes IDN domains to ASCII", () => {
    expect(normalizeDomain("Bücher.example")).toBe("xn--bcher-kva.example");
  });

  test("rejects URL-shaped domain input", () => {
    expect(() => normalizeDomain("https://example.com")).toThrow(
      "must not include a URL scheme",
    );
    expect(() => normalizeDomain("example.com/path")).toThrow(
      "bare domain name",
    );
  });

  test("validates check time", () => {
    expect(parseCheckTime("7:05")).toEqual({
      hour: 7,
      minute: 5,
      value: "07:05",
    });
    expect(() => parseCheckTime("24:00")).toThrow("CHECK_TIME");
  });
});
