import net from "node:net";

import { extractWhoisExpiryDate, parseWhoisFields } from "./dates";

export type WhoisResult = {
  expiryDate?: Date;
  registrar?: string;
  raw: string;
};

const WHOIS_TIMEOUT_MS = 15_000;

export async function queryWhois(
  server: string,
  query: string,
  timeoutMs = WHOIS_TIMEOUT_MS,
): Promise<string> {
  return await new Promise((resolve, reject) => {
    const socket = net.createConnection(43, server);
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve(Buffer.concat(chunks).toString("utf8"));
    };

    socket.setTimeout(timeoutMs, () => {
      finish(new Error(`WHOIS query timed out for ${server}`));
    });
    socket.on("error", finish);
    socket.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    socket.on("end", () => finish());
    socket.on("connect", () => {
      socket.write(`${query}\r\n`);
    });
  });
}

function extractField(raw: string, labels: string[]): string | undefined {
  const fields = parseWhoisFields(raw);

  for (const label of labels) {
    const value = fields[label.toLowerCase()]?.[0];
    if (value) return value;
  }

  return undefined;
}

function extractReferralServer(raw: string): string | undefined {
  return extractField(raw, ["refer", "whois server", "registrar whois server"]);
}

function extractRegistrar(raw: string): string | undefined {
  return extractField(raw, [
    "registrar",
    "sponsoring registrar",
    "registrar name",
    "registrar organization",
  ]);
}

export async function lookupWhois(domain: string): Promise<WhoisResult> {
  const tld = domain.split(".").at(-1);
  if (!tld) throw new Error(`Unable to determine TLD for ${domain}`);

  const ianaRaw = await queryWhois("whois.iana.org", tld);
  const firstServer = extractReferralServer(ianaRaw);
  if (!firstServer) {
    return {
      expiryDate: extractWhoisExpiryDate(ianaRaw),
      registrar: extractRegistrar(ianaRaw),
      raw: ianaRaw,
    };
  }

  const firstRaw = await queryWhois(firstServer, domain);
  const secondServer = extractReferralServer(firstRaw);
  const shouldQuerySecond =
    secondServer &&
    secondServer.toLowerCase() !== firstServer.toLowerCase() &&
    !extractWhoisExpiryDate(firstRaw);

  const raw = shouldQuerySecond
    ? `${firstRaw}\n\n${await queryWhois(secondServer, domain)}`
    : firstRaw;

  return {
    expiryDate: extractWhoisExpiryDate(raw),
    registrar: extractRegistrar(raw),
    raw,
  };
}
