import { lookupRdap } from "./rdap";
import { lookupWhois } from "./whois";

export type LookupSource = "rdap" | "whois" | "override";

export type DomainLookupResult = {
  domain: string;
  expiryDate: Date;
  registrar: string;
  source: LookupSource;
};

export type DomainLookupFailure = {
  domain: string;
  error: string;
  registrar?: string;
  source?: LookupSource;
  kind?: "error" | "expiry-unavailable";
};

export type DomainCheckResult = DomainLookupResult | DomainLookupFailure;

export function isDomainLookupResult(
  result: DomainCheckResult,
): result is DomainLookupResult {
  return "expiryDate" in result;
}

export class DomainLookupError extends Error {
  readonly registrar?: string;
  readonly source?: LookupSource;
  readonly kind: "error" | "expiry-unavailable";

  constructor(
    message: string,
    opts?: {
      registrar?: string;
      source?: LookupSource;
      kind?: "error" | "expiry-unavailable";
    },
  ) {
    super(message);
    this.name = "DomainLookupError";
    this.registrar = opts?.registrar;
    this.source = opts?.source;
    this.kind = opts?.kind ?? "error";
  }
}

export async function lookupDomain(
  domain: string,
  expiryOverrides: Record<string, Date> = {},
): Promise<DomainLookupResult> {
  let bestRegistrar: string | undefined;
  let bestSource: LookupSource | undefined;

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
    bestRegistrar = rdap.registrar;
    bestSource = "rdap";
  } catch {
    // WHOIS fallback below.
  }

  const whois = await lookupWhois(domain);
  if (!whois.expiryDate) {
    bestRegistrar = whois.registrar ?? bestRegistrar;
    bestSource = whois.registrar ? "whois" : bestSource;

    const overrideExpiry = expiryOverrides[domain];
    if (overrideExpiry) {
      return {
        domain,
        expiryDate: overrideExpiry,
        registrar: bestRegistrar ?? "Unknown",
        source: "override",
      };
    }

    const expiryIsPubliclyUnavailable = domain.endsWith(".au");
    throw new DomainLookupError(
      expiryIsPubliclyUnavailable
        ? "Expiry date is not published in public .au RDAP/WHOIS; set DOMAIN_EXPIRY_OVERRIDES for this domain"
        : "Unable to determine expiry date from RDAP or WHOIS",
      {
        registrar: bestRegistrar,
        source: bestSource,
        kind: expiryIsPubliclyUnavailable ? "expiry-unavailable" : "error",
      },
    );
  }

  return {
    domain,
    expiryDate: whois.expiryDate,
    registrar: whois.registrar ?? "Unknown",
    source: "whois",
  };
}

export async function checkDomain(
  domain: string,
  expiryOverrides: Record<string, Date> = {},
): Promise<DomainCheckResult> {
  try {
    return await lookupDomain(domain, expiryOverrides);
  } catch (err) {
    return {
      domain,
      error: err instanceof Error ? err.message : String(err),
      registrar: err instanceof DomainLookupError ? err.registrar : undefined,
      source: err instanceof DomainLookupError ? err.source : undefined,
      kind: err instanceof DomainLookupError ? err.kind : "error",
    };
  }
}
