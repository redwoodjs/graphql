import { loadResolvedConfigFromArgv } from "../config/loadConfig.ts";
import { setupAppEnvFallback } from "../env/syncAppEnv.ts";

async function main() {
  const { config } = await loadResolvedConfigFromArgv();
  setupAppEnvFallback(config);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
