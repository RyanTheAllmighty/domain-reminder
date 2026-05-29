import { lookupRdap } from "./rdap";
import { lookupWhois } from "./whois";

export type DomainLookupResult = {
  domain: string;
  expiryDate: Date;
  registrar: string;
  source: "rdap" | "whois";
};

export type DomainLookupFailure = {
  domain: string;
  error: string;
};

export type DomainCheckResult = DomainLookupResult | DomainLookupFailure;

export function isDomainLookupResult(
  result: DomainCheckResult,
): result is DomainLookupResult {
  return "expiryDate" in result;
}

export async function lookupDomain(domain: string): Promise<DomainLookupResult> {
  try {
    const rdap = await lookupRdap(domain);
    if (rdap.expiryDate) {
      return {
        domain,
        expiryDate: rdap.expiryDate,
        registrar: rdap.registrar ?? "Unknown",
        source: "rdap",
      };
    }
  } catch {
    // WHOIS fallback below.
  }

  const whois = await lookupWhois(domain);
  if (!whois.expiryDate) {
    throw new Error("Unable to determine expiry date from RDAP or WHOIS");
  }

  return {
    domain,
    expiryDate: whois.expiryDate,
    registrar: whois.registrar ?? "Unknown",
    source: "whois",
  };
}

export async function checkDomain(domain: string): Promise<DomainCheckResult> {
  try {
    return await lookupDomain(domain);
  } catch (err) {
    return {
      domain,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
