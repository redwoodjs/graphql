import { loadResolvedConfigFromArgv } from "../config/loadConfig.ts";
import { stopLocalDevPgserve } from "../local-dev/index.ts";

async function main() {
  const { config, args } = await loadResolvedConfigFromArgv();

  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    try {
      await stopLocalDevPgserve(config, args, { quiet: true });
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };

  const onSignal = () => {
    void shutdown();
  };

  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  await new Promise<void>(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
