import type { PersistedState } from "../state/store";

export function selectNotificationThreshold(
  daysRemaining: number,
  thresholds: number[],
): number | undefined {
  if (daysRemaining < 0) return undefined;

  const ascending = [...thresholds].sort((a, b) => a - b);
  return ascending.find((threshold) => daysRemaining <= threshold);
}

export function shouldSendThresholdNotice(opts: {
  state: PersistedState;
  domain: string;
  expiryDate: string;
  threshold: number;
}): boolean {
  const current = opts.state.domains[opts.domain];
  if (!current || current.expiryDate !== opts.expiryDate) return true;
  return !(current.sentThresholds ?? []).includes(opts.threshold);
}

export function recordThresholdNotice(opts: {
  state: PersistedState;
  domain: string;
  expiryDate: string;
  threshold: number;
  registrar: string;
  checkedAt: Date;
}): void {
  const current = opts.state.domains[opts.domain];
  const sentThresholds =
    current?.expiryDate === opts.expiryDate ? [...(current.sentThresholds ?? [])] : [];

  if (!sentThresholds.includes(opts.threshold)) {
    sentThresholds.push(opts.threshold);
  }

  opts.state.domains[opts.domain] = {
    expiryDate: opts.expiryDate,
    sentThresholds: sentThresholds.sort((a, b) => b - a),
    registrar: opts.registrar,
    lastCheckedAt: opts.checkedAt.toISOString(),
  };
}

export function recordDomainChecked(opts: {
  state: PersistedState;
  domain: string;
  expiryDate?: string;
  registrar?: string;
  checkedAt: Date;
}): void {
  const current = opts.state.domains[opts.domain];
  const sentThresholds =
    current?.expiryDate && current.expiryDate === opts.expiryDate
      ? current.sentThresholds
      : [];

  opts.state.domains[opts.domain] = {
    expiryDate: opts.expiryDate,
    sentThresholds,
    registrar: opts.registrar,
    lastCheckedAt: opts.checkedAt.toISOString(),
  };
}
