import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type DomainState = {
  expiryDate?: string;
  sentThresholds?: number[];
  registrar?: string;
  lastCheckedAt?: string;
};

export type PersistedState = {
  domains: Record<string, DomainState>;
};

function emptyState(): PersistedState {
  return { domains: {} };
}

export async function loadState(path: string): Promise<PersistedState> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (
      parsed &&
      typeof parsed === "object" &&
      "domains" in parsed &&
      typeof (parsed as { domains?: unknown }).domains === "object" &&
      (parsed as { domains?: unknown }).domains !== null
    ) {
      return parsed as PersistedState;
    }

    return emptyState();
  } catch (err) {
    const anyErr = err as NodeJS.ErrnoException;
    if (anyErr?.code === "ENOENT") return emptyState();
    return emptyState();
  }
}

export async function saveState(
  path: string,
  state: PersistedState,
): Promise<void> {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });

  const tmp = `${path}.tmp`;
  const body = JSON.stringify(state, null, 2);
  await writeFile(tmp, body, "utf8");
  await rename(tmp, path);
}
