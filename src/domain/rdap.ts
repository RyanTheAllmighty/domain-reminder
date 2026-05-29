import { parseDomainDate } from "./dates";

export type RdapResult = {
  expiryDate?: Date;
  registrar?: string;
  raw: unknown;
};

type RdapBootstrap = {
  services: Array<[string[], string[]]>;
};

type RdapEvent = {
  eventAction?: string;
  eventDate?: string;
};

type RdapEntity = {
  roles?: string[];
  vcardArray?: unknown;
  entities?: RdapEntity[];
};

type RdapDomainResponse = {
  events?: RdapEvent[];
  entities?: RdapEntity[];
};

let bootstrapCache: RdapBootstrap | undefined;

async function getBootstrap(): Promise<RdapBootstrap> {
  if (bootstrapCache) return bootstrapCache;

  const res = await fetch("https://data.iana.org/rdap/dns.json");
  if (!res.ok) {
    throw new Error(`Failed to fetch RDAP bootstrap: HTTP ${res.status}`);
  }

  bootstrapCache = (await res.json()) as RdapBootstrap;
  return bootstrapCache;
}

function rdapDomainUrl(baseUrl: string, domain: string): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}domain/${encodeURIComponent(domain)}`;
}

function findBootstrapUrls(bootstrap: RdapBootstrap, domain: string): string[] {
  const tld = domain.split(".").at(-1)?.toLowerCase();
  if (!tld) return [];

  for (const [tlds, urls] of bootstrap.services) {
    if (tlds.some((candidate) => candidate.toLowerCase() === tld)) {
      return urls;
    }
  }

  return [];
}

export function extractRdapExpiryDate(response: RdapDomainResponse): Date | undefined {
  const events = response.events ?? [];
  const preferredActions = ["registrar expiration", "expiration"];

  for (const action of preferredActions) {
    const event = events.find(
      (item) => item.eventAction?.toLowerCase() === action,
    );
    const date = parseDomainDate(event?.eventDate);
    if (date) return date;
  }

  return undefined;
}

function extractFnFromVcard(vcardArray: unknown): string | undefined {
  if (!Array.isArray(vcardArray) || !Array.isArray(vcardArray[1])) {
    return undefined;
  }

  for (const entry of vcardArray[1]) {
    if (!Array.isArray(entry) || entry.length < 4) continue;
    if (String(entry[0]).toLowerCase() !== "fn") continue;
    const value = entry[3];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return undefined;
}

export function extractRdapRegistrar(
  response: RdapDomainResponse,
): string | undefined {
  const queue = [...(response.entities ?? [])];

  while (queue.length > 0) {
    const entity = queue.shift();
    if (!entity) continue;

    if (entity.roles?.some((role) => role.toLowerCase() === "registrar")) {
      const fn = extractFnFromVcard(entity.vcardArray);
      if (fn) return fn;
    }

    queue.push(...(entity.entities ?? []));
  }

  return undefined;
}

export async function lookupRdap(domain: string): Promise<RdapResult> {
  const bootstrap = await getBootstrap();
  const urls = findBootstrapUrls(bootstrap, domain);

  if (urls.length === 0) {
    throw new Error(`No RDAP server found for ${domain}`);
  }

  const errors: string[] = [];
  for (const baseUrl of urls) {
    const url = rdapDomainUrl(baseUrl, domain);
    try {
      const res = await fetch(url, {
        headers: { accept: "application/rdap+json, application/json" },
      });
      if (!res.ok) {
        errors.push(`${url}: HTTP ${res.status}`);
        continue;
      }

      const raw = (await res.json()) as RdapDomainResponse;
      return {
        expiryDate: extractRdapExpiryDate(raw),
        registrar: extractRdapRegistrar(raw),
        raw,
      };
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`RDAP lookup failed for ${domain}: ${errors.join("; ")}`);
}
