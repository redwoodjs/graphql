import fs from "node:fs";
import path from "node:path";

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPostmasterPid(dataDir: string): number | null {
  const pidPath = path.join(dataDir, "postmaster.pid");
  if (!fs.existsSync(pidPath)) {
    return null;
  }

  const pid = Number.parseInt(fs.readFileSync(pidPath, "utf8").split("\n")[0] ?? "", 10);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

export function hasLivePostmaster(dataDir: string): boolean {
  const pid = readPostmasterPid(dataDir);
  return pid !== null && isProcessRunning(pid);
}

async function waitUntil(predicate: () => boolean, timeoutMs = 5000): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return predicate();
}

async function waitForProcessExit(pid: number, timeoutMs = 5000): Promise<boolean> {
  return waitUntil(() => !isProcessRunning(pid), timeoutMs);
}

async function waitForPostmasterExit(dataDir: string, timeoutMs = 5000): Promise<boolean> {
  return waitUntil(() => !hasLivePostmaster(dataDir), timeoutMs);
}

function killProcess(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(pid, signal);
  } catch {
    // Process already exited.
  }
}

function killProcessGroup(pid: number, signal: NodeJS.Signals): void {
  if (process.platform === "win32") {
    killProcess(pid, signal);
    return;
  }

  try {
    process.kill(-pid, signal);
  } catch {
    killProcess(pid, signal);
  }
}

export async function stopDetachedPgserveWrapper(wrapperPid: number | undefined): Promise<void> {
  if (wrapperPid === undefined || !isProcessRunning(wrapperPid)) {
    return;
  }

  killProcessGroup(wrapperPid, "SIGTERM");
  if (await waitForProcessExit(wrapperPid)) {
    return;
  }

  killProcessGroup(wrapperPid, "SIGKILL");
  await waitForProcessExit(wrapperPid);
}

export async function stopLivePostmaster(
  dataDir: string,
  options: { quiet?: boolean } = {},
): Promise<void> {
  const pid = readPostmasterPid(dataDir);
  if (pid === null || !isProcessRunning(pid)) {
    return;
  }

  if (!options.quiet) {
    console.warn(
      `Found an existing pgserve PostgreSQL process (${pid}) for ${dataDir} without reusable connection metadata; stopping it before starting a fresh pgserve.`,
    );
  }

  killProcess(pid, "SIGTERM");
  if (await waitForPostmasterExit(dataDir)) {
    return;
  }

  killProcess(pid, "SIGKILL");
  if (!(await waitForPostmasterExit(dataDir))) {
    throw new Error(
      `Timed out stopping existing pgserve PostgreSQL process (${pid}) for ${dataDir}`,
    );
  }
}

export function removeIncompletePgserveDataDir(dataDir: string): void {
  if (!fs.existsSync(dataDir) || fs.existsSync(path.join(dataDir, "PG_VERSION"))) {
    return;
  }

  const entries = fs.readdirSync(dataDir);
  if (entries.length === 0 || hasLivePostmaster(dataDir)) {
    return;
  }

  console.warn(`Removing incomplete pgserve data directory without PG_VERSION: ${dataDir}`);
  fs.rmSync(dataDir, { recursive: true, force: true });
}
