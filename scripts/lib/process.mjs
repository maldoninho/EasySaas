import { spawn, spawnSync } from "node:child_process";

export function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "sh";
  const args = process.platform === "win32" ? [command] : ["-lc", `command -v ${command}`];
  const result = spawnSync(checker, args, { stdio: "ignore" });
  return result.status === 0;
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    const detail = options.capture ? `
${result.stdout ?? ""}${result.stderr ?? ""}` : "";
    throw new Error(`Comando falhou (${result.status}): ${command} ${args.join(" ")}${detail}`);
  }
  return result;
}

export function spawnLongRunning(command, args, options = {}) {
  return spawn(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: "inherit",
    shell: false,
  });
}
