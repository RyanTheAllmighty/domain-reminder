import { domainToASCII } from "node:url";

export function normalizeDomain(input: string): string {
  const trimmed = input.trim().toLowerCase().replace(/\.$/, "");

  if (!trimmed) throw new Error("Domain cannot be empty");
  if (trimmed.includes("://")) {
    throw new Error(`Domain must not include a URL scheme: ${input}`);
  }
  if (/[/?#:@\s]/.test(trimmed)) {
    throw new Error(`Domain must be a bare domain name: ${input}`);
  }

  const ascii = domainToASCII(trimmed);
  if (!ascii) throw new Error(`Invalid domain: ${input}`);

  const labels = ascii.split(".");
  if (labels.length < 2) throw new Error(`Domain must include a TLD: ${input}`);
  if (ascii.length > 253) throw new Error(`Domain is too long: ${input}`);

  for (const label of labels) {
    if (!label) throw new Error(`Invalid domain label in: ${input}`);
    if (label.length > 63) throw new Error(`Domain label is too long: ${input}`);
    if (label.startsWith("-") || label.endsWith("-")) {
      throw new Error(`Domain label must not start or end with hyphen: ${input}`);
    }
    if (!/^[a-z0-9-]+$/.test(label)) {
      throw new Error(`Invalid domain label in: ${input}`);
    }
  }

  return ascii;
}
