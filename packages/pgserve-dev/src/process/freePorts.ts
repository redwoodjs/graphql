import { execSync } from "node:child_process";

export function freeTcpPort(port: number): void {
  try {
    execSync(`fuser -k ${port}/tcp`, { stdio: "ignore" });
  } catch {
    // Port already free.
  }
}

export function freeTcpPorts(ports: readonly number[]): void {
  for (const port of ports) {
    freeTcpPort(port);
  }
}
