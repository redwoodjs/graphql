import { freeTcpPorts } from "../process/freePorts.ts";

import { loadResolvedConfigFromArgv } from "../config/loadConfig.ts";
import { startLocalDevPgserve } from "../local-dev/index.ts";

async function main() {
  const { config, args } = await loadResolvedConfigFromArgv();

  if (config.devPorts?.length) {
    freeTcpPorts(config.devPorts);
  }

  await startLocalDevPgserve(config, args, {
    detach: true,
    emitReadyMarker: true,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
