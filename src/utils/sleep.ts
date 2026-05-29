export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sleepUntil(
  target: Date,
  shouldStop: () => boolean,
): Promise<void> {
  while (!shouldStop()) {
    const remainingMs = target.getTime() - Date.now();
    if (remainingMs <= 0) return;
    await sleep(Math.min(remainingMs, 30_000));
  }
}
