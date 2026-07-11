import { spawn, type ChildProcess } from "node:child_process";

function spawnDevProcess(command: string, args: string[]): ChildProcess {
  return spawn(command, args, {
    env: process.env,
    stdio: "inherit",
  });
}

const codegen = spawnDevProcess("graphql-codegen", ["--config", "codegen.ts", "--watch"]);
const nitro = spawnDevProcess("nitro", ["dev"]);

let shuttingDown = false;

const shutdown = (exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  // SIGKILL avoids graphql-codegen running one last "Parse Configuration" pass on SIGINT.
  codegen.kill("SIGKILL");
  nitro.kill("SIGTERM");
  process.exit(exitCode);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

for (const child of [codegen, nitro]) {
  child.on("error", (error) => {
    console.error(error);
    shutdown(1);
  });
}

nitro.on("exit", (code, signal) => {
  if (shuttingDown) {
    return;
  }

  codegen.kill("SIGKILL");

  if (signal) {
    process.exit(0);
    return;
  }

  process.exit(code ?? 0);
});

codegen.on("exit", (code, signal) => {
  if (shuttingDown) {
    return;
  }

  if (signal) {
    return;
  }

  if (code && code !== 0) {
    nitro.kill("SIGTERM");
    process.exit(code);
  }
});
