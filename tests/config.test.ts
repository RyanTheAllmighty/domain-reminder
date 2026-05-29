import { describe, expect, test } from "bun:test";

import {
  parseCheckTime,
  parseConfigFromEnv,
  parseExpiryOverrides,
  parseThresholdDays,
} from "../src/utils/config";
import { normalizeDomain } from "../src/utils/domain";

describe("config parsing", () => {
  test("parses required domains and default optional values", () => {
    const config = parseConfigFromEnv({
      DOMAINS: "Example.COM, example.net",
      TELEGRAM_BOT_TOKEN: "token",
      TELEGRAM_CHAT_ID: "chat",
    });

    expect(config.domains).toEqual(["example.com", "example.net"]);
    expect(config.expiryOverrides).toEqual({});
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

  test("parses explicit expiry overrides", () => {
    const overrides = parseExpiryOverrides(
      "Example.com.au=2027-06-28,example.net=2026-01-02",
    );

    expect(overrides["example.com.au"]?.toISOString()).toBe(
      "2027-06-28T00:00:00.000Z",
    );
    expect(overrides["example.net"]?.toISOString()).toBe(
      "2026-01-02T00:00:00.000Z",
    );
  });

  test("rejects invalid expiry overrides", () => {
    expect(() => parseExpiryOverrides("example.com.au:2027-06-28")).toThrow(
      "DOMAIN_EXPIRY_OVERRIDES",
    );
    expect(() => parseExpiryOverrides("example.com.au=28/06/2027")).toThrow(
      "YYYY-MM-DD",
    );
  });
});
