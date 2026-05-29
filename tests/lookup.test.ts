import { describe, expect, test } from "bun:test";

import { lookupDomain } from "../src/domain/lookup";

describe("domain lookup overrides", () => {
  test("uses explicit expiry override when public lookup has no expiry", async () => {
    const result = await lookupDomain("example.com.au", {
      "example.com.au": new Date("2027-06-28T00:00:00Z"),
    });

    expect(result).toMatchObject({
      domain: "example.com.au",
      source: "override",
    });
    expect(result.registrar).toBeTruthy();
    expect(result.expiryDate.toISOString()).toBe("2027-06-28T00:00:00.000Z");
  });
});
