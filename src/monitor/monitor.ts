import { checkDomain, isDomainLookupResult } from "../domain/lookup";
import type { DomainCheckResult, DomainLookupResult } from "../domain/lookup";
import {
  recordDomainChecked,
  recordThresholdNotice,
  shouldSendThresholdNotice,
} from "../domain/thresholds";
import { selectNotificationThreshold } from "../domain/thresholds";
import type { PersistedState } from "../state/store";
import { saveState } from "../state/store";
import { sendTelegramChunks } from "../telegram/notify";
import type { TelegramNotifier } from "../telegram/notify";
import type { AppConfig } from "../utils/config";
import { dateKey, daysUntilDate, nextRunAfter } from "../utils/dates";
import type { Logger } from "../utils/logger";
import { sleep, sleepUntil } from "../utils/sleep";
import { formatExpiryReminder, formatStartupSummary } from "./messages";

async function checkDomains(opts: {
  domains: string[];
  expiryOverrides: Record<string, Date>;
  log: Logger;
  shouldStop: () => boolean;
}): Promise<DomainCheckResult[]> {
  const results: DomainCheckResult[] = [];

  for (const domain of opts.domains) {
    if (opts.shouldStop()) break;

    opts.log.info("Checking domain.", { domain });
    const result = await checkDomain(domain, opts.expiryOverrides);
    results.push(result);

    if (isDomainLookupResult(result)) {
      opts.log.info("Checked domain.", {
        domain,
        registrar: result.registrar,
        expiryDate: dateKey(result.expiryDate),
        source: result.source,
      });
    } else {
      opts.log.warn("Failed to check domain.", {
        domain,
        error: result.error,
      });
    }

    await sleep(250);
  }

  return results;
}

async function processExpiryReminder(opts: {
  result: DomainLookupResult;
  config: AppConfig;
  state: PersistedState;
  statePath: string;
  telegram: TelegramNotifier;
  log: Logger;
  now: Date;
}): Promise<void> {
  const expiryDate = dateKey(opts.result.expiryDate);
  const daysRemaining = daysUntilDate(opts.result.expiryDate, opts.now);
  const threshold = selectNotificationThreshold(
    daysRemaining,
    opts.config.notifyThresholdDays,
  );

  recordDomainChecked({
    state: opts.state,
    domain: opts.result.domain,
    expiryDate,
    registrar: opts.result.registrar,
    checkedAt: opts.now,
  });

  if (threshold === undefined) return;
  if (
    !shouldSendThresholdNotice({
      state: opts.state,
      domain: opts.result.domain,
      expiryDate,
      threshold,
    })
  ) {
    opts.log.debug("Threshold notice already sent.", {
      domain: opts.result.domain,
      expiryDate,
      threshold,
    });
    return;
  }

  await opts.telegram.sendMessage(
    formatExpiryReminder({
      result: opts.result,
      threshold,
      daysRemaining,
      checkedAt: opts.now,
    }),
    { parseMode: "HTML", disablePreview: true },
  );

  recordThresholdNotice({
    state: opts.state,
    domain: opts.result.domain,
    expiryDate,
    threshold,
    registrar: opts.result.registrar,
    checkedAt: opts.now,
  });
  await saveState(opts.statePath, opts.state);

  opts.log.info("Sent expiry reminder.", {
    domain: opts.result.domain,
    expiryDate,
    daysRemaining,
    threshold,
  });
}

async function processDailyResults(opts: {
  results: DomainCheckResult[];
  config: AppConfig;
  state: PersistedState;
  statePath: string;
  telegram: TelegramNotifier;
  log: Logger;
  now: Date;
}): Promise<void> {
  let changed = false;

  for (const result of opts.results) {
    if (!isDomainLookupResult(result)) continue;

    const before = JSON.stringify(opts.state.domains[result.domain]);
    await processExpiryReminder({ ...opts, result });
    const after = JSON.stringify(opts.state.domains[result.domain]);
    if (before !== after) changed = true;
  }

  if (changed) {
    await saveState(opts.statePath, opts.state);
  }
}

export async function runDomainReminder(opts: {
  config: AppConfig;
  state: PersistedState;
  statePath: string;
  telegram: TelegramNotifier;
  log: Logger;
  shouldStop: () => boolean;
}): Promise<void> {
  const { config, telegram, log, shouldStop } = opts;

  log.info("Starting Domain Reminder.", {
    domains: config.domains.length,
    checkTime: config.checkTime.value,
    thresholds: config.notifyThresholdDays,
  });

  const startupNow = new Date();
  const startupResults = await checkDomains({
    domains: config.domains,
    expiryOverrides: config.expiryOverrides,
    log,
    shouldStop,
  });
  const firstNextRun = nextRunAfter(new Date(), config.checkTime);

  await sendTelegramChunks(
    telegram,
    formatStartupSummary({
      results: startupResults,
      nextRun: firstNextRun,
      checkTime: config.checkTime,
      thresholds: config.notifyThresholdDays,
      now: startupNow,
    }),
  );
  log.info("Sent startup summary to Telegram.");

  let nextRun = firstNextRun;
  while (!shouldStop()) {
    log.info("Waiting for next scheduled check.", {
      nextRun: nextRun.toISOString(),
    });

    await sleepUntil(nextRun, shouldStop);
    if (shouldStop()) break;

    const now = new Date();
    log.info("Starting scheduled domain check.", {
      startedAt: now.toISOString(),
      domains: config.domains.length,
    });

    const results = await checkDomains({
      domains: config.domains,
      expiryOverrides: config.expiryOverrides,
      log,
      shouldStop,
    });
    await processDailyResults({
      results,
      config,
      state: opts.state,
      statePath: opts.statePath,
      telegram,
      log,
      now,
    });

    log.info("Scheduled domain check complete.", {
      ok: results.filter(isDomainLookupResult).length,
      errors: results.filter((result) => !isDomainLookupResult(result)).length,
    });

    nextRun = nextRunAfter(new Date(), config.checkTime);
  }

  log.info("Domain Reminder stopped.");
}
