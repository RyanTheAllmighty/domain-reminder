import "dotenv/config";

import { join } from "node:path";

import { runDomainReminder } from "./monitor/monitor";
import { loadState } from "./state/store";
import { createTelegramNotifierFromEnv } from "./telegram/notify";
import { parseConfigFromEnv } from "./utils/config";
import { createLogger } from "./utils/logger";

async function main() {
  const config = parseConfigFromEnv(process.env);
  const log = createLogger(config.logLevel);
  const statePath = join(config.dataDir, "state.json");
  const state = await loadState(statePath);
  const telegram = createTelegramNotifierFromEnv(process.env);

  let stopping = false;
  const stop = () => {
    stopping = true;
    log.info("Received shutdown signal. Exiting after current check.");
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  await runDomainReminder({
    config,
    state,
    statePath,
    telegram,
    log,
    shouldStop: () => stopping,
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
