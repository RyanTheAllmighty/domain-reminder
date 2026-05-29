import { describe, expect, test } from "bun:test";

import { extractRdapExpiryDate, extractRdapRegistrar } from "../src/domain/rdap";

describe("RDAP parsing", () => {
  test("prefers registrar expiration over registry expiration", () => {
    const expiry = extractRdapExpiryDate({
      events: [
        { eventAction: "expiration", eventDate: "2026-06-30T00:00:00Z" },
        {
          eventAction: "registrar expiration",
          eventDate: "2026-06-15T00:00:00Z",
        },
      ],
    });

    expect(expiry?.toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });

  test("extracts registrar entity fn", () => {
    const registrar = extractRdapRegistrar({
      entities: [
        {
          roles: ["registrar"],
          vcardArray: [
            "vcard",
            [
              ["version", {}, "text", "4.0"],
              ["fn", {}, "text", "Example Registrar, LLC"],
            ],
          ],
        },
      ],
    });

    expect(registrar).toBe("Example Registrar, LLC");
  });
});
