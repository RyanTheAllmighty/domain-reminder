import { describe, expect, test } from "bun:test";

import { extractWhoisExpiryDate, parseWhoisFields } from "../src/domain/dates";

describe("WHOIS parsing", () => {
  test("parses common expiry fields", () => {
    const expiry = extractWhoisExpiryDate(`
Domain Name: EXAMPLE.COM
Registrar: Example Registrar LLC
Registry Expiry Date: 2026-06-15T04:00:00Z
`);

    expect(expiry?.toISOString()).toBe("2026-06-15T04:00:00.000Z");
  });

  test("parses field labels case-insensitively", () => {
    const fields = parseWhoisFields(`
Registrar: Example Registrar LLC
Whois Server: whois.example.test
`);

    expect(fields.registrar).toEqual(["Example Registrar LLC"]);
    expect(fields["whois server"]).toEqual(["whois.example.test"]);
  });
});
