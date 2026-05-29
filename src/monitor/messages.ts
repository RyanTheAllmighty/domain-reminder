import { dateKey, daysUntilDate, formatDaysRemaining, formatLocalDateTime } from "../utils/dates";
import type { CheckTime } from "../utils/config";
import { escapeTelegramHtml } from "../telegram/notify";
import type { DomainCheckResult, DomainLookupResult } from "../domain/lookup";
import { isDomainLookupResult } from "../domain/lookup";

export function formatDomainStatusLine(
  result: DomainCheckResult,
  now: Date,
): string {
  if (!isDomainLookupResult(result)) {
    const label =
      result.kind === "expiry-unavailable" ? "EXPIRY UNAVAILABLE" : "ERROR";
    const parts = [
      `- <code>${escapeTelegramHtml(result.domain)}</code>`,
      `<b>${label}</b> <code>${escapeTelegramHtml(result.error)}</code>`,
    ];

    if (result.registrar) {
      parts.push(`<b>Registrar:</b> ${escapeTelegramHtml(result.registrar)}`);
    }
    if (result.source) {
      parts.push(`<b>Source:</b> <code>${result.source}</code>`);
    }

    return parts.join(" - ");
  }

  const daysRemaining = daysUntilDate(result.expiryDate, now);
  return [
    `- <code>${escapeTelegramHtml(result.domain)}</code>`,
    escapeTelegramHtml(formatDaysRemaining(daysRemaining)),
    `<b>Expiry:</b> <code>${escapeTelegramHtml(dateKey(result.expiryDate))}</code>`,
    `<b>Registrar:</b> ${escapeTelegramHtml(result.registrar)}`,
    `<b>Source:</b> <code>${result.source}</code>`,
  ].join(" - ");
}

export function formatStartupSummary(opts: {
  results: DomainCheckResult[];
  nextRun: Date;
  checkTime: CheckTime;
  thresholds: number[];
  now: Date;
}): string {
  const lines: string[] = [];
  const okCount = opts.results.filter(isDomainLookupResult).length;
  const errorCount = opts.results.length - okCount;
  const sortedResults = [...opts.results].sort((a, b) => {
    const aTime = isDomainLookupResult(a)
      ? a.expiryDate.getTime()
      : Number.POSITIVE_INFINITY;
    const bTime = isDomainLookupResult(b)
      ? b.expiryDate.getTime()
      : Number.POSITIVE_INFINITY;

    if (aTime !== bTime) return aTime - bTime;
    return a.domain.localeCompare(b.domain);
  });

  lines.push("<b>Domain Reminder</b>");
  lines.push("<i>Started successfully</i>");
  lines.push("");
  lines.push(`<b>Domains:</b> <code>${opts.results.length}</code>`);
  lines.push(`<b>OK:</b> <code>${okCount}</code>   <b>Errors:</b> <code>${errorCount}</code>`);
  lines.push(
    `<b>Daily check:</b> <code>${escapeTelegramHtml(opts.checkTime.value)}</code>`,
  );
  lines.push(
    `<b>Next check:</b> <code>${escapeTelegramHtml(formatLocalDateTime(opts.nextRun))}</code>`,
  );
  lines.push(
    `<b>Thresholds:</b> <code>${escapeTelegramHtml(opts.thresholds.join(", "))} days</code>`,
  );
  lines.push("");
  lines.push("<b>Current domain status</b>");
  lines.push(
    ...sortedResults.map((result) => formatDomainStatusLine(result, opts.now)),
  );

  return lines.join("\n");
}

export function formatExpiryReminder(opts: {
  result: DomainLookupResult;
  threshold: number;
  daysRemaining: number;
  checkedAt: Date;
}): string {
  const lines: string[] = [];

  lines.push("<b>Domain Expiry Reminder</b>");
  lines.push(
    `<b>Domain:</b> <code>${escapeTelegramHtml(opts.result.domain)}</code>`,
  );
  lines.push(
    `<b>Status:</b> ${escapeTelegramHtml(
      `expires in less than ${opts.threshold} days`,
    )}`,
  );
  lines.push(
    `<b>Days remaining:</b> <code>${escapeTelegramHtml(
      String(opts.daysRemaining),
    )}</code>`,
  );
  lines.push(
    `<b>Expiry date:</b> <code>${escapeTelegramHtml(
      dateKey(opts.result.expiryDate),
    )}</code>`,
  );
  lines.push(`<b>Registrar:</b> ${escapeTelegramHtml(opts.result.registrar)}`);
  lines.push(`<b>Source:</b> <code>${opts.result.source}</code>`);
  lines.push(
    `<b>Checked:</b> <code>${escapeTelegramHtml(
      formatLocalDateTime(opts.checkedAt),
    )}</code>`,
  );

  return lines.join("\n");
}
