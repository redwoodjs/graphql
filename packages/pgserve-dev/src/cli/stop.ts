import { loadResolvedConfigFromArgv } from "../config/loadConfig.ts";
import { stopLocalDevPgserve } from "../local-dev/index.ts";

async function main() {
  const { config, args } = await loadResolvedConfigFromArgv();
  await stopLocalDevPgserve(config, args);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
