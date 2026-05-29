const DATE_LABELS = [
  "registrar registration expiration date",
  "registry expiry date",
  "expiry date",
  "expiration date",
  "expires",
  "paid-till",
  "renewal date",
];

export function parseDomainDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;

  const cleaned = raw
    .trim()
    .replace(/\s+\(.+\)$/, "")
    .replace(/\s+UTC$/i, "Z")
    .replace(/^before\s+/i, "");

  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const dotDate = /^(\d{4})\.(\d{2})\.(\d{2})/.exec(cleaned);
  if (dotDate) {
    const [, year, month, day] = dotDate;
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }

  return undefined;
}

export function parseWhoisFields(raw: string): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([^:%#][^:]{1,80}):\s*(.+?)\s*$/.exec(line);
    if (!match) continue;

    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (!fields[key]) fields[key] = [];
    fields[key].push(value);
  }

  return fields;
}

export function extractWhoisExpiryDate(raw: string): Date | undefined {
  const fields = parseWhoisFields(raw);

  for (const label of DATE_LABELS) {
    for (const value of fields[label] ?? []) {
      const date = parseDomainDate(value);
      if (date) return date;
    }
  }

  for (const [key, values] of Object.entries(fields)) {
    if (!key.includes("expir")) continue;
    for (const value of values) {
      const date = parseDomainDate(value);
      if (date) return date;
    }
  }

  return undefined;
}
