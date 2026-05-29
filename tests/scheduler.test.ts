import { describe, expect, test } from "bun:test";

import { daysUntilDate, nextRunAfter } from "../src/utils/dates";

describe("scheduler", () => {
  const checkTime = { hour: 0, minute: 0, value: "00:00" };

  test("schedules later today when check time is still ahead", () => {
    const next = nextRunAfter(new Date(2026, 0, 1, 23, 58), {
      hour: 23,
      minute: 59,
      value: "23:59",
    });

    expect(next.getDate()).toBe(1);
    expect(next.getHours()).toBe(23);
    expect(next.getMinutes()).toBe(59);
  });

  test("schedules tomorrow when check time has passed", () => {
    const next = nextRunAfter(new Date(2026, 0, 1, 1, 0), checkTime);

    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(2);
    expect(next.getHours()).toBe(0);
    expect(next.getMinutes()).toBe(0);
  });

  test("computes calendar days remaining", () => {
    expect(
      daysUntilDate(
        new Date(2026, 0, 8, 23, 59),
        new Date(2026, 0, 2, 12, 0),
      ),
    ).toBe(6);
  });
});
