import { describe, expect, test } from "bun:test";

import {
  recordThresholdNotice,
  selectNotificationThreshold,
  shouldSendThresholdNotice,
} from "../src/domain/thresholds";
import type { PersistedState } from "../src/state/store";

describe("thresholds", () => {
  test("selects the nearest threshold that covers the remaining days", () => {
    expect(selectNotificationThreshold(30, [30, 14, 7])).toBe(30);
    expect(selectNotificationThreshold(29, [30, 14, 7])).toBe(30);
    expect(selectNotificationThreshold(13, [30, 14, 7])).toBe(14);
    expect(selectNotificationThreshold(6, [30, 14, 7])).toBe(7);
    expect(selectNotificationThreshold(31, [30, 14, 7])).toBeUndefined();
    expect(selectNotificationThreshold(-1, [30, 14, 7])).toBeUndefined();
  });

  test("dedupes per domain, expiry date, and threshold", () => {
    const state: PersistedState = { domains: {} };

    expect(
      shouldSendThresholdNotice({
        state,
        domain: "example.com",
        expiryDate: "2026-06-01",
        threshold: 7,
      }),
    ).toBe(true);

    recordThresholdNotice({
      state,
      domain: "example.com",
      expiryDate: "2026-06-01",
      threshold: 7,
      registrar: "Example Registrar",
      checkedAt: new Date("2026-05-25T00:00:00Z"),
    });

    expect(
      shouldSendThresholdNotice({
        state,
        domain: "example.com",
        expiryDate: "2026-06-01",
        threshold: 7,
      }),
    ).toBe(false);

    expect(
      shouldSendThresholdNotice({
        state,
        domain: "example.com",
        expiryDate: "2026-06-02",
        threshold: 7,
      }),
    ).toBe(true);
  });
});
