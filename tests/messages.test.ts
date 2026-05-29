import { describe, expect, test } from "bun:test";

import { formatExpiryReminder, formatStartupSummary } from "../src/monitor/messages";
import type { PersistedState } from "../src/state/store";

describe("Telegram message formatting", () => {
  test("formats startup summary without mutating state", () => {
    const state: PersistedState = { domains: {} };
    const before = JSON.stringify(state);

    const message = formatStartupSummary({
      results: [
        {
          domain: "example.com",
          expiryDate: new Date("2026-06-15T00:00:00Z"),
          registrar: "Example Registrar",
          source: "rdap",
        },
      ],
      nextRun: new Date("2026-05-30T00:00:00Z"),
      checkTime: { hour: 0, minute: 0, value: "00:00" },
      thresholds: [30, 14, 7],
      now: new Date("2026-05-29T00:00:00Z"),
    });

    expect(message).toContain("Started successfully");
    expect(message).toContain("example.com");
    expect(message).toContain("Example Registrar");
    expect(JSON.stringify(state)).toBe(before);
  });

  test("formats less-than threshold reminder", () => {
    const message = formatExpiryReminder({
      result: {
        domain: "example.com",
        expiryDate: new Date("2026-06-04T00:00:00Z"),
        registrar: "Example Registrar",
        source: "rdap",
      },
      threshold: 7,
      daysRemaining: 6,
      checkedAt: new Date("2026-05-29T00:00:00Z"),
    });

    expect(message).toContain("expires in less than 7 days");
    expect(message).toContain("Example Registrar");
  });
});
